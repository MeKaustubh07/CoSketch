/**
 * roomToken.ts — server-only signed room-access token.
 *
 * Verifying the room password once mints a short-lived HMAC token that is
 * stored in an httpOnly cookie. Re-auth (WS reconnects) then proves
 * access via that cookie instead of re-sending the password — so the password
 * never has to live in client-readable storage.
 */

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.WS_TICKET_SECRET || "dev-insecure-room-token-secret";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export const roomCookieName = (roomId: string) => `cosketch_room_${roomId}`;

export function signRoomToken(roomId: string, ttlMs = DEFAULT_TTL_MS): string {
  const exp = Date.now() + ttlMs;
  const payload = `${roomId}.${exp}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyRoomToken(
  token: string | undefined,
  roomId: string
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [rid, expStr, sig] = parts;
  if (rid !== roomId) return false;
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return false;

  const expected = createHmac("sha256", SECRET)
    .update(`${rid}.${expStr}`)
    .digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
