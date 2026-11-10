import type { DefaultSession } from "next-auth";

/**
 * The session carries the database id as well as the profile, so a route
 * handler can attribute an order without a second lookup by email.
 */
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
