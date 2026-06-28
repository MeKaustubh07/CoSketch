/**
 * index.ts — CoSketch standalone WebSocket server.
 *
 * Handles: upgrade auth (HMAC ticket), room join/leave, op broadcast (LWW),
 * presence, heartbeat, debounced persistence.
 *
 * Run: `npm run dev` (tsx watch) or `npm start` (tsx).
 */

import "./env.js"; // MUST be first — loads ../.env before other modules read env
import { createServer, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { verifyTicket } from "./ticket.js";
import {
  getOrCreateRoom,
  joinRoom,
  leaveRoom,
  getSnapshot,
  getOthersPresence,
  applyOp,
  updatePresence,
  broadcast,
  flushAll,
  roomCount,
  type Member,
} from "./rooms.js";
import type {
  ServerMessage,
  ClientMessage,
  InitMessage,
  OpBroadcast,
  AckMessage,
  PeerJoinMessage,
  PeerLeaveMessage,
  PresenceBroadcast,
  PresenceData,
} from "./protocol.js";
import { WS_CLOSE_BAD_TICKET, WS_CLOSE_ROOM_NOT_FOUND } from "./protocol.js";
import { disconnect } from "./persistence.js";

// ─── Config ───────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.WS_PORT || "8080", 10);
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_MESSAGE_SIZE = 512 * 1024; // 512 KB
const OP_RATE_LIMIT = 60; // max ops per second per socket
const PRESENCE_THROTTLE_MS = 50;

// ─── Deterministic user color ─────────────────────────────────────────────

const COLORS = [
  "#e57373", "#f06292", "#ba68c8", "#9575cd",
  "#7986cb", "#64b5f6", "#4fc3f7", "#4dd0e1",
  "#4db6ac", "#81c784", "#aed581", "#dce775",
  "#ffd54f", "#ffb74d", "#ff8a65",
];

function userColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ─── Server setup ─────────────────────────────────────────────────────────

const httpServer = createServer((_req, res) => {
  // Health check endpoint
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", rooms: roomCount() }));
});

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: MAX_MESSAGE_SIZE,
});

// ─── Rate limiter per socket ──────────────────────────────────────────────

interface RateLimiter {
  tokens: number;
  lastRefill: number;
}

function checkRateLimit(limiter: RateLimiter): boolean {
  const now = Date.now();
  const elapsed = (now - limiter.lastRefill) / 1000;
  limiter.tokens = Math.min(OP_RATE_LIMIT, limiter.tokens + elapsed * OP_RATE_LIMIT);
  limiter.lastRefill = now;
  if (limiter.tokens < 1) return false;
  limiter.tokens--;
  return true;
}

// ─── Upgrade handler ──────────────────────────────────────────────────────

httpServer.on("upgrade", async (req: IncomingMessage, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const roomId = url.searchParams.get("room");
  const ticket = url.searchParams.get("ticket");

  if (!roomId || !ticket) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  if (!verifyTicket(ticket, roomId)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  // Load room (lazy — from DB on first join). A DB hiccup must not crash the
  // whole server — reject this upgrade and let the client retry.
  let room;
  try {
    room = await getOrCreateRoom(roomId);
  } catch (err) {
    console.error("[ws] getOrCreateRoom failed:", err instanceof Error ? err.message : err);
    socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
    socket.destroy();
    return;
  }
  if (!room) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  const rawName = url.searchParams.get("name") || "";
  const name = rawName.trim().slice(0, 32) || "Guest";

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, room, name);
  });
});

// ─── Connection handler ───────────────────────────────────────────────────

wss.on("connection", (ws: WebSocket, _req: IncomingMessage, room: any, name: string = "Guest") => {
  const actorId = `actor-${nanoid(8)}`;
  const color = userColor(name);

  const presence: PresenceData = { cursor: null, name, color };
  const member: Member = { ws, actorId, presence };
  const rateLimiter: RateLimiter = { tokens: OP_RATE_LIMIT, lastRefill: Date.now() };
  let lastPresenceSend = 0;

  // Join
  joinRoom(room, member);

  // Send init to the new member
  const snapshot = getSnapshot(room);
  const initMsg: InitMessage = {
    type: "init",
    elements: snapshot.elements,
    elementOrder: snapshot.elementOrder,
    you: { actorId, name, color },
    others: getOthersPresence(room, ws),
    seq: snapshot.seq,
  };
  ws.send(JSON.stringify(initMsg));

  // Broadcast peer-join to others
  const joinMsg: PeerJoinMessage = {
    type: "peer-join",
    actorId,
    presence,
  };
  broadcast(room, JSON.stringify(joinMsg), ws);

  console.log(`[ws] ${actorId} joined room ${room.id} (${room.members.size} members)`);

  // ─── Message handler ────────────────────────────────────────────────────

  ws.on("message", (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString()) as ClientMessage;
    } catch {
      return; // Malformed — ignore
    }

    switch (msg.type) {
      case "op": {
        if (!checkRateLimit(rateLimiter)) return; // Drop silently

        const op = msg.op;
        const seq = applyOp(room, op, actorId);

        if (seq !== null) {
          // Ack the sender
          const ackMsg: AckMessage = { type: "ack", opId: op.opId, seq };
          ws.send(JSON.stringify(ackMsg));

          // Broadcast to others
          const opBroadcast: OpBroadcast = {
            type: "op",
            op,
            seq,
            actorId,
          };
          broadcast(room, JSON.stringify(opBroadcast), ws);
        }
        break;
      }

      case "presence": {
        const now = Date.now();
        if (now - lastPresenceSend < PRESENCE_THROTTLE_MS) return;
        lastPresenceSend = now;

        // Only the cursor comes from the client; name/color stay as set at join
        // so a presence update can't blank out the display name.
        const merged: PresenceData = {
          ...member.presence,
          cursor: msg.presence?.cursor ?? null,
        };
        updatePresence(room, ws, merged);

        const presenceMsg: PresenceBroadcast = {
          type: "presence",
          actorId,
          presence: merged,
        };
        broadcast(room, JSON.stringify(presenceMsg), ws);
        break;
      }

      case "ping": {
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      }
    }
  });

  // ─── Close handler ──────────────────────────────────────────────────────

  ws.on("close", async () => {
    console.log(`[ws] ${actorId} left room ${room.id}`);

    const leaveMsg: PeerLeaveMessage = { type: "peer-leave", actorId };
    broadcast(room, JSON.stringify(leaveMsg), ws);

    await leaveRoom(room, ws);
  });

  ws.on("error", (err) => {
    console.error(`[ws] error from ${actorId}:`, err.message);
  });
});

// ─── Heartbeat ────────────────────────────────────────────────────────────

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if ((ws as any).__alive === false) {
      ws.terminate();
      return;
    }
    (ws as any).__alive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on("connection", (ws) => {
  (ws as any).__alive = true;
  ws.on("pong", () => {
    (ws as any).__alive = true;
  });
});

// ─── Graceful shutdown ────────────────────────────────────────────────────

async function shutdown() {
  console.log("[ws] shutting down...");
  clearInterval(heartbeat);

  // Close all connections
  wss.clients.forEach((ws) => ws.close(1001, "Server shutting down"));

  // Flush all dirty rooms to DB
  await flushAll();
  await disconnect();

  httpServer.close();
  console.log("[ws] shutdown complete");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Safety net — never let a stray async error take the whole server down.
process.on("unhandledRejection", (reason) => {
  console.error("[ws] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[ws] uncaughtException:", err);
});

// ─── Start ────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[ws] CoSketch WS server listening on port ${PORT}`);
});
