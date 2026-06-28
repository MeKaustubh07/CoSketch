/**
 * protocol.ts — Shared wire protocol for CoSketch WebSocket.
 *
 * JSON messages, both directions. This file is imported by both the
 * standalone WS server and the Next.js client code.
 */

// ─── Op types ─────────────────────────────────────────────────────────────

export interface UpsertOp {
  op: "upsert";
  opId: string;         // client-generated unique ID (for ack + dedup)
  elementId: string;
  element: Record<string, unknown>; // CanvasElement (serialized)
  version: number;
}

export interface DeleteOp {
  op: "delete";
  opId: string;
  elementId: string;
  version: number;
}

export interface ReorderOp {
  op: "reorder";
  opId: string;
  elementId: string;
  direction: "front" | "back" | "forward" | "backward";
}

export type Op = UpsertOp | DeleteOp | ReorderOp;

// ─── Presence ─────────────────────────────────────────────────────────────

export interface PresenceData {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
}

// ─── Server → Client messages ─────────────────────────────────────────────

export interface InitMessage {
  type: "init";
  elements: Record<string, Record<string, unknown>>;  // id → CanvasElement
  elementOrder: string[];
  you: { actorId: string; name: string; color: string };
  others: Array<{ actorId: string; presence: PresenceData }>;
  seq: number;          // current global sequence number
}

export interface OpBroadcast {
  type: "op";
  op: Op;
  seq: number;          // server-assigned global sequence
  actorId: string;      // who sent it
}

export interface AckMessage {
  type: "ack";
  opId: string;
  seq: number;
}

export interface PeerJoinMessage {
  type: "peer-join";
  actorId: string;
  presence: PresenceData;
}

export interface PeerLeaveMessage {
  type: "peer-leave";
  actorId: string;
}

export interface PresenceBroadcast {
  type: "presence";
  actorId: string;
  presence: PresenceData;
}

export interface PongMessage {
  type: "pong";
}

export type ServerMessage =
  | InitMessage
  | OpBroadcast
  | AckMessage
  | PeerJoinMessage
  | PeerLeaveMessage
  | PresenceBroadcast
  | PongMessage;

// ─── Client → Server messages ─────────────────────────────────────────────

export interface ClientOpMessage {
  type: "op";
  op: Op;
}

export interface ClientPresenceMessage {
  type: "presence";
  presence: PresenceData;
}

export interface PingMessage {
  type: "ping";
}

export type ClientMessage =
  | ClientOpMessage
  | ClientPresenceMessage
  | PingMessage;

// ─── Close codes ──────────────────────────────────────────────────────────

export const WS_CLOSE_NORMAL = 1000;
export const WS_CLOSE_BAD_TICKET = 4401;
export const WS_CLOSE_ROOM_NOT_FOUND = 4404;
export const WS_CLOSE_RATE_LIMITED = 4429;
