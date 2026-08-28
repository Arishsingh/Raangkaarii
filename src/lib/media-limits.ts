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
 * Sized against the storage plan rather than against what a browser could
 * technically send. Blob on Hobby holds 1 GB in total, so a single 500 MB
 * upload — the old cap — would have taken half the store for one clip.
 *
 * A minute of 1080p H.264 at a sensible quality lands near 55 MB and 720p near
 * 25 MB, so 100 MB is roomy for a product clip while leaving space for a
 * catalogue. Anything far above it is an editing export, not a web video.
 */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

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
