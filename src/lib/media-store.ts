import "server-only";

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

export async function getMedia(id: string): Promise<StoredMedia | null> {
  if (!isDatabaseConfigured()) return null;
  await ensureMediaSchema();
  const sql = getSql();
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
