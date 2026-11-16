import "server-only";

import crypto from "node:crypto";

import { ObjectId } from "mongodb";

import { getMongoDb } from "@/lib/mongo";
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
      const db = await getMongoDb();
      const tokens = db.collection("password_reset_tokens");
      await Promise.all([
        tokens.createIndex({ tokenHash: 1 }, { unique: true }),
        tokens.createIndex({ userId: 1, createdAt: 1 }),
        // Mongo deletes the row a day after it expires; nothing reads it then.
        tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 }),
      ]);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function tokensCollection() {
  return (await getMongoDb()).collection("password_reset_tokens");
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

  const tokens = await tokensCollection();
  const recent = await tokens.countDocuments({
    userId: user.id,
    createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (recent >= MAX_REQUESTS_PER_HOUR) {
    console.warn(`Password reset skipped: ${MAX_REQUESTS_PER_HOUR} links already sent this hour`);
    return { status: "rate_limited" };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  await tokens.insertOne({
    tokenHash: hashToken(token),
    userId: user.id,
    expiresAt: new Date(now + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    usedAt: null,
    createdAt: new Date(now),
  });
  return { status: "issued", token, name: user.name, email: user.email };
}

/**
 * Withdraws a link whose email never went out, so a failed send neither counts
 * toward the hourly limit nor leaves a live token nobody received.
 */
export async function discardResetToken(token: string) {
  if (!token) return;
  await ensureResetSchema();
  await (await tokensCollection()).deleteOne({ tokenHash: hashToken(token) });
}

/** Whether a token is still usable, without spending it — for the reset page. */
export async function resetTokenIsValid(token: string) {
  if (!token) return false;
  await ensureResetSchema();
  const found = await (await tokensCollection()).findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return Boolean(found);
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
  const tokens = await tokensCollection();

  // One atomic update: two submissions of the same link cannot both match.
  const spent = await tokens.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  );
  if (!spent) return null;

  const db = await getMongoDb();
  const userId = new ObjectId(String(spent.userId));
  const user = await db.collection("users").findOneAndUpdate(
    { _id: userId },
    { $set: { password: passwordHash } },
    { returnDocument: "after" },
  );
  if (!user) return null;

  // The reset link reached their inbox, so the address is proven.
  await db
    .collection("users")
    .updateOne({ _id: userId, emailVerified: null }, { $set: { emailVerified: new Date() } });

  // Any other link still sitting in their inbox stops working now.
  await tokens.updateMany(
    { userId: String(userId), usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  return String(user.email);
}
