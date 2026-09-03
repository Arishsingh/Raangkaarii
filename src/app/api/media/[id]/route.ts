import { getMedia } from "@/lib/media-store";

/**
 * Serves one stored file.
 *
 * Public on purpose: a product photo is public, and the storefront shows the
 * range to signed-out visitors. Only prices and the product pages are gated.
 *
 * Ids are random and a file is never rewritten under one, so the response can
 * be cached immutably — Postgres is read roughly once per file and the CDN
 * serves every request after that.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/media/[id]">,
) {
  const { id } = await params;

  let media;
  try {
    media = await getMedia(id);
  } catch (caught) {
    console.error("Could not read media", caught);
    return new Response("Could not read this file.", { status: 500 });
  }

  if (!media) return new Response("Not found.", { status: 404 });

  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${media.id}"`,
    },
  });
}
