/**
 * ticket.ts — HMAC-based short-lived ticket verification for WS handshake.
 *
 * The Next.js app mints tickets via /api/ws-ticket after verifying the room
 * cookie. The WS server verifies them on `upgrade`.
 *
 * Ticket format: `roomId.expMs.hmacHex`
 */

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.WS_TICKET_SECRET || "dev-insecure-ws-ticket-secret";

/** Verify a ticket string. Returns the roomId on success, null on failure. */
export function verifyTicket(ticket: string, expectedRoom: string): boolean {
  const parts = ticket.split(".");
  if (parts.length !== 3) return false;

  const [roomId, expStr, sig] = parts;
  if (roomId !== expectedRoom) return false;

  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return false;

  const payload = `${roomId}.${expStr}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");

  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/** Mint a ticket (used by the Next.js API route). */
export function signTicket(roomId: string, ttlMs = 60_000): string {
  const exp = Date.now() + ttlMs;
  const payload = `${roomId}.${exp}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}
