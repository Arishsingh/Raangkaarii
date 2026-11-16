import "server-only";

import { getMongoDb } from "@/lib/mongo";

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
      const failures = (await getMongoDb()).collection("login_failures");
      await Promise.all([
        failures.createIndex({ key: 1, createdAt: 1 }),
        // Old rows count toward nothing; Mongo trims them after a day.
        failures.createIndex({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 }),
      ]);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function failuresCollection() {
  await ensureSchema();
  return (await getMongoDb()).collection("login_failures");
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
  const failures = await failuresCollection();
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);
  const [byEmail, byIp] = await Promise.all([
    failures.countDocuments({ key: emailKey(email), createdAt: { $gt: since } }),
    failures.countDocuments({ key: ipKey(ip), createdAt: { $gt: since } }),
  ]);
  return byEmail >= MAX_FAILURES_PER_EMAIL || byIp >= MAX_FAILURES_PER_IP;
}

export async function recordLoginFailure(email: string, ip: string) {
  const failures = await failuresCollection();
  const createdAt = new Date();
  await failures.insertMany([
    { key: emailKey(email), createdAt },
    { key: ipKey(ip), createdAt },
  ]);
}

/** A correct password clears that address's count, not the IP's. */
export async function clearLoginFailures(email: string) {
  const failures = await failuresCollection();
  await failures.deleteMany({ key: emailKey(email) });
}
