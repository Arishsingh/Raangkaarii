import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import NeonAdapter from "@auth/neon-adapter";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { sendVerificationLink } from "@/lib/email-verification";
import {
  clearLoginFailures,
  clientIp,
  loginIsBlocked,
  recordLoginFailure,
} from "@/lib/login-limit";
import { siteOrigin } from "@/lib/site-origin";
import {
  claimUnverifiedAccountForGoogle,
  ensureAuthSchema,
  findUserByEmail,
} from "@/lib/users-store";

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
 * Failures the login form words differently. Each `code` lands in the URL, so
 * neither says anything about whether the address is registered: the limit
 * applies to unknown addresses too, and "unverified" is only reported once the
 * right password has been given.
 */
export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}
export class EmailNotVerified extends CredentialsSignin {
  code = "email_unverified";
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
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Google sign-ins only with an address Google itself has verified. Before
     * Auth.js links the Google account to an existing user of the same email,
     * any password account nobody ever confirmed loses its password — see
     * claimUnverifiedAccountForGoogle.
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (profile?.email_verified !== true || !profile.email) return false;
      try {
        await claimUnverifiedAccountForGoogle(profile.email);
        return true;
      } catch (caught) {
        console.error("Could not prepare Google sign-in", caught);
        return false;
      }
    },
  },
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
       * known. The two thrown errors above are the only other answers.
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

        /**
         * The right password, but the address was never confirmed. Send a
         * fresh link (rate limited per account) and refuse the sign-in — the
         * person at the keyboard knows the password, so telling them the
         * account exists reveals nothing new.
         */
        if (!user.emailVerified) {
          try {
            await sendVerificationLink(user, siteOrigin(request));
          } catch (caught) {
            console.error("Could not send verification email", caught);
          }
          throw new EmailNotVerified();
        }

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
