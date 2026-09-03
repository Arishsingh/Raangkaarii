import type { Session } from "next-auth";

/**
 * How the shop greets someone.
 *
 * Auth.js carries a single `name` — Google supplies a full one and a
 * credentials sign-up supplies none at all — so the greeting takes the first
 * word of it, then the part of the email before the @, then a neutral fallback.
 */
export function firstNameOf(user: Session["user"] | undefined | null) {
  const name = user?.name?.trim();
  if (name) return name.split(/\s+/)[0];

  const email = user?.email?.trim();
  if (email) return email.split("@")[0];

  return "there";
}
