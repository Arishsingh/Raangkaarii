import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

/**
 * Route protection, done from the session cookie alone — this instance is
 * built from the DB-free half of the config, so a request that is only being
 * waved through never opens a connection.
 *
 * It is the outer gate, not the only one: every protected page and route
 * handler still calls `auth()` itself, because a proxy check cannot be the
 * last word on who may read an order.
 */
const { auth } = NextAuth(authConfig);

/** Everything under these prefixes requires a signed-in visitor. */
const PROTECTED = ["/dashboard", "/admin", "/profile", "/settings"];

export default auth((request) => {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected || request.auth) return NextResponse.next();

  /**
   * Where they were headed, carried through the sign-in so they land on it
   * rather than on the dashboard. Only the path and query are kept — a full
   * URL here would let a crafted link bounce someone off-site afterwards.
   */
  const login = new URL("/login", request.nextUrl);
  login.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(login);
});

export const config = {
  /**
   * Static assets and Next's own routes are excluded; `/api/auth/*` in
   * particular must stay open, or signing in would require being signed in.
   * `/login` and `/signup` are public by virtue of not being in PROTECTED.
   */
  matcher: [
    "/((?!api/auth|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
