/**
 * persistence.ts — Load / save room scenes to Postgres via Prisma.
 *
 * The WS server lazily loads a scene into memory on first join.
 * Changes are debounced-saved (3s after last op). Final flush on room eviction.
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface SceneSnapshot {
  elements: Record<string, Record<string, unknown>>;
  elementOrder: string[];
}

const EMPTY_SCENE: SceneSnapshot = { elements: {}, elementOrder: [] };

/** Load scene from DB. Returns null if board doesn't exist. */
export async function loadScene(boardId: string): Promise<SceneSnapshot | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { scene: true },
  });

  if (!board) return null;

  try {
    const raw = board.scene as unknown as SceneSnapshot;
    return {
      elements: raw.elements ?? {},
      elementOrder: raw.elementOrder ?? [],
    };
  } catch {
    return { ...EMPTY_SCENE };
  }
}

/** Save scene to DB. */
export async function saveScene(
  boardId: string,
  scene: SceneSnapshot
): Promise<void> {
  await prisma.board.update({
    where: { id: boardId },
    data: { scene: scene as unknown as Prisma.InputJsonValue },
  });
}

/** Graceful shutdown — disconnect Prisma. */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
