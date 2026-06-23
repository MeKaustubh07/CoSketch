import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight middleware that checks for the session cookie.
 * Actual session validation happens in the API routes (server-side).
 * We can't use the full auth() here because PrismaAdapter doesn't work in Edge.
 */
export function middleware(request: NextRequest) {
  // Auth.js v5 with database strategy stores session as a cookie
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect board pages and board API routes
    "/board/:path*",
    "/boards/:path*",
    "/api/boards/:path*",
    "/api/liveblocks-auth",
  ],
};
