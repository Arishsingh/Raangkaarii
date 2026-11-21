import "server-only";

import { auth } from "@/auth";
import type { Session } from "next-auth";

import { emailIsAdmin } from "@/lib/admin-emails";
import { emailIsVerified } from "@/lib/users-store";

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

  if (!emailIsAdmin(user.email)) return null;
  /**
   * Registration does not verify ownership of an address, so being on the
   * list is not enough: someone could sign up with an admin's address. The
   * address must also have been proven (Google, or a password-reset link).
   */
  try {
    if (!(await emailIsVerified(user.email!))) return null;
  } catch (caught) {
    console.error("Could not verify admin email", caught);
    return null;
  }
  return user;
}

export async function isAdmin() {
  return (await getAdminUser()) !== null;
}
