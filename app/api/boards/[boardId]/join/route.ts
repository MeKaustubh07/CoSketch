import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.BOARD_ENCRYPTION_KEY || "0".repeat(64);

function decrypt(encrypted: string): string {
  const [ivHex, ciphertextHex, authTagHex] = encrypted.split(":");
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// POST /api/boards/[boardId]/join — join a board with password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { boardId } = await params;
  const body = await request.json();
  const password = (body.password as string)?.trim();

  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true, joinPassword: true },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Owner doesn't need a password
  if (board.ownerId === session.user.id) {
    return NextResponse.json({ success: true, alreadyMember: true });
  }

  // Check if already a collaborator
  const existing = await prisma.boardCollaborator.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });

  if (existing) {
    return NextResponse.json({ success: true, alreadyMember: true });
  }

  // Verify password
  const decryptedPassword = decrypt(board.joinPassword);
  if (password !== decryptedPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  // Add as collaborator
  await prisma.boardCollaborator.create({
    data: {
      boardId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true, alreadyMember: false });
}
