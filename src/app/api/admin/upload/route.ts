import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getAdminUser } from "@/lib/admin";

/** Kept in step with the `accept` attributes on the admin form's file inputs. */
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/** Vercel Functions cap request bodies, but client uploads go straight to Blob. */
const MAX_BYTES = 500 * 1024 * 1024;

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
      onBeforeGenerateToken: async () => {
        const admin = await getAdminUser();
        if (!admin) throw new Error("Not authorised.");

        return {
          allowedContentTypes: [...IMAGE_TYPES, ...VIDEO_TYPES],
          maximumSizeInBytes: MAX_BYTES,
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
