#!/usr/bin/env node
/**
 * Turns a folder of Instagram screenshots into unpriced products.
 *
 *   node scripts/import-instagram-shots.mjs ~/Desktop/ig-shots              # dry run
 *   node scripts/import-instagram-shots.mjs ~/Desktop/ig-shots --write      # apply
 *
 * Options:
 *   --crop-top=N      pixels to cut off the top of every shot (status bar, header)
 *   --crop-bottom=N   pixels to cut off the bottom (like/comment bar, tab bar)
 *   --limit=N         import at most N shots (default 200)
 *   --start=N         number the first piece N (default: one past the highest
 *                     numbered piece already in the shop)
 *
 * Shots are taken in filename order — macOS and iPhone screenshot names sort
 * by time — so piece 1 is the first screenshot. Each becomes a product named
 * just its number, priced 0 ("price to be added"): listed in the shop, but not
 * buyable until the admin opens it and sets a price.
 *
 * Photos are re-encoded as WebP (~60–90 KB each) and stored in the media
 * table, the same place admin uploads go. The local site and the live site
 * share one database, so a photo kept in public/ instead would show broken on
 * the live site until the next deploy; in the database it is live the moment
 * the row is. 200 of them come to roughly 15 MB of the 0.5 GB plan.
 */
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const args = process.argv.slice(2);
const source = args.find((arg) => !arg.startsWith("--"));
const write = args.includes("--write");
const option = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const value = Number(hit.split("=")[1]);
  if (!Number.isInteger(value) || value < 0) throw new Error(`--${name} must be a whole number`);
  return value;
};
const cropTop = option("crop-top", 0);
const cropBottom = option("crop-bottom", 0);
const limit = option("limit", 200);

if (!source) {
  console.error("usage: node scripts/import-instagram-shots.mjs <folder> [--write] [--crop-top=N] [--crop-bottom=N]");
  process.exit(1);
}

async function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = await readFile(path.join(root, ".env.local"), "utf8");
  const match = env.match(/^DATABASE_URL="?([^"\n]+)"?$/m);
  if (!match) throw new Error("DATABASE_URL is not set and .env.local has none.");
  return match[1];
}

async function encode(from, to) {
  const crop =
    cropTop || cropBottom
      ? ["-gravity", "North", "-chop", `0x${cropTop}`, "-gravity", "South", "-chop", `0x${cropBottom}`, "+repage"]
      : [];
  await run("magick", [
    from,
    "-auto-orient",
    ...crop,
    "-resize", "1200x>",
    "-strip",
    "-quality", "82",
    to,
  ]);
}

const files = (await readdir(source))
  .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()) && !name.startsWith("."))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .slice(0, limit);

if (files.length === 0) {
  console.error(`No images in ${source}`);
  process.exit(1);
}

let sql = null;
let start = option("start", -1);
if (write || start < 0) {
  const { neon } = await import("@neondatabase/serverless");
  sql = neon(await databaseUrl());
}
if (start < 0) {
  // Carry on from the highest piece already numbered, so a second batch
  // never reuses a name.
  const [row] = await sql`
    select coalesce(max(name::int), 0) as top
      from admin_products where name ~ '^[0-9]+$'
  `;
  start = Number(row.top) + 1;
}

console.log(`${files.length} shot(s) → pieces ${start}–${start + files.length - 1}${write ? "" : "  (dry run — add --write to apply)"}`);
if (cropTop || cropBottom) console.log(`cropping ${cropTop}px top, ${cropBottom}px bottom`);

const scratch = await mkdtemp(path.join(os.tmpdir(), "ig-import-"));
const now = Date.now();
let bytes = 0;

for (const [index, file] of files.entries()) {
  const number = start + index;
  const id = `ig-${number}`;

  if (!write) {
    console.log(`  ${file} → ${number}`);
    continue;
  }

  const out = path.join(scratch, `${number}.webp`);
  await encode(path.join(source, file), out);
  const data = await readFile(out);
  const size = data.byteLength;
  bytes += size;

  // Random, like an admin upload: the URL is cached forever once served.
  const mediaId = crypto.randomBytes(16).toString("hex");
  const url = `/api/media/${mediaId}`;
  await sql`
    insert into media (id, filename, content_type, size, bytes)
    values (${mediaId}, ${file}, 'image/webp', ${size}, ${`\\x${data.toString("hex")}`}::bytea)
  `;

  /**
   * Newest first is how the shop lists admin pieces, so piece 1 gets the
   * latest timestamp and leads the grid — the same order as the feed.
   */
  const createdAt = new Date(now - index * 1000).toISOString();
  await sql`
    insert into admin_products (
      id, name, blurb, price, compare_at, image, video, images, videos, alt,
      category, collections, sizes, badges, in_stock, created_at
    ) values (
      ${id}, ${String(number)}, '', 0, null, ${url}, '', ${[url]}::text[], '{}'::text[],
      ${`Rangkaarii piece ${number}`}, '', '{}'::text[], ${DEFAULT_SIZES}::text[],
      '{}'::text[], true, ${createdAt}
    )
    on conflict (id) do update set image = excluded.image, images = excluded.images
  `;
  console.log(`  ${file} → ${number}  ${Math.round(size / 1024)} KB`);
}

await rm(scratch, { recursive: true, force: true });
if (write) {
  console.log(`done — ${files.length} piece(s), ${(bytes / 1024 / 1024).toFixed(1)} MB of photos stored`);
}
