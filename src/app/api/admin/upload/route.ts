import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getAdminUser } from "@/lib/admin";
import {
  IMAGE_TYPES,
  VIDEO_TYPES,
  limitFor,
  typesFor,
  type MediaKind,
} from "@/lib/media-limits";

/**
 * The uploader says which kind it is sending, so the token can be minted for
 * that kind alone. Without it the token would have to allow the largest limit
 * for everything, and a photo could be used to push up a 100 MB file.
 */
function kindFrom(payload: string | null): MediaKind | null {
  return payload === "image" || payload === "video" ? payload : null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      /**
       * This runs on the token request, which carries the browser's cookies —
       * so only the signed-in admin can ever mint an upload token.
       */
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const admin = await getAdminUser();
        if (!admin) throw new Error("Not authorised.");

        // An older client sends no payload; fall back to accepting either.
        const kind = kindFrom(clientPayload);

        return {
          allowedContentTypes: kind
            ? typesFor(kind)
            : [...IMAGE_TYPES, ...VIDEO_TYPES],
          maximumSizeInBytes: kind ? limitFor(kind) : limitFor("video"),
          // Two products named the same must not overwrite each other's media.
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uploadedBy: admin.id }),
        };
      },
      // Blob calls this from its own servers; it cannot reach localhost, and we
      // do not need it — the browser already gets the URL back from `upload()`.
      onUploadCompleted: async () => {},
    });

    return Response.json(result);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Upload failed.";
    console.error("Blob upload failed", caught);
    return Response.json({ error: message }, { status: 400 });
  }
}
