#!/usr/bin/env node
/**
 * Imports product photography and clips into public/ and repoints the database
 * at them.
 *
 *   node scripts/import-product-media.mjs ~/Desktop/rangkaarii-media          # dry run
 *   node scripts/import-product-media.mjs ~/Desktop/rangkaarii-media --write  # apply
 *
 * The source folder holds one sub-folder per product, named for its id in
 * admin_products:
 *
 *   rangkaarii-media/
 *     pakistani-style-cotton-base/   IMG_1.jpg  IMG_2.jpg  clip.mp4
 *     dogri-suit-gotta-patti/        front.heic back.jpg
 *
 * Everything is re-encoded on the way in — the originals were multi-megabyte
 * WhatsApp exports, and serving those is what exhausted the Blob transfer
 * allowance in the first place. Output lands in public/products/<id>/, which
 * ships with the build and is served as a static asset: no store to suspend,
 * no per-gigabyte transfer to run out of.
 */
import { execFile } from "node:child_process";
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm"]);

/** Wide enough for the product page at 2x, small enough to stay under ~200 KB. */
const IMAGE_WIDTH = 1200;
/** Cards are at most ~340px wide, so a card never needs the full-size file. */
const VIDEO_WIDTH = 720;

async function encodeImage(from, to) {
  await run("magick", [from, "-auto-orient", "-resize", `${IMAGE_WIDTH}x>`, "-quality", "82", to]);
}

/**
 * H.264 baseline in an MP4 with the index at the front, so the clip starts
 * playing before it has finished downloading. `-an` drops the audio track:
 * these autoplay muted on a card and nothing ever unmutes them.
 */
async function encodeVideo(from, to) {
  await run("ffmpeg", [
    "-y", "-i", from,
    "-vf", `scale='min(${VIDEO_WIDTH},iw)':-2`,
    "-c:v", "libx264", "-profile:v", "main", "-crf", "28", "-preset", "slow",
    "-movflags", "+faststart", "-an",
    to,
  ]);
}

/** A still from one second in — the frame at 0 is often a blur or a black. */
async function posterFrom(video, to) {
  await run("ffmpeg", [
    "-y", "-ss", "1", "-i", video, "-frames:v", "1",
    "-vf", `scale='min(${IMAGE_WIDTH},iw)':-2`, "-quality", "82",
    to,
  ]);
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function sizeOf(file) {
  return (await stat(file)).size;
}

async function importProduct(sourceDir, id, write) {
  const entries = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  const images = entries.filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()));
  const videos = entries.filter((name) => VIDEO_EXT.has(path.extname(name).toLowerCase()));
  if (images.length === 0 && videos.length === 0) return null;

  const outDir = path.join(root, "public", "products", id);
  if (write) await mkdir(outDir, { recursive: true });

  const imageUrls = [];
  const videoUrls = [];
  let saved = 0;
  let after = 0;

  for (const [index, name] of images.entries()) {
    const from = path.join(sourceDir, name);
    const out = path.join(outDir, `${String(index + 1).padStart(2, "0")}.webp`);
    saved += await sizeOf(from);
    if (write) {
      await encodeImage(from, out);
      after += await sizeOf(out);
    }
    imageUrls.push(`/products/${id}/${path.basename(out)}`);
  }

  for (const [index, name] of videos.entries()) {
    const from = path.join(sourceDir, name);
    const out = path.join(outDir, `clip-${index + 1}.mp4`);
    saved += await sizeOf(from);
    if (write) {
      await encodeVideo(from, out);
      after += await sizeOf(out);
    }
    videoUrls.push(`/products/${id}/${path.basename(out)}`);
  }

  /**
   * A clip with no photograph beside it still needs a poster: BannerVideo holds
   * on the poster until the pointer arrives, and without one the card is blank
   * until the shopper happens to hover it.
   */
  if (imageUrls.length === 0 && videoUrls.length > 0) {
    const out = path.join(outDir, "poster.webp");
    if (write) {
      await posterFrom(path.join(outDir, "clip-1.mp4"), out);
      after += await sizeOf(out);
    }
    imageUrls.push(`/products/${id}/poster.webp`);
  }

  return { id, imageUrls, videoUrls, before: saved, after };
}

async function main() {
  const [source, ...flags] = process.argv.slice(2);
  if (!source) {
    console.error("usage: import-product-media.mjs <folder> [--write]");
    process.exit(1);
  }
  const write = flags.includes("--write");

  const folders = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  if (folders.length === 0) {
    console.error(
      `No product folders in ${source}. Expected one sub-folder per product id.`,
    );
    process.exit(1);
  }

  const results = [];
  for (const id of folders) {
    const result = await importProduct(path.join(source, id), id, write);
    if (!result) {
      console.log(`${id}: no usable media, skipped`);
      continue;
    }
    results.push(result);
    console.log(
      `${id}: ${result.imageUrls.length} image(s), ${result.videoUrls.length} clip(s)` +
        (write ? `  ${kb(result.before)} -> ${kb(result.after)}` : "  (dry run)"),
    );
  }

  if (!write) {
    console.log("\nDry run. Re-run with --write to encode and update the database.");
    return;
  }

  // Imported lazily so a dry run never needs DATABASE_URL.
  const { updateProductMedia } = await import("./media-db.mjs");
  for (const result of results) {
    await updateProductMedia(result);
  }
  console.log(`\nUpdated ${results.length} product(s). Commit public/products/.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
