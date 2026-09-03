"use client";

import * as React from "react";
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
 * Sends one file at a time to /api/admin/upload, which stores it in the
 * database and hands back the URL it will be served from.
 *
 * XMLHttpRequest rather than fetch, only because fetch still cannot report
 * upload progress — and a clip going up over a phone connection needs a bar.
 */
function put(
  file: File,
  kind: MediaKind,
  onProgress: (percentage: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/upload");
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("x-media-kind", kind);
    // Names can hold anything; a header cannot. Percent-encode it.
    request.setRequestHeader("x-file-name", encodeURIComponent(file.name));

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };

    request.onload = () => {
      let body: { url?: string; error?: string } = {};
      try {
        body = JSON.parse(request.responseText);
      } catch {
        // A proxy or a crash can answer with something that is not JSON.
      }
      if (request.status >= 200 && request.status < 300 && body.url) {
        resolve(body.url);
      } else {
        reject(new Error(body.error ?? "Upload failed."));
      }
    };
    request.onerror = () => reject(new Error("The connection dropped."));
    request.ontimeout = () => reject(new Error("The upload timed out."));

    request.send(file);
  });
}


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
       * An oversized file is not a matter of waiting longer — the shop's whole
       * database is half a gigabyte. A file this far over is invariably an
       * edit-quality export rather than something meant for the web, so say
       * what to do about it rather than only quoting the number back.
       */
      toast.error(
        `${file.name} is ${prettySize(file.size)}. The limit is ${prettySize(limit)}.`,
        {
          description:
            kind === "video"
              ? "Export it again as H.264 MP4 at 720p or 1080p — a short product clip comes out at a few megabytes and looks the same on a phone."
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
      return await put(file, kind, setProgress);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Upload failed.";
      toast.error(`${file.name}: ${message}`);
      return null;
    }
  };

  /**
   * Files go up one at a time rather than in parallel: these are clips of a few
   * megabytes each, and a handful of concurrent uploads is a good way to stall
   * the tab. Sequential also keeps the progress bar meaningful.
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
