import "server-only";

import { getSql } from "@/lib/db";

/**
 * Throttles password guessing.
 *
 * Every wrong password is recorded twice: against the address being tried and
 * against the IP trying it. Too many of either within the window and sign-in is
 * refused before the password is even checked — so a locked account stays
 * locked even if the next guess happens to be right.
 *
 * Per address stops someone hammering one customer's account; per IP stops one
 * machine spraying a common password across many addresses. The IP limit is
 * higher because a shop, office or mobile carrier can put many honest
 * customers behind one address.
 */
export const LOGIN_WINDOW_MINUTES = 15;
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 20;

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        create table if not exists login_failures (
          key        text not null,
          created_at timestamptz not null default now()
        )
      `;
      await sql`
        create index if not exists login_failures_key_idx
          on login_failures (key, created_at)
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

const emailKey = (email: string) => `email:${email.trim().toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

/**
 * The caller's IP as the host reports it. On Vercel the first
 * x-forwarded-for entry is set by the platform and cannot be spoofed by the
 * client; elsewhere it is only as trustworthy as the proxy in front.
 */
export function clientIp(request: Request | undefined) {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request?.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function loginIsBlocked(email: string, ip: string) {
  await ensureSchema();
  const sql = getSql();
  const [row] = (await sql`
    select
      count(*) filter (where key = ${emailKey(email)})::int as by_email,
      count(*) filter (where key = ${ipKey(ip)})::int       as by_ip
      from login_failures
     where key in (${emailKey(email)}, ${ipKey(ip)})
       and created_at > now() - make_interval(mins => ${LOGIN_WINDOW_MINUTES})
  `) as { by_email: number; by_ip: number }[];
  return (row?.by_email ?? 0) >= MAX_FAILURES_PER_EMAIL || (row?.by_ip ?? 0) >= MAX_FAILURES_PER_IP;
}

export async function recordLoginFailure(email: string, ip: string) {
  await ensureSchema();
  const sql = getSql();
  await sql`
    insert into login_failures (key) values (${emailKey(email)}), (${ipKey(ip)})
  `;
  // Old rows only ever count toward nothing; trim them as we go.
  await sql`delete from login_failures where created_at < now() - interval '1 day'`;
}

/** A correct password clears that address's count, not the IP's. */
export async function clearLoginFailures(email: string) {
  await ensureSchema();
  const sql = getSql();
  await sql`delete from login_failures where key = ${emailKey(email)}`;
}
