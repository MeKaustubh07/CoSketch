import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── GET /api/boards/[boardId] — get board details ────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      collaborators: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Check access
  const isOwner = board.ownerId === session.user.id;
  const isCollaborator = board.collaborators.some(
    (c: { userId: string }) => c.userId === session.user!.id
  );

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    board: {
      ...board,
      role: isOwner ? "owner" : "collaborator",
    },
  });
}

// ─── PATCH /api/boards/[boardId] — rename board ───────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { boardId } = await params;
  const body = await request.json();
  const name = (body.name as string)?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Only owner can rename
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  if (board.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only the owner can rename" }, { status: 403 });
  }

  const updated = await prisma.board.update({
    where: { id: boardId },
    data: { name },
  });

  return NextResponse.json({ board: updated });
}

// ─── DELETE /api/boards/[boardId] — delete board ──────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  if (board.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only the owner can delete" }, { status: 403 });
  }

  await prisma.board.delete({ where: { id: boardId } });

  return NextResponse.json({ success: true });
}
