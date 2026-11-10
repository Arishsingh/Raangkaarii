import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import NeonAdapter from "@auth/neon-adapter";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import {
  clearLoginFailures,
  clientIp,
  loginIsBlocked,
  recordLoginFailure,
} from "@/lib/login-limit";
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
 * The one failure the login form words differently. Its `code` lands in the
 * URL; it says nothing about whether the address is registered, because the
 * limit applies to unknown addresses too.
 */
export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

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
       * Returning null means "invalid email or password" and nothing more, so
       * this never reports which half was wrong, or whether the address is
       * known. TooManyAttempts above is the only other answer.
       */
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const ip = clientIp(request);

        let user: Awaited<ReturnType<typeof findUserByEmail>>;
        try {
          await ensureAuthSchema();
          // Checked before the password, so a locked account stays locked
          // even when the next guess happens to be right.
          if (await loginIsBlocked(email, ip)) throw new TooManyAttempts();

          user = await findUserByEmail(email);

          // A Google-only account has no password and must fail this check.
          const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
          if (!ok || !user?.password) {
            await recordLoginFailure(email, ip);
            return null;
          }
        } catch (caught) {
          if (caught instanceof CredentialsSignin) throw caught;
          // Logged for us, invisible to the person signing in.
          console.error("Credentials sign-in failed", caught);
          return null;
        }

        await clearLoginFailures(email).catch((caught) =>
          console.error("Could not clear login failures", caught),
        );

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
}));
