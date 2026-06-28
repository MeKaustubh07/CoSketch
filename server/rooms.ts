/**
 * rooms.ts — In-memory room registry for the WS server.
 *
 * Each room holds: members, elements map, element order, a monotonic seq
 * counter, and a dirty flag for debounced persistence.
 */

import type { WebSocket } from "ws";
import type { Op, PresenceData } from "./protocol.js";
import { loadScene, saveScene, type SceneSnapshot } from "./persistence.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Member {
  ws: WebSocket;
  actorId: string;
  presence: PresenceData;
}

export interface Room {
  id: string;
  members: Map<WebSocket, Member>;
  elements: Record<string, Record<string, unknown>>;
  elementOrder: string[];
  seq: number;
  dirty: boolean;
  saveTimer: ReturnType<typeof setTimeout> | null;
}

// ─── Registry ─────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

const SAVE_DEBOUNCE_MS = 3000;

/** Get or lazily create + load a room from DB. */
export async function getOrCreateRoom(roomId: string): Promise<Room | null> {
  const existing = rooms.get(roomId);
  if (existing) return existing;

  const scene = await loadScene(roomId);
  if (!scene) return null; // Board doesn't exist in DB

  const room: Room = {
    id: roomId,
    members: new Map(),
    elements: scene.elements,
    elementOrder: scene.elementOrder,
    seq: 0,
    dirty: false,
    saveTimer: null,
  };

  rooms.set(roomId, room);
  return room;
}

/** Add a member to a room. */
export function joinRoom(room: Room, member: Member): void {
  room.members.set(member.ws, member);
}

/** Remove a member. If the room is empty, save and evict. */
export async function leaveRoom(room: Room, ws: WebSocket): Promise<void> {
  room.members.delete(ws);

  if (room.members.size === 0) {
    // Final save + evict
    if (room.saveTimer) clearTimeout(room.saveTimer);
    if (room.dirty) {
      await persistRoom(room);
    }
    rooms.delete(room.id);
  }
}

/** Get the current snapshot for an `init` message. */
export function getSnapshot(room: Room): {
  elements: Record<string, Record<string, unknown>>;
  elementOrder: string[];
  seq: number;
} {
  return {
    elements: room.elements,
    elementOrder: room.elementOrder,
    seq: room.seq,
  };
}

/** Get all other members' presence data (excluding the given ws). */
export function getOthersPresence(
  room: Room,
  excludeWs: WebSocket
): Array<{ actorId: string; presence: PresenceData }> {
  const result: Array<{ actorId: string; presence: PresenceData }> = [];
  for (const [ws, member] of room.members) {
    if (ws !== excludeWs) {
      result.push({ actorId: member.actorId, presence: member.presence });
    }
  }
  return result;
}

/**
 * Apply an op using LWW. Returns the new seq on success, or null if rejected.
 *
 * - upsert: accepted if incoming version >= stored version (tiebreak by actorId)
 * - delete: always accepted (marks element deleted)
 */
export function applyOp(room: Room, op: Op, actorId: string): number | null {
  room.seq++;

  if (op.op === "upsert") {
    const existing = room.elements[op.elementId];
    if (existing) {
      const storedVersion = (existing.version as number) ?? 0;
      if (op.version < storedVersion) {
        // Reject — stale version
        return null;
      }
      if (op.version === storedVersion) {
        // Tiebreak by actorId (lexicographic — deterministic)
        const storedActor = (existing.updatedBy as string) ?? "";
        if (actorId < storedActor) return null;
      }
    }

    // Apply
    room.elements[op.elementId] = {
      ...op.element,
      version: op.version,
      updatedBy: actorId,
    };

    // Add to order if new
    if (!existing) {
      room.elementOrder.push(op.elementId);
    }
  } else if (op.op === "delete") {
    delete room.elements[op.elementId];
    room.elementOrder = room.elementOrder.filter((id) => id !== op.elementId);
  } else if (op.op === "reorder") {
    const idx = room.elementOrder.indexOf(op.elementId);
    if (idx !== -1) {
      const arr = [...room.elementOrder];
      arr.splice(idx, 1);

      let target: number;
      if (op.direction === "front") target = arr.length;
      else if (op.direction === "back") target = 0;
      else if (op.direction === "forward") target = Math.min(arr.length, idx + 1);
      else target = Math.max(0, idx - 1);

      arr.splice(target, 0, op.elementId);
      room.elementOrder = arr;
    }
  }

  markDirty(room);
  return room.seq;
}

/** Update a member's presence. */
export function updatePresence(
  room: Room,
  ws: WebSocket,
  presence: PresenceData
): void {
  const member = room.members.get(ws);
  if (member) member.presence = presence;
}

/** Broadcast a stringified message to all members except the sender. */
export function broadcast(room: Room, message: string, excludeWs?: WebSocket): void {
  for (const [ws] of room.members) {
    if (ws !== excludeWs && ws.readyState === 1 /* OPEN */) {
      ws.send(message);
    }
  }
}

/** Broadcast to ALL members (including sender). */
export function broadcastAll(room: Room, message: string): void {
  for (const [ws] of room.members) {
    if (ws.readyState === 1) ws.send(message);
  }
}

// ─── Persistence helpers ──────────────────────────────────────────────────

function markDirty(room: Room): void {
  room.dirty = true;
  if (room.saveTimer) clearTimeout(room.saveTimer);
  room.saveTimer = setTimeout(() => {
    persistRoom(room);
  }, SAVE_DEBOUNCE_MS);
}

async function persistRoom(room: Room): Promise<void> {
  const snapshot: SceneSnapshot = {
    elements: room.elements,
    elementOrder: room.elementOrder,
  };
  try {
    await saveScene(room.id, snapshot);
    room.dirty = false;
    console.log(`[persist] saved room ${room.id}`);
  } catch (err) {
    console.error(`[persist] failed to save room ${room.id}:`, err);
  }
}

/** Flush all dirty rooms (graceful shutdown). */
export async function flushAll(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const room of rooms.values()) {
    if (room.saveTimer) clearTimeout(room.saveTimer);
    if (room.dirty) promises.push(persistRoom(room));
  }
  await Promise.allSettled(promises);
}

/** Get the total number of active rooms (for health check). */
export function roomCount(): number {
  return rooms.size;
}
