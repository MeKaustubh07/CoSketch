import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

// ─── POST /api/boards — create a new board ────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json();
  const name = (body.name as string)?.trim() || "Untitled";

  // Generate 8-char nanoid for board ID (also Liveblocks room ID)
  const boardId = nanoid(8);

  // Generate random join password (6-char alphanumeric)
  const rawPassword = nanoid(6);

  const board = await prisma.board.create({
    data: {
      id: boardId,
      name,
      joinPassword: rawPassword,
    },
  });

  return NextResponse.json(
    {
      board: {
        id: board.id,
        name: board.name,
        joinPassword: rawPassword,
      },
    },
    { status: 201 }
  );
}
