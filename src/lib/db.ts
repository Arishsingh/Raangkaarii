import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";

/**
 * Neon's hostname resolves to several addresses, and a network that can only
 * reach some of them (a phone hotspot behind carrier NAT is the usual cause)
 * leaves Node hanging on a dead one for undici's full 10s connect timeout
 * before it throws `fetch failed`. Whether a page loads then comes down to
 * which address the connection happened to pick.
 *
 * So: fail fast and try again. A short per-attempt budget turns a 10s hang
 * into a quick miss, and each retry gets a fresh pick of the addresses, so a
 * partially reachable network resolves instead of erroring. Three attempts
 * plus backoff is ~9.5s at worst — deliberately kept under the 10s that the
 * single attempt already cost, so nothing gets slower than it was.
 *
 * This is insurance, not a cure. Two of three addresses being unreachable is
 * a fault in the network, and the retry only improves the odds of dodging it.
 */
const ATTEMPT_TIMEOUT_MS = 3_000;
const ATTEMPTS = 3;

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    /**
     * A caller's own signal still wins — this only adds an upper bound, it
     * never extends one that was already set.
     */
    const timeout = AbortSignal.timeout(ATTEMPT_TIMEOUT_MS);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeout])
      : timeout;

    try {
      return await fetch(input, { ...init, signal });
    } catch (error) {
      lastError = error;

      // An abort from the caller is a decision, not a fault worth retrying.
      if (init?.signal?.aborted) throw error;

      // Back off a little so a genuinely down endpoint is not hammered.
      if (attempt < ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

neonConfig.fetchFunction = fetchWithRetry;

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
