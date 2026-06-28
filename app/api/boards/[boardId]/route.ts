import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/boards/[boardId] — get board details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json({ board });
}
