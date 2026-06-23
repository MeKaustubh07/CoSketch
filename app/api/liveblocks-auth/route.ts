import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || "sk_test_placeholder_key_for_builds_only",
});

// Deterministic color from user id
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
  // 1. Verify Auth.js session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 2. Get the requested room from the request body
  const body = await request.json();
  const room = body.room as string | undefined;

  if (!room) {
    return NextResponse.json({ error: "Room ID required" }, { status: 400 });
  }

  // 3. Check board access: must be owner or collaborator
  const board = await prisma.board.findUnique({
    where: { id: room },
    select: { ownerId: true },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const isOwner = board.ownerId === userId;

  if (!isOwner) {
    const collab = await prisma.boardCollaborator.findUnique({
      where: { boardId_userId: { boardId: room, userId } },
    });

    if (!collab) {
      return NextResponse.json(
        { error: "Not authorized for this board" },
        { status: 403 }
      );
    }
  }

  // 4. Prepare Liveblocks session
  const liveblocksSession = liveblocks.prepareSession(userId, {
    userInfo: {
      name: session.user.name || session.user.email || "Anonymous",
      color: userColor(userId),
      avatar: session.user.image || undefined,
    },
  });

  liveblocksSession.allow(room, liveblocksSession.FULL_ACCESS);

  // 5. Authorize and return
  const { status, body: responseBody } = await liveblocksSession.authorize();
  return new Response(responseBody, { status });
}
