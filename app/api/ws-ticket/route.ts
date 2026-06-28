import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { verifyRoomToken, roomCookieName } from "@/lib/roomToken";

const WS_TICKET_SECRET = process.env.WS_TICKET_SECRET || "dev-insecure-ws-ticket-secret";
const TICKET_TTL_MS = 60_000; // 60 seconds

/** Mint a short-lived HMAC ticket for the WS handshake. */
function signTicket(roomId: string): string {
  const exp = Date.now() + TICKET_TTL_MS;
  const payload = `${roomId}.${exp}`;
  const sig = createHmac("sha256", WS_TICKET_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/**
 * GET /api/ws-ticket?room=<id>
 *
 * Verifies the room-access httpOnly cookie, then returns a short-lived
 * HMAC ticket that the client passes to the WS server on upgrade.
 */
export async function GET(request: NextRequest) {
  const room = request.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "Missing room param" }, { status: 400 });
  }

  // Verify the room-access cookie (set when user enters the room password)
  const cookie = request.cookies.get(roomCookieName(room));
  if (!verifyRoomToken(cookie?.value, room)) {
    return NextResponse.json({ error: "Room access denied" }, { status: 401 });
  }

  // Mint a short-lived ticket (60s) for the WS handshake
  const ticket = signTicket(room);

  return NextResponse.json({ ticket });
}
