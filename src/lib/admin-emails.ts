/**
 * The admin list on its own, with no dependency on Auth.js, so the sign-in
 * code in src/auth.ts can check it without importing itself in a circle.
 */
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
