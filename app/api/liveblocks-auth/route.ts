import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// Lazily construct the client — building the client validates the secret key,
// so doing it at module scope would crash the production build when the env
// var is unset/placeholder.
let _liveblocks: Liveblocks | null = null;
function getLiveblocks(): Liveblocks {
  if (!_liveblocks) {
    _liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY ?? "",
    });
  }
  return _liveblocks;
}

// Deterministic color from string
function userColor(id: string): string {
  const colors = [
    "#e57373", "#f06292", "#ba68c8", "#9575cd",
    "#7986cb", "#64b5f6", "#4fc3f7", "#4dd0e1",
    "#4db6ac", "#81c784", "#aed581", "#dce775",
    "#ffd54f", "#ffb74d", "#ff8a65",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const room = body.room as string | undefined;
  const password = ((body.password as string) || "").trim();

  if (!room) {
    return NextResponse.json({ error: "Room ID required" }, { status: 400 });
  }

  // Enforce the room password here — this is the real access gate, so a share
  // link alone cannot grant access without the password.
  const board = await prisma.board.findUnique({
    where: { id: room },
    select: { joinPassword: true },
  });
  if (!board) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!verifyPassword(password, board.joinPassword)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  // Anonymous per-session user id; display name comes from the client.
  const userId = `user-${nanoid(6)}`;
  const name = ((body.name as string) || "").trim().slice(0, 32) || "Guest";

  const session = getLiveblocks().prepareSession(userId, {
    userInfo: {
      name,
      color: userColor(name),
    },
  });

  session.allow(room, session.FULL_ACCESS);

  const { status, body: responseBody } = await session.authorize();
  return new Response(responseBody, { status });
}
