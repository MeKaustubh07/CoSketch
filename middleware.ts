export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect board pages and board API routes
    "/board/:path*",
    "/boards/:path*",
    "/api/boards/:path*",
    "/api/liveblocks-auth",
  ],
};
