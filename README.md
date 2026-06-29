<div align="center">

# ✏️ CoSketch

**A real-time collaborative whiteboard with a hand-drawn feel — an Excalidraw-style clone.**

Sketch shapes, arrows, freehand and text on an infinite canvas, then share a private,
password-protected room and draw together live with cursors and presence.

Next.js 16 · React 19 · WebSockets · rough.js · Prisma · Tailwind CSS 4

</div>

---

## ✨ Features

- **Infinite canvas** with pan, zoom (wheel / ⌘-scroll), and a dot grid.
- **Hand-drawn rendering** via [rough.js](https://roughjs.com) — rectangles, diamonds, ellipses, arrows, lines, freehand draw, and text.
- **Full editing** — select, multi-select (rubber-band), move, resize (with font scaling for text), rotate, duplicate, delete, and layer ordering.
- **Excalidraw-style style panel** — stroke/background colors, fill style, stroke width & style, sloppiness, edges, opacity, font family & size, arrowheads.
- **Real-time collaboration** — shared canvas, live cursors with names, and an avatar stack, powered by a custom **WebSocket server**.
- **Auto-persistence** — canvas content is debounced and saved to PostgreSQL via Prisma, so a refresh keeps everything (no manual save).
- **Private rooms** — each room has a password; access is enforced server-side with an httpOnly, signed cookie (a share link alone can't bypass it).
- **Undo / redo**, **keyboard shortcuts**, and **PNG export**.
- **No sign-up** — pick a display name per session and go.

## 🧱 Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Realtime / sync | Custom WebSocket Server (Node.js/ws) |
| Canvas rendering | rough.js + HTML Canvas 2D |
| Database | PostgreSQL via Prisma (room metadata & canvas elements) |
| Language | TypeScript |

## 🏗️ Architecture

**Local-first canvas, synced through a custom WebSocket Server.**

- The drawing engine ([`lib/scene.ts`](lib/scene.ts), [`lib/rough-renderer.ts`](lib/rough-renderer.ts)) is pure and framework-agnostic: element creation, hit-testing, resize/rotate math, and a cached rough.js renderer drawn on a `requestAnimationFrame` loop. Shapes are drawn in local coordinates and positioned with `ctx.translate`, so **moving an element never regenerates its rough path**.
- [`CanvasStage.tsx`](components/canvas/CanvasStage.tsx) keeps per-user UI state (tool, viewport, selection) in local React state, while **shared scene state lives in a custom RealtimeStore** (`shapes`, `elementOrder`). Reads use React's `useSyncExternalStore`; writes are broadcasted over a WebSocket using a Last-Writer-Wins (LWW) CRDT algorithm.
- During a drag, edits are applied to an in-memory **override map** (instant local render) and flushed to the network on a throttle, so collaborators see smooth updates without per-frame network spam.
- **Presence** broadcasts each user's cursor (in canvas coordinates) and name for live cursors and avatars.

### Real-time / WebSockets

The custom standalone Node.js WebSocket server ([`server/index.ts`](server/index.ts)) handles connections, routes messages, and resolves conflicts using monotonic sequencing. It also persists dirty canvas state to Postgres in the background so you never lose your drawings. The frontend connects to it using a secure HMAC ticket minted by a Next.js API route.

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
    ws-ticket/route.ts         # Mint a secure HMAC ticket for the WebSocket server
components/
  canvas/                      # Toolbar, StylePanel, ZoomControls, TextEditor, ExportMenu, CanvasStage
  collab/                      # RealtimeProvider, Cursors/AvatarStack, SharePanel
lib/
  scene.ts, rough-renderer.ts  # Drawing engine + renderer
  types.ts, text.ts, export.ts # Element types, text measurement, PNG export
  password.ts, roomToken.ts    # scrypt hashing + signed access cookie
  prisma.ts, user.ts           # DB client + session helpers
  realtime/                    # Custom WebSocket client, LWW store, and hooks
prisma/schema.prisma           # Board (room) model
server/                        # Standalone WebSocket server (Node.js/ws)
```

## 🚀 Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com))

### 1. Install

```bash
git clone https://github.com/MeKaustubh07/CoSketch.git
cd CoSketch
npm install
```

### 2. Environment

Create `.env` (see `.env.example`):

```bash
# PostgreSQL — stores room metadata (id, name, hashed password) and canvas elements
DATABASE_URL="postgresql://user:password@host:5432/cosketch?sslmode=require"

# Shared HMAC secret for WS ticket auth (Next.js mints, WS server verifies)
WS_TICKET_SECRET="generate-a-long-random-string"

# Public URL of the WebSocket server (used by the client)
NEXT_PUBLIC_WS_URL="ws://localhost:8080"

# Secret used to sign room-access cookies
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
npm run dev:ws
```

Open [http://localhost:3000](http://localhost:3000) (Next.js frontend), pick a name, set a room password, and start sketching. The frontend will connect to the `dev:ws` server running on port `8080`.

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

## 📄 License

MIT — personal / educational project.
