import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/boards/[boardId]/join — join a board with password
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
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Verify password
  if (password !== board.joinPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
