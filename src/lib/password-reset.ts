import "server-only";

import crypto from "node:crypto";

import { getSql } from "@/lib/db";
import { ensureAuthSchema, findUserByEmail } from "@/lib/users-store";

/**
 * Password reset tokens.
 *
 * The link in the email carries a random token; only its SHA-256 is stored, so
 * a leaked copy of this table cannot be used to reset anyone's password. Each
 * token works once, for a short window, and setting a new password voids every
 * other outstanding token for that account.
 */
export const RESET_TOKEN_TTL_MINUTES = 30;
/** Requests beyond this, per account per hour, are silently dropped. */
const MAX_REQUESTS_PER_HOUR = 3;

let schemaReady: Promise<void> | null = null;

function ensureResetSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await ensureAuthSchema();
      const sql = getSql();
      await sql`
        create table if not exists password_reset_tokens (
          token_hash text primary key,
          user_id    uuid not null references users (id) on delete cascade,
          expires_at timestamptz not null,
          used_at    timestamptz,
          created_at timestamptz not null default now()
        )
      `;
      await sql`
        create index if not exists password_reset_tokens_user_idx
          on password_reset_tokens (user_id, created_at)
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

export type ResetTokenResult =
  | { status: "issued"; token: string; name: string | null; email: string }
  | { status: "no_account" }
  | { status: "rate_limited" };

/**
 * Issues a token for the account with this email, or says why it did not:
 * no such account, or too many links already sent this hour. The forgot
 * password screen shows the shopper which one happened.
 */
export async function createResetToken(email: string): Promise<ResetTokenResult> {
  await ensureResetSchema();
  const user = await findUserByEmail(email);
  if (!user) {
    console.warn("Password reset skipped: no account with that email");
    return { status: "no_account" };
  }

  const sql = getSql();
  const [recent] = (await sql`
    select count(*)::int as n
      from password_reset_tokens
     where user_id = ${user.id}
       and created_at > now() - interval '1 hour'
  `) as { n: number }[];
  if ((recent?.n ?? 0) >= MAX_REQUESTS_PER_HOUR) {
    console.warn(`Password reset skipped: ${MAX_REQUESTS_PER_HOUR} links already sent this hour`);
    return { status: "rate_limited" };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  await sql`
    insert into password_reset_tokens (token_hash, user_id, expires_at)
    values (
      ${hashToken(token)},
      ${user.id},
      now() + make_interval(mins => ${RESET_TOKEN_TTL_MINUTES})
    )
  `;
  return { status: "issued", token, name: user.name, email: user.email };
}

/**
 * Withdraws a link whose email never went out, so a failed send neither counts
 * toward the hourly limit nor leaves a live token nobody received.
 */
export async function discardResetToken(token: string) {
  if (!token) return;
  await ensureResetSchema();
  const sql = getSql();
  await sql`delete from password_reset_tokens where token_hash = ${hashToken(token)}`;
}

/** Whether a token is still usable, without spending it — for the reset page. */
export async function resetTokenIsValid(token: string) {
  if (!token) return false;
  await ensureResetSchema();
  const sql = getSql();
  const rows = (await sql`
    select 1
      from password_reset_tokens
     where token_hash = ${hashToken(token)}
       and used_at is null
       and expires_at > now()
     limit 1
  `) as unknown[];
  return rows.length > 0;
}

/**
 * Spends the token and sets the new password in one statement, so two
 * submissions of the same link cannot both succeed. Returns the account's
 * email, or null when the token is unknown, used or expired.
 */
export async function resetPassword(
  token: string,
  passwordHash: string,
): Promise<string | null> {
  if (!token) return null;
  await ensureResetSchema();
  const sql = getSql();

  const rows = (await sql`
    with spent as (
      update password_reset_tokens
         set used_at = now()
       where token_hash = ${hashToken(token)}
         and used_at is null
         and expires_at > now()
      returning user_id
    ),
    updated as (
      update users
         set password = ${passwordHash},
             -- The reset link reached their inbox, so the address is proven.
             "emailVerified" = coalesce("emailVerified", now()),
             updated_at = now()
       where id = (select user_id from spent)
      returning id, email
    )
    select id, email from updated
  `) as { id: string; email: string }[];

  const userId = rows[0]?.id;
  if (!userId) return null;

  // Any other link still sitting in their inbox stops working now.
  await sql`
    update password_reset_tokens
       set used_at = now()
     where user_id = ${userId} and used_at is null
  `;
  return rows[0].email;
}
