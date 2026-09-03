import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import NeonAdapter from "@auth/neon-adapter";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { ensureAuthSchema, findUserByEmail } from "@/lib/users-store";

/**
 * The full Auth.js instance: providers, the Neon adapter, and the password
 * check. `auth()` is how every server component, route handler and Server
 * Action asks who is signed in — nothing decodes the token by hand.
 */

/** Cost factor for every password this app hashes. */
export const BCRYPT_ROUNDS = 12;

/**
 * A real bcrypt hash of a value nothing can supply. Comparing against it on a
 * miss keeps the work — and so the response time — the same whether or not the
 * address is registered, which is what stops sign-in being used to enumerate
 * customers.
 */
const DUMMY_HASH = "$2b$12$2JsDcUYY2w2u5fSUCl4OSOCQczlqvv5hueddf5hKhUdfp1vU0nv7G";

/**
 * The adapter needs a Pool rather than the HTTP client the rest of the app
 * uses. It is built inside the config factory, which Auth.js calls per request,
 * because a WebSocket pool cannot be shared across serverless invocations —
 * and because `next build` evaluates module scope before DATABASE_URL exists.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  adapter: NeonAdapter(new Pool({ connectionString: process.env.DATABASE_URL })),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      /**
       * Returning null is the only failure signal Auth.js wants here — the
       * caller is told "invalid credentials" and nothing more, so this can
       * never report which half was wrong, or whether the address is known.
       */
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        try {
          await ensureAuthSchema();
          const user = await findUserByEmail(email);

          // A Google-only account has no password and must fail this check.
          const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
          if (!ok || !user?.password) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (caught) {
          // Logged for us, invisible to the person signing in.
          console.error("Credentials sign-in failed", caught);
          return null;
        }
      },
    }),
  ],
}));
