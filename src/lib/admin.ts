import "server-only";

import { auth } from "@/auth";
import type { Session } from "next-auth";

/** Fallback owners, used when no ADMIN_EMAILS override is set. */
const DEFAULT_ADMIN_EMAILS = [
  "admin@gmail.com",
  "arishsingh9469@gmail.com",
  "mohitsalgotra@gmail.com",
  "23anuragsharma@gmail.com",
];

/**
 * The admin accounts. Overridable via a comma-separated ADMIN_EMAILS so the
 * addresses are not baked into the bundle for other deployments.
 */
export const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAILS.join(",")
)
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export function emailIsAdmin(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}

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
