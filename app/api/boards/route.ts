import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { nanoid } from "nanoid";

// ─── POST /api/boards — create a new room ─────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json();
  const name = (body.name as string)?.trim() || "Untitled";
  const password = (body.password as string)?.trim();

  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  // 8-char nanoid for board ID (also the Liveblocks room ID)
  const boardId = nanoid(8);

  const board = await prisma.board.create({
    data: { id: boardId, name, joinPassword: hashPassword(password) },
  });

  return NextResponse.json(
    { board: { id: board.id, name: board.name } },
    { status: 201 }
  );
}
