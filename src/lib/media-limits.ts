/**
 * What the admin panel accepts for product media, in one place — the uploader
 * and the route that mints its token have to agree, and they used to hold
 * separate copies of these numbers.
 */
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export type MediaKind = "image" | "video";

/**
 * Sized against the storage the shop actually has, rather than against what a
 * browser could technically send.
 *
 * Media lives in the database now (see src/lib/media-store.ts), and the Neon
 * free plan holds 0.5 GB for everything — orders and catalogue included. A
 * 25 MB ceiling leaves room for a catalogue of clips; a WhatsApp or Instagram
 * clip of a garment is a few megabytes, and anything far above this is an
 * editing export rather than something meant for the web.
 *
 * These are also what a request can carry through a function comfortably: the
 * bytes pass through the upload route now instead of going straight to a
 * storage service.
 */
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function limitFor(kind: MediaKind) {
  return kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

export function typesFor(kind: MediaKind) {
  return kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
}

export function prettySize(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
