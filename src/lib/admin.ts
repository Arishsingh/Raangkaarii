import "server-only";

import { auth } from "@/auth";
import type { Session } from "next-auth";

import { emailIsAdmin } from "@/lib/admin-emails";

export { ADMIN_EMAILS, emailIsAdmin } from "@/lib/admin-emails";

/**
 * Every admin surface and server action calls this — never trust the UI.
 *
 * The address comes from the session Auth.js signed, not from anything the
 * request carried, and a session only ever holds an address that was either
 * registered here or asserted by Google.
 */
export async function getAdminUser(): Promise<Session["user"] | null> {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  return emailIsAdmin(user.email) ? user : null;
}

export async function isAdmin() {
  return (await getAdminUser()) !== null;
}
