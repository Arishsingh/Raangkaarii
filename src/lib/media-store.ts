import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getSql, isDatabaseConfigured } from "@/lib/db";

/**
 * Product media, kept in Postgres.
 *
 * It used to live in Vercel Blob. That store is suspended once an account
 * passes its free allowance, and a suspended store serves 403 to everyone —
 * every photo on the site became a grey tile at once, with nothing the app
 * could do about it. The database is storage we already have, so the media
 * lives beside the products it belongs to and cannot be switched off
 * separately from them.
 *
 * Reads are cached hard at the CDN (see /api/media/[id]), so a file is fetched
 * out of Postgres roughly once and served from the edge after that.
 */
export type StoredMedia = {
  id: string;
  contentType: string;
  size: number;
  bytes: Buffer;
};

let schemaReady: Promise<void> | null = null;

export function ensureMediaSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        create table if not exists media (
          id           text primary key,
          filename     text not null default '',
          content_type text not null,
          size         integer not null,
          bytes        bytea not null,
          created_at   timestamptz not null default now()
        )
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/**
 * Postgres wants bytea as a hex literal over this driver, and hands it back as
 * a Buffer. Both directions are exact — a byte-for-byte round trip was checked
 * against real files before this replaced Blob.
 */
function toHex(bytes: Buffer) {
  return `\\x${bytes.toString("hex")}`;
}

export async function saveMedia(input: {
  id: string;
  filename: string;
  contentType: string;
  bytes: Buffer;
}) {
  await ensureMediaSchema();
  const sql = getSql();
  await sql`
    insert into media (id, filename, content_type, size, bytes)
    values (
      ${input.id}, ${input.filename}, ${input.contentType},
      ${input.bytes.byteLength}, ${toHex(input.bytes)}::bytea
    )
  `;
}

/**
 * Files never change under an id, so a copy held in memory is always right.
 * The CDN does this job in production; locally — and on a cold instance — it
 * stops a page of cards re-pulling every photo out of Postgres, which is the
 * slow part over a weak connection. Bounded, oldest out first.
 */
const CACHE_LIMIT_BYTES = 150 * 1024 * 1024;
const cache = new Map<string, StoredMedia>();
let cachedBytes = 0;
/** A card grid asks for the same file several times at once; fetch it once. */
const inFlight = new Map<string, Promise<StoredMedia | null>>();

function remember(media: StoredMedia) {
  if (media.size > CACHE_LIMIT_BYTES / 4) return;
  cache.set(media.id, media);
  cachedBytes += media.size;
  for (const [key, entry] of cache) {
    if (cachedBytes <= CACHE_LIMIT_BYTES) break;
    cache.delete(key);
    cachedBytes -= entry.size;
  }
}

async function readMedia(id: string): Promise<StoredMedia | null> {
  await ensureMediaSchema();
  const sql = getSql();
  /**
   * The connection can drop partway through a large body ("terminated"),
   * which the fetch-level retry cannot see — the headers had already arrived.
   * So the whole read is retried here as well.
   */
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rows = (await sql`
        select id, content_type, size, bytes from media where id = ${id} limit 1
      `) as { id: string; content_type: string; size: number; bytes: Buffer }[];
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        contentType: row.content_type,
        size: row.size,
        bytes: Buffer.from(row.bytes),
      };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * A second, on-disk copy, so restarting the dev server does not send every
 * photo back across a slow connection. Best effort only: a read-only or
 * missing temp directory just means memory and the database carry on alone.
 */
const DISK_DIR = path.join(os.tmpdir(), "rangkaarii-media");
const SAFE_ID = /^[a-f0-9]{32}$/;

async function fromDisk(id: string): Promise<StoredMedia | null> {
  if (!SAFE_ID.test(id)) return null;
  try {
    const [meta, bytes] = await Promise.all([
      readFile(path.join(DISK_DIR, `${id}.json`), "utf8"),
      readFile(path.join(DISK_DIR, `${id}.bin`)),
    ]);
    const { contentType } = JSON.parse(meta) as { contentType: string };
    return { id, contentType, size: bytes.byteLength, bytes };
  } catch {
    return null;
  }
}

async function toDisk(media: StoredMedia) {
  if (!SAFE_ID.test(media.id)) return;
  try {
    await mkdir(DISK_DIR, { recursive: true });
    // Bytes first: the metadata file is what marks the copy as complete.
    await writeFile(path.join(DISK_DIR, `${media.id}.bin`), media.bytes);
    await writeFile(
      path.join(DISK_DIR, `${media.id}.json`),
      JSON.stringify({ contentType: media.contentType }),
    );
  } catch {
    // Not worth failing a response over.
  }
}

export async function getMedia(id: string): Promise<StoredMedia | null> {
  if (!isDatabaseConfigured()) return null;

  const hit = cache.get(id);
  if (hit) {
    // Refresh its place so a popular file is the last to be evicted.
    cache.delete(id);
    cache.set(id, hit);
    return hit;
  }

  let pending = inFlight.get(id);
  if (!pending) {
    pending = (async () => {
      const saved = await fromDisk(id);
      if (saved) return saved;
      const media = await readMedia(id);
      if (media) void toDisk(media);
      return media;
    })().finally(() => inFlight.delete(id));
    inFlight.set(id, pending);
  }
  const media = await pending;
  if (media && !cache.has(media.id)) remember(media);
  return media;
}

/** How much of the database the catalogue's media is using. */
export async function getMediaUsage() {
  if (!isDatabaseConfigured()) return { count: 0, bytes: 0 };
  try {
    await ensureMediaSchema();
    const sql = getSql();
    const [row] = (await sql`
      select count(*)::int as count, coalesce(sum(size), 0)::bigint as bytes from media
    `) as { count: number; bytes: string | number }[];
    return { count: row?.count ?? 0, bytes: Number(row?.bytes ?? 0) };
  } catch (caught) {
    console.error("Could not read media usage", caught);
    return { count: 0, bytes: 0 };
  }
}
