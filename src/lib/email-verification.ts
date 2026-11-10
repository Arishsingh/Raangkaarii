import "server-only";

import crypto from "node:crypto";

import { getSql } from "@/lib/db";
import { sendEmail, verifyEmailMessage } from "@/lib/email";
import { ensureAuthSchema } from "@/lib/users-store";

/**
 * Email confirmation, asked only of password accounts on the admin list.
 *
 * Until the link is opened such an account cannot sign in, and so can never
 * reach the admin panel — admin access is decided by email address, so an
 * unproven address must not count. Customers are never asked to confirm. Like reset links, only the token's SHA-256 is stored.
 */
export const VERIFY_TOKEN_TTL_HOURS = 24;
/** Links sent beyond this, per account per hour, are silently skipped. */
const MAX_LINKS_PER_HOUR = 3;

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await ensureAuthSchema();
      const sql = getSql();
      await sql`
        create table if not exists email_verification_tokens (
          token_hash text primary key,
          user_id    uuid not null references users (id) on delete cascade,
          expires_at timestamptz not null,
          used_at    timestamptz,
          created_at timestamptz not null default now()
        )
      `;
      await sql`
        create index if not exists email_verification_tokens_user_idx
          on email_verification_tokens (user_id, created_at)
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Emails a confirmation link. Returns false when the hourly limit was hit and
 * nothing was sent — callers must not tell the visitor which.
 */
export async function sendVerificationLink(
  user: { id: string; email: string; name: string | null },
  origin: string,
) {
  await ensureSchema();
  const sql = getSql();

  const [recent] = (await sql`
    select count(*)::int as n
      from email_verification_tokens
     where user_id = ${user.id}
       and created_at > now() - interval '1 hour'
  `) as { n: number }[];
  if ((recent?.n ?? 0) >= MAX_LINKS_PER_HOUR) return false;

  const token = crypto.randomBytes(32).toString("base64url");
  await sql`
    insert into email_verification_tokens (token_hash, user_id, expires_at)
    values (
      ${hashToken(token)},
      ${user.id},
      now() + make_interval(hours => ${VERIFY_TOKEN_TTL_HOURS})
    )
  `;

  const link = `${origin}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    ...verifyEmailMessage({ name: user.name, link, hours: VERIFY_TOKEN_TTL_HOURS }),
  });
  return true;
}

/**
 * Spends the token and marks the address confirmed, in one statement so a
 * double click cannot run it twice. Returns the confirmed email, or null when
 * the link is unknown, used or expired.
 *
 * Opening the link is enough on its own: an inbox scanner that follows it
 * early only confirms what the owner was about to confirm.
 */
export async function confirmEmail(token: string): Promise<string | null> {
  if (!token) return null;
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    with spent as (
      update email_verification_tokens
         set used_at = now()
       where token_hash = ${hashToken(token)}
         and used_at is null
         and expires_at > now()
      returning user_id
    )
    update users
       set "emailVerified" = coalesce("emailVerified", now()), updated_at = now()
     where id = (select user_id from spent)
    returning email
  `) as { email: string }[];

  return rows[0]?.email ?? null;
}
