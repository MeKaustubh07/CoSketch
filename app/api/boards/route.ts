import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import crypto from "crypto";

// ─── Helper: encrypt joinPassword ─────────────────────────────────────────

const ENCRYPTION_KEY = process.env.BOARD_ENCRYPTION_KEY || "0".repeat(64); // 32 bytes hex

function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${authTag.toString("hex")}`;
}

// ─── GET /api/boards — list user's boards ─────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [ownedBoards, collabBoards] = await Promise.all([
    prisma.board.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
        _count: { select: { collaborators: true } },
      },
    }),
    prisma.boardCollaborator.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            ownerId: true,
            _count: { select: { collaborators: true } },
          },
        },
      },
    }),
  ]);

  const boards = [
    ...ownedBoards.map((b: typeof ownedBoards[number]) => ({
      ...b,
      collaboratorCount: b._count.collaborators,
      role: "owner" as const,
    })),
    ...collabBoards.map((c: typeof collabBoards[number]) => ({
      ...c.board,
      collaboratorCount: c.board._count.collaborators,
      role: "collaborator" as const,
    })),
  ];

  return NextResponse.json({ boards });
}

// ─── POST /api/boards — create a new board ────────────────────────────────

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = (body.name as string)?.trim() || "Untitled";

  // Generate 8-char nanoid for board ID (also Liveblocks room ID)
  const boardId = nanoid(8);

  // Generate random join password (6-char alphanumeric)
  const rawPassword = nanoid(6);
  const encryptedPassword = encrypt(rawPassword);

  const board = await prisma.board.create({
    data: {
      id: boardId,
      name,
      ownerId: session.user.id,
      joinPassword: encryptedPassword,
    },
  });

  return NextResponse.json({
    board: {
      id: board.id,
      name: board.name,
      joinPassword: rawPassword, // Return plaintext on creation only
    },
  }, { status: 201 });
}
