import "server-only";

import { clientIp } from "@/lib/login-limit";
import { getMongoDb } from "@/lib/mongo";

/**
 * A small per-IP limiter for public endpoints, backed by the same Mongo
 * database as the login lockout. Each hit is a row; Mongo trims rows after an
 * hour. It fails open: if the store is down, the endpoint still works rather
 * than the shop going dark with it.
 */
let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const hits = (await getMongoDb()).collection("rate_hits");
      await Promise.all([
        hits.createIndex({ key: 1, createdAt: 1 }),
        hits.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 }),
      ]);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/**
 * Counts this request against `bucket` for the caller's IP. Returns a 429
 * Response when the caller is over `max` in `windowSeconds`, otherwise null.
 * The window must be an hour or less (the TTL above).
 */
export async function rateLimit(
  request: Request,
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<Response | null> {
  try {
    await ensureSchema();
    const hits = (await getMongoDb()).collection("rate_hits");
    const key = `${bucket}:${clientIp(request)}`;
    const since = new Date(Date.now() - windowSeconds * 1000);
    const used = await hits.countDocuments({ key, createdAt: { $gt: since } });
    if (used >= max) {
      return Response.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(windowSeconds) } },
      );
    }
    await hits.insertOne({ key, createdAt: new Date() });
  } catch (caught) {
    console.error("Rate limiter unavailable", caught);
  }
  return null;
}
