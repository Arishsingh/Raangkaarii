"use client";

import * as React from "react";
import { upload } from "@vercel/blob/client";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  limitFor,
  prettySize,
  typesFor,
  type MediaKind,
} from "@/lib/media-limits";
import { checkVideoCodec } from "@/lib/video-codec";

/**
 * Uploads straight from the browser to Vercel Blob. The file never passes
 * through a Server Action, so large clips are not capped by the body limit.
 */
export function MediaUpload({
  kind,
  onUploaded,
}: {
  kind: MediaKind;
  onUploaded: (url: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  /** Which file of the batch is going up, so a multi-file pick reads clearly. */
  const [done, setDone] = React.useState(0);
  const [total, setTotal] = React.useState(0);

  /** Uploads one file, returning its URL, or null when it was rejected. */
  const uploadOne = async (file: File): Promise<string | null> => {

    const limit = limitFor(kind);
    if (file.size > limit) {
      /**
       * The whole Blob store is 1 GB, so an oversized file is not a matter of
       * waiting longer — it would not fit. A file this far over is invariably
       * an edit-quality export rather than something meant for the web, so say
       * what to do about it rather than only quoting the number back.
       */
      toast.error(
        `${file.name} is ${prettySize(file.size)}. The limit is ${prettySize(limit)}.`,
        {
          description:
            kind === "video"
              ? "That is an editing export, not a web video. Export it again as H.264 MP4 at 1080p — a minute comes out near 50 MB, and it will look the same on a phone."
              : "Save it as a JPEG or WebP at around 2000px on the long edge.",
          duration: 12000,
        },
      );
      return null;
    }

    /**
     * Refuse a codec no shopper's browser can decode, rather than storing a
     * clip that plays for whoever uploaded it and shows "No video with
     * supported format and MIME type found" to everyone on Chrome.
     *
     * These clips are saved off Instagram, so the format is not ours to choose
     * — Instagram serves some reels as HEVC, and a downloader passes through
     * whatever it was handed. The message therefore has to point at converting
     * the file, not at a capture setting.
     */
    if (kind === "video") {
      const codec = await checkVideoCodec(file);
      if (!codec.ok) {
        toast.error(`This clip is ${codec.label}, which Chrome and Android cannot play.`, {
          description:
            "Convert it to H.264 MP4 and upload again — saving the reel from Instagram on a desktop browser usually gives you one, or run this file through any converter set to H.264.",
          duration: 12000,
        });
        return null;
      }
    }

    setProgress(0);
    try {
      const blob = await upload(`products/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
        // Lets the route mint a token for this kind alone.
        clientPayload: kind,
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      return blob.url;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Upload failed.";
      toast.error(`${file.name}: ${message}`);
      return null;
    }
  };

  /**
   * Files go up one at a time rather than in parallel: these are large clips,
   * and a handful of concurrent multi-hundred-megabyte uploads is a good way to
   * stall the tab. Sequential also keeps the progress bar meaningful.
   */
  const choose = async (picked: FileList | null) => {
    const files = [...(picked ?? [])];
    if (files.length === 0) return;

    setBusy(true);
    setDone(0);
    setTotal(files.length);
    let added = 0;
    try {
      for (const [index, file] of files.entries()) {
        setDone(index);
        const url = await uploadOne(file);
        // One rejected file must not abandon the rest of the selection.
        if (url) {
          onUploaded(url);
          added += 1;
        }
      }
    } finally {
      setBusy(false);
      setProgress(0);
      setDone(0);
      setTotal(0);
      // Let the same file be picked again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }

    if (added > 0) {
      toast.success(`Uploaded ${added} ${kind}${added === 1 ? "" : "s"}.`);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={typesFor(kind).join(",")}
        multiple
        className="hidden"
        onChange={(event) => choose(event.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {busy
          ? total > 1
            ? `Uploading ${done + 1} of ${total}… ${Math.round(progress)}%`
            : `Uploading… ${Math.round(progress)}%`
          : `Upload ${kind}s from your computer`}
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
