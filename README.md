<div align="center">

# ✏️ CoSketch

**A real-time collaborative whiteboard with a hand-drawn feel — an Excalidraw-style clone.**

Sketch shapes, arrows, freehand and text on an infinite canvas, then share a private,
password-protected room and draw together live with cursors and presence.

Next.js 16 · React 19 · Liveblocks · rough.js · Prisma · Tailwind CSS 4

</div>

---

## ✨ Features

- **Infinite canvas** with pan, zoom (wheel / ⌘-scroll), and a dot grid.
- **Hand-drawn rendering** via [rough.js](https://roughjs.com) — rectangles, diamonds, ellipses, arrows, lines, freehand draw, and text.
- **Full editing** — select, multi-select (rubber-band), move, resize (with font scaling for text), rotate, duplicate, delete, and layer ordering.
- **Excalidraw-style style panel** — stroke/background colors, fill style, stroke width & style, sloppiness, edges, opacity, font family & size, arrowheads.
- **Real-time collaboration** — shared canvas, live cursors with names, and an avatar stack, powered by [Liveblocks](https://liveblocks.io).
- **Auto-persistence** — canvas content lives in Liveblocks Storage, so a refresh keeps everything (no manual save).
- **Private rooms** — each room has a password; access is enforced server-side with an httpOnly, signed cookie (a share link alone can't bypass it).
- **Undo / redo**, **keyboard shortcuts**, and **PNG export**.
- **No sign-up** — pick a display name per session and go.

## 🧱 Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Realtime / sync | Liveblocks (`@liveblocks/react`, `@liveblocks/node`) |
| Canvas rendering | rough.js + HTML Canvas 2D |
| Database | PostgreSQL via Prisma (room metadata only) |
| Language | TypeScript |

## 🏗️ Architecture

**Local-first canvas, synced through Liveblocks.**

- The drawing engine ([`lib/scene.ts`](lib/scene.ts), [`lib/rough-renderer.ts`](lib/rough-renderer.ts)) is pure and framework-agnostic: element creation, hit-testing, resize/rotate math, and a cached rough.js renderer drawn on a `requestAnimationFrame` loop. Shapes are drawn in local coordinates and positioned with `ctx.translate`, so **moving an element never regenerates its rough path**.
- [`CanvasStage.tsx`](components/canvas/CanvasStage.tsx) keeps per-user UI state (tool, viewport, selection) in local React state, while **shared scene state lives in Liveblocks Storage** (`shapes: LiveMap`, `elementOrder: LiveList`). Reads use `useStorage`; writes use `useMutation`; undo/redo uses the room history.
- During a drag, edits are applied to an in-memory **override map** (instant local render) and flushed to Storage on a throttle, so collaborators see smooth updates without per-frame network spam.
- **Presence** (`useUpdateMyPresence` / `useOthers`) broadcasts each user's cursor (in canvas coordinates) and name for live cursors and avatars.

### Real-time / WebSockets

There is **no hand-written WebSocket code**. Liveblocks manages the socket connection, CRDT conflict resolution, presence, and reconnection. The app only declares the data schema ([`liveblocks.config.ts`](liveblocks.config.ts)), wires the provider ([`RoomProviderWrapper.tsx`](components/collab/RoomProviderWrapper.tsx)), and authorizes connections ([`api/liveblocks-auth`](app/api/liveblocks-auth/route.ts)).

### Access & privacy

1. Creating or joining a room verifies the password (`POST /api/boards` or `/api/boards/[id]/join`).
2. On success the server sets a **signed, httpOnly, room-scoped cookie** ([`lib/roomToken.ts`](lib/roomToken.ts), HMAC, 24h TTL).
3. `POST /api/liveblocks-auth` authorizes the realtime connection **only if that cookie is valid** — so the password leaves the browser after one submit, is never stored in client-readable storage, and a share link without the cookie returns `403`.
4. Passwords are stored **scrypt-hashed** in Postgres ([`lib/password.ts`](lib/password.ts)).

## 📁 Project structure

```
app/
  page.tsx                     # Home — create / join a room (name + password)
  board/[boardId]/page.tsx     # Room: access gate + canvas + share panel
  api/
    boards/route.ts            # Create room (hash password, set cookie)
    boards/[boardId]/join/     # Verify password, set access cookie
    liveblocks-auth/route.ts   # Authorize realtime via the access cookie
components/
  canvas/                      # Toolbar, StylePanel, ZoomControls, TextEditor, ExportMenu, CanvasStage
  collab/                      # RoomProviderWrapper, Cursors/AvatarStack, SharePanel
lib/
  scene.ts, rough-renderer.ts  # Drawing engine + renderer
  types.ts, text.ts, export.ts # Element types, text measurement, PNG export
  password.ts, roomToken.ts    # scrypt hashing + signed access cookie
  prisma.ts, user.ts           # DB client + session helpers
prisma/schema.prisma           # Board (room) model
liveblocks.config.ts           # Liveblocks Storage / Presence types
```

## 🚀 Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com))
- A free [Liveblocks](https://liveblocks.io) account

### 1. Install

```bash
git clone https://github.com/MeKaustubh07/CoSketch.git
cd CoSketch
npm install
```

### 2. Environment

Create `.env` (see `.env.example`):

```bash
# PostgreSQL — stores room metadata (id, name, hashed password)
DATABASE_URL="postgresql://user:password@host:5432/cosketch?sslmode=require"

# Liveblocks server secret (real-time). From https://liveblocks.io/dashboard/apikeys
# Without a valid key the board will not load.
LIVEBLOCKS_SECRET_KEY="sk_dev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Secret used to sign room-access cookies (any long random string)
NEXTAUTH_SECRET="generate-a-long-random-string"
```

### 3. Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick a name, set a room password, and start sketching. Share the **Room ID + password** (or the link + password) to collaborate.

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint with ESLint |

## ⌨️ Shortcuts

`V` select · `R` rectangle · `D` diamond · `O` ellipse · `A` arrow · `L` line · `P` draw · `T` text · `E` eraser · `H` pan · `⌘/Ctrl+Z` undo · `⌘/Ctrl+Shift+Z` redo · `⌘/Ctrl+D` duplicate · `⌘/Ctrl+A` select all · `Delete` remove · `Esc` deselect

## 📝 Notes & limitations

- The display name is **per-session** (sessionStorage), not an account.
- Not yet implemented: groups, copy/paste, image tool, and arrow-to-shape binding.
- Room metadata is the only thing in Postgres — all canvas content lives in Liveblocks.

## 📄 License

MIT — personal / educational project.
