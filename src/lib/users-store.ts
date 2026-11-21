import "server-only";

import { ObjectId, type Document } from "mongodb";

import { getMongoDb, isMongoConfigured } from "@/lib/mongo";

/**
 * Accounts live in MongoDB Atlas, in the collections `@auth/mongodb-adapter`
 * expects: `users`, `accounts`, `sessions`, `verification_tokens`.
 *
 * `users.password` is our own addition: the adapter never writes it (an OAuth
 * user has no password at all), and the credentials provider is the only thing
 * that reads it. A user's sign-up time is the timestamp inside its ObjectId.
 *
 * Indexes are created on first use, like the tables were before — there is no
 * migration step to run, and creating an existing index is a no-op.
 */
let schemaReady: Promise<void> | null = null;

export function ensureAuthSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = await getMongoDb();
      await Promise.all([
        db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
        // One row per provider account, so a replayed OAuth callback cannot
        // link the same Google account twice.
        db
          .collection("accounts")
          .createIndex({ provider: 1, providerAccountId: 1 }, { unique: true }),
        db.collection("accounts").createIndex({ userId: 1 }),
      ]);
    })().catch((error) => {
      // Let the next call retry rather than caching a failed setup.
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export type AccountUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  password: string | null;
  /** When the address was proven, by an emailed link or by Google; null until then. */
  emailVerified: Date | null;
};

/** Emails are stored and compared lowercased, so a lookup can never miss on case. */
export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function toAccountUser(doc: Document): AccountUser {
  return {
    id: String(doc._id),
    name: doc.name ?? null,
    email: doc.email,
    image: doc.image ?? null,
    password: doc.password ?? null,
    emailVerified: doc.emailVerified ?? null,
  };
}

/** Whether this address was proven (Google asserted it, or a reset link reached it). */
export async function emailIsVerified(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return Boolean(user?.emailVerified);
}

export async function findUserByEmail(email: string): Promise<AccountUser | null> {
  await ensureAuthSchema();
  const db = await getMongoDb();
  const doc = await db.collection("users").findOne({ email: normaliseEmail(email) });
  return doc ? toAccountUser(doc) : null;
}

/**
 * Writes a credentials user. The password arrives already hashed — this module
 * never sees a plaintext one, and there is no code path that stores it.
 */
export async function createCredentialsUser(input: {
  email: string;
  passwordHash: string;
  name: string | null;
}): Promise<AccountUser | null> {
  await ensureAuthSchema();
  const db = await getMongoDb();
  const doc = {
    _id: new ObjectId(),
    name: input.name,
    email: normaliseEmail(input.email),
    image: null,
    password: input.passwordHash,
    emailVerified: null,
  };
  try {
    await db.collection("users").insertOne(doc);
  } catch (error) {
    // Duplicate key: the email was taken between the check and the write.
    if ((error as { code?: number }).code === 11000) return null;
    throw error;
  }
  return toAccountUser(doc);
}

export type SiteMember = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  createdAt: number;
  /** Providers this account can sign in with, e.g. ['password', 'google']. */
  providers: string[];
};

export type UserStats = {
  total: number;
  newThisWeek: number;
  newThisMonth: number;
  withGoogle: number;
  recent: SiteMember[];
  error: string | null;
};

const RECENT_LIMIT = 10;

const EMPTY_STATS: UserStats = {
  total: 0,
  newThisWeek: 0,
  newThisMonth: 0,
  withGoogle: 0,
  recent: [],
  error: null,
};

/** Reads degrade to zeroes so the panel renders before the first sign-up. */
export async function getUserStats(): Promise<UserStats> {
  if (!isMongoConfigured()) {
    return { ...EMPTY_STATS, error: "MONGODB_URI is not set." };
  }

  try {
    await ensureAuthSchema();
    const db = await getMongoDb();
    const users = db.collection("users");

    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    // ObjectIds sort by creation time, so a boundary id gives "newer than".
    const since = (ms: number) => ObjectId.createFromTime(Math.floor((now - ms) / 1000));

    const [total, newThisWeek, newThisMonth, googleIds, docs] = await Promise.all([
      users.countDocuments(),
      users.countDocuments({ _id: { $gte: since(7 * day) } }),
      users.countDocuments({ _id: { $gte: since(30 * day) } }),
      db.collection("accounts").distinct("userId", { provider: "google" }),
      users.find().sort({ _id: -1 }).limit(RECENT_LIMIT).toArray(),
    ]);

    const recentIds = docs.map((doc) => doc._id);
    const linked = await db
      .collection("accounts")
      .find({ userId: { $in: recentIds } }, { projection: { userId: 1, provider: 1 } })
      .toArray();
    const providersFor = new Map<string, Set<string>>();
    for (const row of linked) {
      const key = String(row.userId);
      if (!providersFor.has(key)) providersFor.set(key, new Set());
      providersFor.get(key)!.add(String(row.provider));
    }

    /**
     * A person can hold both a password and a linked Google account, so the
     * providers are aggregated rather than picked — "password" is inferred
     * from the field rather than a row.
     */
    const recent: SiteMember[] = docs.map((doc) => ({
      id: String(doc._id),
      name: doc.name || "Unnamed",
      email: doc.email ?? "—",
      imageUrl: doc.image ?? "",
      createdAt: doc._id.getTimestamp().getTime(),
      providers: [
        ...(doc.password ? ["password"] : []),
        ...(providersFor.get(String(doc._id)) ?? []),
      ],
    }));

    return {
      total,
      newThisWeek,
      newThisMonth,
      withGoogle: googleIds.length,
      recent,
      error: null,
    };
  } catch (caught) {
    console.error("Could not load user stats", caught);
    return { ...EMPTY_STATS, error: "Could not read accounts from the database." };
  }
}
