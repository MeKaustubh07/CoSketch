import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signRoomToken, roomCookieName } from "@/lib/roomToken";

// POST /api/boards/[boardId]/join — verify the room password, grant access cookie
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  const body = await request.json();
  const password = (body.password as string)?.trim();

  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { joinPassword: true },
  });

  if (!board) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (!verifyPassword(password, board.joinPassword)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(roomCookieName(boardId), signRoomToken(boardId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  return res;
}
