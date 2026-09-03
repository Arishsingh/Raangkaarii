/**
 * The database half of import-product-media.mjs, kept separate so a dry run
 * never has to load a driver or find DATABASE_URL.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Scripts run outside Next, which is what normally loads .env.local. */
async function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = await readFile(path.join(root, ".env.local"), "utf8");
  const match = env.match(/^DATABASE_URL="?([^"\n]+)"?$/m);
  if (!match) throw new Error("DATABASE_URL is not set and .env.local has none.");
  return match[1];
}

let sql = null;

/**
 * Points a product's row at the freshly imported files.
 *
 * The first image and first clip stay in `image`/`video` because that is what
 * the cards read; the full lists drive the product page gallery.
 */
export async function updateProductMedia({ id, imageUrls, videoUrls }) {
  sql ??= neon(await databaseUrl());

  const rows = await sql`
    update admin_products
       set image  = ${imageUrls[0] ?? ""},
           video  = ${videoUrls[0] ?? ""},
           images = ${imageUrls}::text[],
           videos = ${videoUrls}::text[]
     where id = ${id}
    returning id
  `;

  if (rows.length === 0) {
    console.warn(`  ! no product row with id "${id}" — files written, nothing repointed`);
  }
}
