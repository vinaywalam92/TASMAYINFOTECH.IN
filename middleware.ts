import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge gate: keeps anonymous visitors out of /account and /admin before any rendering.
 * This is only a cookie-presence check. Real authentication and authorization are re-done on the
 * server in every page, server action and route handler (see lib/auth/guards.ts).
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("tm_session")?.value) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.pathname + req.nextUrl.search;
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/account/:path*", "/admin/:path*"] };
