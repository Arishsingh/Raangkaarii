import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { loginRedirectFor } from "@/lib/auth-redirect";

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

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const target = loginRedirectFor(pathname, search, Boolean(request.auth));
  if (!target) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.nextUrl));
});

export const config = {
  /**
   * Static assets and Next's own routes are excluded; `/api/auth/*` in
   * particular must stay open, or signing in would require being signed in.
   * `/login` and `/signup` are public: see PROTECTED_PREFIXES in lib/auth-redirect.
   *
   * `/api/admin/upload` is excluded for a different reason: when a proxy runs,
   * Next buffers the whole request body in memory so it can be read twice, and
   * past its limit it truncates the body *silently* rather than failing. That
   * turned a 21 MB clip into a 10 MB corrupt one with no error anywhere. The
   * route checks the admin session itself, which is the real gate regardless.
   */
  matcher: [
    "/((?!api/auth|api/admin/upload|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
