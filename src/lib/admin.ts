import "server-only";

import { currentUser } from "@clerk/nextjs/server";

/** Fallback owners, used when no ADMIN_EMAILS override is set. */
const DEFAULT_ADMIN_EMAILS = [
  "arishsingh9469@gmail.com",
  "mohitsalgotra@gmail.com",
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

/** Every admin surface and server action calls this — never trust the UI. */
export async function getAdminUser() {
  const user = await currentUser();
  if (!user) return null;

  const emails = user.emailAddresses.map((entry) => entry.emailAddress);
  const primary = user.primaryEmailAddress?.emailAddress;
  const match = [primary, ...emails].some(emailIsAdmin);

  return match ? user : null;
}

export async function isAdmin() {
  return (await getAdminUser()) !== null;
}
