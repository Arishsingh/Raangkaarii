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
 *
 * The budget was 3s, which a healthy but slow link misses on its own: over a
 * phone hotspot a fresh connection takes 2–2.6s to answer even `select 1`, so
 * any spike failed all three attempts and the shop rendered without its
 * products. 6s still cuts a dead address off well short of undici's 10s.
 */
const ATTEMPT_TIMEOUT_MS = 6_000;
const ATTEMPTS = 3;

/**
 * When Neon answers 402 (plan quota exceeded) it will keep answering 402 for
 * every query until the plan is upgraded. A page makes several queries, each a
 * network round trip to be refused, which is most of why the site crawls in
 * that state. Remember the refusal for a short while and fail the next queries
 * instantly, with the same error, instead of asking again.
 */
const QUOTA_BACKOFF_MS = 30_000;
let quotaRefusedUntil = 0;

function quotaError() {
  return new Error(
    "Server error (HTTP status 402): Your account or project has exceeded the quota. Upgrade your plan to increase limits.",
  );
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  if (Date.now() < quotaRefusedUntil) throw quotaError();
  let lastError: unknown;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    /**
     * The budget covers reaching the database and getting its answer started
     * — the part a dead address hangs on — and is lifted once the response
     * headers arrive. It used to cover the body too, which cut off every
     * product photo mid-download on a slow link: a few hundred KB of bytea
     * takes longer than 3s over a phone hotspot even when nothing is wrong.
     *
     * A caller's own signal still wins — this only adds an upper bound, it
     * never extends one that was already set.
     */
    const timeout = new AbortController();
    const timer = setTimeout(
      () => timeout.abort(new DOMException("Timed out", "TimeoutError")),
      ATTEMPT_TIMEOUT_MS,
    );
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeout.signal])
      : timeout.signal;

    try {
      const response = await fetch(input, { ...init, signal });
      clearTimeout(timer);
      if (response.status === 402) quotaRefusedUntil = Date.now() + QUOTA_BACKOFF_MS;
      else quotaRefusedUntil = 0;
      return response;
    } catch (error) {
      clearTimeout(timer);
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

/**
 * Last-known-good copies of the storefront's reads, for when the database
 * cannot be reached at all.
 *
 * A weak link (a phone hotspot, a flaky café network) does not only slow the
 * database down; now and then it drops it for a stretch, and every retry above
 * fails. Rendering the shop empty in that moment is worse than rendering it
 * as it was a minute ago, so each read that goes through here keeps its last
 * successful result — in memory, and on disk so a restart keeps it too — and
 * serves that copy when a fresh read fails.
 *
 * Only for reads whose staleness is harmless (the catalogue, homepage picks,
 * feedback). Never for anything that decides money or stock at checkout.
 */
const lastGood = new Map<string, unknown>();

async function diskPath(key: string) {
  const [{ default: os }, { default: path }] = await Promise.all([
    import("node:os"),
    import("node:path"),
  ]);
  return path.join(os.tmpdir(), "rangkaarii-cache", `${key.replace(/[^a-z0-9-]/gi, "_")}.json`);
}

async function saveLastGood(key: string, value: unknown) {
  lastGood.set(key, value);
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    const file = await diskPath(key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value));
  } catch {
    // Best effort: memory still holds it.
  }
}

async function loadLastGood<T>(key: string): Promise<T | undefined> {
  if (lastGood.has(key)) return lastGood.get(key) as T;
  try {
    const { readFile } = await import("node:fs/promises");
    const value = JSON.parse(await readFile(await diskPath(key), "utf8")) as T;
    lastGood.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

/**
 * Fresh-copy cache in front of the reads above. Without it every page view
 * pays a database round trip (0.4–2s on a slow link) for data that changes
 * only when the admin saves something.
 *
 * Stale-while-revalidate: within FRESH_MS the stored copy is returned with no
 * query; after that it is still returned immediately while one background
 * refresh runs. Admin writes call `invalidateReads()` so edits show at once.
 */
const FRESH_MS = 30_000;
const fresh = new Map<string, { value: unknown; at: number }>();
const refreshing = new Set<string>();

export function invalidateReads() {
  fresh.clear();
}

/**
 * Runs a read; on success remembers it, on failure falls back to the last
 * good copy, and only when there is none does it log and return `empty`.
 */
export async function readWithFallback<T>(
  key: string,
  read: () => Promise<T>,
  empty: T,
  label: string,
): Promise<T> {
  const run = async (): Promise<T> => {
    try {
      const value = await read();
      fresh.set(key, { value, at: Date.now() });
      void saveLastGood(key, value);
      return value;
    } catch (error) {
      const saved = await loadLastGood<T>(key);
      if (saved !== undefined) {
        // Serve the fallback for a few seconds before retrying, so a dead
        // database costs one failed attempt per window, not one per request.
        fresh.set(key, { value: saved, at: Date.now() - FRESH_MS + 10_000 });
        console.warn(`${label}: database unreachable, showing the last copy that loaded.`);
        return saved;
      }
      // Nothing saved to fall back on: remember the empty answer briefly so a
      // page's many reads do not each pay for a failed round trip.
      fresh.set(key, { value: empty, at: Date.now() - FRESH_MS + 10_000 });
      if (isQuotaError(error)) {
        // Expected while the plan is over its limit; the admin panel explains
        // it. A warning keeps it out of the browser's error overlay.
        console.warn(`${label}: database over its plan quota (upgrade needed).`);
      } else {
        console.error(label, error);
      }
      return empty;
    }
  };

  const hit = fresh.get(key);
  if (hit) {
    if (Date.now() - hit.at > FRESH_MS && !refreshing.has(key)) {
      refreshing.add(key);
      void run().finally(() => refreshing.delete(key));
    }
    return hit.value as T;
  }
  return run();
}

/**
 * Is the database usable right now? Used by the admin panel to say so plainly
 * instead of failing with a stack trace.
 *
 * "quota" is Neon refusing every query with HTTP 402 because the project went
 * over its plan's limits — the data is still there, but nothing can read or
 * write it until the plan is upgraded.
 */
export type DatabaseStatus = "ok" | "quota" | "down";

export function isQuotaError(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${String((error as { status?: unknown }).status ?? "")}` : String(error);
  return /exceeded the quota|HTTP status 402|\b402\b/i.test(text);
}

let statusCache: { status: DatabaseStatus; at: number } | null = null;

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (statusCache && Date.now() - statusCache.at < 30_000) return statusCache.status;
  let status: DatabaseStatus = "ok";
  try {
    await getSql()`select 1`;
  } catch (error) {
    status = isQuotaError(error) ? "quota" : "down";
  }
  statusCache = { status, at: Date.now() };
  return status;
}

/** Logs a failed read; a quota refusal is a one-line warning, anything else a full error. */
export function logDbError(label: string, error: unknown) {
  if (isQuotaError(error)) console.warn(`${label}: database over its plan quota (upgrade needed).`);
  else console.error(label, error);
}
