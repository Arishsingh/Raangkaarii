import "server-only";

import { MongoClient } from "mongodb";

/**
 * MongoDB Atlas, used for accounts only: users, linked Google accounts,
 * password-reset tokens and login lockouts. Products, orders and media stay
 * in Postgres (see db.ts).
 *
 * One client per process, kept on globalThis so dev hot-reloads don't open a
 * new connection pool each time. Lazy, so `next build` never needs the URI.
 */
const globalForMongo = globalThis as unknown as {
  __mongoClient?: Promise<MongoClient>;
};

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo.__mongoClient) {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error("MONGODB_URI is not set.");
    const client = new MongoClient(uri, {
      // Fail fast on a bad network instead of hanging a page for 30s.
      serverSelectionTimeoutMS: 8_000,
      connectTimeoutMS: 8_000,
      maxPoolSize: 5,
    });
    globalForMongo.__mongoClient = client.connect().catch((error) => {
      globalForMongo.__mongoClient = undefined;
      throw error;
    });
  }
  return globalForMongo.__mongoClient;
}

// Trimmed: a stray space pasted into the host's settings becomes part of the name.
export const MONGODB_DB = process.env.MONGODB_DB?.trim() || "raangkaari";

export async function getMongoDb() {
  return (await getMongoClient()).db(MONGODB_DB);
}
