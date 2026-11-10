import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

/**
 * The half of the Auth.js configuration that touches neither the database nor
 * the password hasher.
 *
 * `proxy.ts` builds its own Auth.js instance from this alone, so route
 * protection reads the session cookie and nothing else — no adapter, no
 * connection pool opened on a request that is only being waved through.
 * `src/auth.ts` is the full instance, and the only one that can sign anyone in.
 */

/**
 * Google is optional. Without the two variables the provider is left out
 * entirely rather than registered half-configured, so the sign-in page can hide
 * the button instead of offering one that fails at the redirect.
 */
export const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const authConfig = {
  providers: googleConfigured
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          /**
           * Safe now that every password account must confirm its address:
           * linking joins two parties who both proved they own the inbox. The
           * one exception — a password account nobody confirmed, which could
           * be someone squatting the address — has its password removed by the
           * signIn callback in src/auth.ts before the link is made.
           */
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],

  pages: {
    signIn: "/login",
    // Auth.js sends provider failures here as ?error=…; the page reads it.
    error: "/login",
  },

  /**
   * Required: a database session cannot be issued for a credentials sign-in,
   * so the whole app runs on JWT sessions. The adapter still stores users and
   * linked accounts — it is the session row alone that goes unused.
   */
  session: { strategy: "jwt" },

  callbacks: {
    /**
     * The user id is only in scope on the sign-in pass; every later call has
     * the token alone, so it is copied in once and read back from there.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        /**
         * Every sign-in that reaches here proved the address: a password
         * account only signs in once confirmed, and Google sign-in requires
         * Google's own verification. Sessions issued before this check
         * existed lack the flag, and so lose admin access until they sign in
         * again.
         */
        token.verified = true;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = String(token.id);
      session.user.verified = token.verified === true;
      return session;
    },
  },
} satisfies NextAuthConfig;
