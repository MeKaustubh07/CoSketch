# CoSketch — Custom WebSocket Implementation Plan

Replacing Liveblocks with an in-house, end-to-end WebSocket real-time layer.
**Goal: ownership / learning.**

---

## 0. Core architectural decision

Next.js route handlers are serverless / short-lived — they **cannot hold a persistent
WebSocket**. So we need a **standalone long-running Node WS server**, deployed separately
from the Next app.

```
┌────────────┐   https    ┌──────────────────┐
│  browser   │──────────► │  Vercel (UI+API) │   ← stays serverless
│            │            └──────────────────┘
│            │   wss      ┌──────────────────┐
│            │──────────► │  WS server (Node)│   ← new, persistent host
└────────────┘            │  ws + in-mem rooms│      (Render/Railway/Fly/VPS)
                          └─────────┬────────┘
                                    │ Prisma
                              ┌─────▼─────┐
                              │ Postgres  │  (scene persistence)
                              └───────────┘
```

**Model: authoritative server.** The server is the single serialization point — it
receives ops, applies them in arrival order (Last-Write-Wins), and rebroadcasts. Because
every client applies ops in the server's order, all clients converge **without a full
CRDT**. This is the key simplification.

**Library:** raw [`ws`](https://github.com/websockets/ws) (own everything — heartbeat,
rooms, reconnect, acks). `socket.io` is the lower-effort alternative (rooms/acks/reconnect
built in) but the goal here is to own the logic.

---

## 1. Wire protocol

JSON messages, both directions:

| Type | Dir | Payload |
|------|-----|---------|
| `init` | S→C | full snapshot `{elements, you:{id}, others:Presence[]}` on join |
| `op` | C↔S | `{id, op:"upsert"\|"delete", element?\|elementId, baseVersion, actorId}` |
| `ack` | S→C | `{opId, seq}` — confirms + assigns global `seq` |
| `presence` | C↔S | `{cursor:{x,y}\|null, name, color}` (ephemeral) |
| `peer-join` / `peer-leave` | S→C | presence add/remove |
| `ping` / `pong` | C↔S | heartbeat (detect dead sockets) |

**Conflict handling (LWW, server-ordered):**
- Each element keeps `version` (already in `lib/types.ts`) + `updatedBy`.
- Server applies `upsert` if `incoming.version >= stored.version` (tiebreak by actorId);
  stamps a monotonic `seq`; rebroadcasts. Clients apply in `seq` order → convergence.
- **Z-order:** drop the `elementOrder` array (CRDT headache under concurrent reorders).
  Give each element a **fractional index** string (`fracIndex`) and sort by it. Reorder =
  compute a key between neighbors (LexoRank / `fractional-indexing`). Concurrent reorders
  still converge by sort.

---

## 2. Persistence

Add to `prisma/schema.prisma`:

```prisma
model Board {
  id           String   @id
  name         String   @default("Untitled")
  joinPassword String
  scene        Json     @default("{\"elements\":[]}")  // NEW
  updatedAt    DateTime @updatedAt
}
```

- WS server: on **first** client joining a room → load `scene` from DB into memory
  (source of truth while live). On each applied op → mark dirty; **debounced save**
  (~3s after last change) + flush-on-empty when the last client leaves, then evict.
- On server restart, rooms rehydrate from DB lazily on join.
- (Scale-up later: per-element `Element` table instead of a JSON blob.)

---

## 3. Auth on the WS handshake (cross-origin gotcha)

The httpOnly `cosketch_room_<id>` cookie is set on the **Next** domain — it will **not**
be sent to a different-origin WS server. Solution mirrors the current Liveblocks auth:

1. New Next route `GET /api/ws-ticket?room=<id>` — verifies the existing room cookie
   (`lib/roomToken.ts`), returns a **short-lived signed ticket** (HMAC, ~60s TTL,
   room-scoped) using a secret shared with the WS server.
2. Client opens `wss://wsserver/?room=<id>&ticket=<jwt>`.
3. WS server verifies the ticket on `upgrade` (same HMAC). Reject → close code `4401`.

Reuses the existing `roomToken` HMAC pattern. `lib/password.ts` + the gate flow are
unchanged.

---

## 4. WS server (new `server/` package)

