import crypto from "node:crypto";

import { getAdminUser } from "@/lib/admin";
import { saveMedia } from "@/lib/media-store";
import {
  limitFor,
  prettySize,
  typesFor,
  type MediaKind,
} from "@/lib/media-limits";

/**
 * Takes one file from the admin panel and stores it in the database.
 *
 * The file is posted as the raw request body rather than a form: there is one
 * file per request, and this way nothing has to buffer a multipart parse on top
 * of the bytes themselves.
 *
 * Media used to go straight from the browser to Vercel Blob, which is why this
 * route only minted a token. Blob suspends a store that passes its free
 * allowance — and a suspended store 403s every photo on the site — so the bytes
 * now come through here instead. See src/lib/media-store.ts.
 */
export const maxDuration = 300;

function kindFrom(value: string | null): MediaKind | null {
  return value === "image" || value === "video" ? value : null;
}

export async function POST(request: Request) {
  if (!(await getAdminUser())) {
    return Response.json({ error: "Not authorised." }, { status: 403 });
  }

  const kind = kindFrom(request.headers.get("x-media-kind"));
  if (!kind) {
    return Response.json({ error: "Unknown media kind." }, { status: 400 });
  }

  const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!typesFor(kind).includes(contentType)) {
    return Response.json(
      { error: `${contentType || "That file type"} cannot be used as a ${kind}.` },
      { status: 415 },
    );
  }

  const limit = limitFor(kind);
  /**
   * Checked before reading the body where the browser declares a length, so an
   * oversized file is refused rather than transferred and then thrown away.
   */
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit) {
    return Response.json(
      { error: `That file is ${prettySize(declared)}. The limit is ${prettySize(limit)}.` },
      { status: 413 },
    );
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await request.arrayBuffer());
  } catch (caught) {
    console.error("Could not read the uploaded file", caught);
    return Response.json({ error: "Could not read the file." }, { status: 400 });
  }

  if (bytes.byteLength === 0) {
    return Response.json({ error: "That file is empty." }, { status: 400 });
  }
  /**
   * A body can arrive short — a dropped connection, or a layer in front that
   * buffers and truncates. Storing it anyway would mean a half-written clip
   * that plays for a second and stops, with nothing to show why.
   */
  if (declared > 0 && bytes.byteLength !== declared) {
    console.error(
      `Upload truncated: expected ${declared} bytes, received ${bytes.byteLength}`,
    );
    return Response.json(
      { error: "The file did not arrive in one piece. Please try again." },
      { status: 400 },
    );
  }
  // The header is the browser's claim; this is the file.
  if (bytes.byteLength > limit) {
    return Response.json(
      { error: `That file is ${prettySize(bytes.byteLength)}. The limit is ${prettySize(limit)}.` },
      { status: 413 },
    );
  }

  // Sent percent-encoded, because a header cannot carry an arbitrary filename.
  let filename = "";
  try {
    filename = decodeURIComponent(request.headers.get("x-file-name") ?? "").slice(0, 200);
  } catch {
    // A malformed name is not worth failing an upload over; it is only a label.
  }

  /**
   * Random, so the URL is unguessable and — more to the point — so replacing a
   * product's photo never reuses a URL that browsers and the CDN have been told
   * to cache forever.
   */
  const id = crypto.randomBytes(16).toString("hex");

  try {
    await saveMedia({ id, filename, contentType, bytes });
  } catch (caught) {
    console.error("Could not store the media", caught);
    return Response.json({ error: "Could not save the file." }, { status: 500 });
  }

  return Response.json({ url: `/api/media/${id}`, size: bytes.byteLength });
}
