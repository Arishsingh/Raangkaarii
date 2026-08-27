"use client";

import * as React from "react";
import { upload } from "@vercel/blob/client";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
} as const;

/** Matches maximumSizeInBytes in the upload route. */
const MAX_BYTES = 500 * 1024 * 1024;

function prettySize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Uploads straight from the browser to Vercel Blob. The file never passes
 * through a Server Action, so large clips are not capped by the body limit.
 */
export function MediaUpload({
  kind,
  onUploaded,
}: {
  kind: "image" | "video";
  onUploaded: (url: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const choose = async (file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error(
        `That file is ${prettySize(file.size)}. The limit is ${prettySize(MAX_BYTES)}.`,
      );
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const blob = await upload(`products/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      onUploaded(blob.url);
      toast.success(`Uploaded ${file.name}`);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Upload failed.";
      toast.error(message);
    } finally {
      setBusy(false);
      setProgress(0);
      // Let the same file be picked again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={(event) => choose(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {busy
          ? `Uploading… ${Math.round(progress)}%`
          : `Upload ${kind} from your computer`}
      </Button>
      {busy ? (
        <div
          className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