```
server/
  index.ts        # http + WebSocketServer, upgrade auth, heartbeat
  rooms.ts        # Room registry: members, in-mem elements Map, dirty flag
  protocol.ts     # message types (shared with client)
  persistence.ts  # load / debounced-save via Prisma
  ticket.ts       # verify HMAC ticket (shares secret with Next)
```

Responsibilities:
- `upgrade`: parse `room`+`ticket`, verify, attach `roomId`+`actorId`, join room.
- On join: send `init`; broadcast `peer-join`.
- On `op`: validate shape + size + rate-limit → apply LWW → persist(dirty) → `ack`
  sender → broadcast to others.
- On `presence`: store ephemeral → broadcast (throttled).
- Heartbeat: ping ~30s; terminate sockets that miss pong.
- On close: broadcast `peer-leave`; if room empty → final save + evict.
- **Security:** whitelist element fields, cap element count & payload size, per-socket op
  rate limit, reject ops for elements outside the room.

---

## 5. Client integration (replaces Liveblocks in the canvas)

The current architecture already separates **render** (rAF loop + override-ref) from
**shared state**, so the swap is contained.

Add `lib/realtime/`:
- `socket.ts` — connection manager: fetch ticket → open wss, exponential-backoff
  **reconnect**, **outbox** of unacked ops (resend on reconnect), opId dedupe, ping/pong.
- `store.ts` — external store of `elements: Map` + `others: Presence[]`, exposed via
  **`useSyncExternalStore`** (no new dep). WS `init`/`op`/presence messages mutate it.

In `components/canvas/CanvasStage.tsx`:
- Replace `useStorage(shapes/order)` → read from the store. Keep the **override-ref +
  throttled flush**; "flush" now **sends WS ops** instead of `useMutation`.
- Replace `useMutation` (`addElement`/`patch`/`remove`/`reorder`) → `store.applyLocal(op)`
  (optimistic) + `socket.send(op)`.
- Replace `useHistory` undo/redo → local **inverse-op stack** (per-user).
- Replace presence hooks → `socket.sendPresence(...)` + read `others` from the store.

Replace `components/collab/RoomProviderWrapper.tsx` with a `RealtimeProvider` owning the
socket lifecycle + the `BoardLoader` state. On `4401` (bad/expired ticket) → clear the
session flag + re-show the gate (same as today's 403 path).

---

## 6. Files removed

- `@liveblocks/*` deps, `liveblocks.config.ts`, `app/api/liveblocks-auth/route.ts`,
  `LIVEBLOCKS_SECRET_KEY`.
- `useStorage`/`useMutation`/`useHistory` usage in `CanvasStage`.

---

## 7. Deployment & env

- **WS server:** persistent host (Render / Railway / Fly.io / VPS). **Not Vercel.**
  Needs TLS — `wss://` is mandatory from an HTTPS page (host-provided or via
  nginx/Cloudflare).
- New env:
  - WS server: `DATABASE_URL`, `WS_TICKET_SECRET`.
  - Next app: `NEXT_PUBLIC_WS_URL=wss://...`, same `WS_TICKET_SECRET`.
- **Scaling past one instance:** in-memory rooms don't share across processes. Add
  **Redis pub/sub** to fan out ops + sticky routing by room. (Out of scope for MVP.)

---

## 8. Phased build order

1. Prisma `scene` field + migration.
2. WS server skeleton: upgrade + ticket auth + heartbeat + room join/leave.
3. `/api/ws-ticket` route (reuse `roomToken`).
4. Persistence: load-on-join + debounced save + evict-on-empty.
5. Op protocol: upsert/delete, LWW + `seq`, fractional z-index, server validation.
6. Client `socket.ts` + `store.ts` (reconnect + outbox + acks).
7. Swap `CanvasStage` reads/writes to the store/socket; keep override-ref render.
8. Presence (cursors/avatars).
9. Undo/redo via inverse-op stack.
10. Rip out Liveblocks; deploy WS server; multi-client + reconnect + persistence testing.

---

## 9. Trade-offs vs. keeping Liveblocks

Re-implementing: reconnection, op ordering/acks, presence, persistence, conflict
semantics, scaling, TLS/ops — all free with Liveblocks. The LWW + authoritative-server
model is correct and far simpler than CRDTs, but **offline editing and fine-grained
concurrent merges are weaker**. Worth it for ownership/learning or removing the vendor;
not purely for features.

**Rough effort:** ~1–2 focused weeks for a solid MVP (server + client store + integration
+ deploy), excluding multi-instance scaling.
