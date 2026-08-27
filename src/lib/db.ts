import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Lazy so `next build` never evaluates `neon()` before DATABASE_URL exists —
 * top-level module code runs at build time and would otherwise throw.
 */
let client: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    client = neon(url);
  }
  return client;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
