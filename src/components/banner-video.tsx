"use client";

import * as React from "react";
import { ImageOff, Pause, Play, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";

const PREVIEW_SECONDS = 2;

/**
 * Loops the first couple of seconds as an ambient preview. Pressing play — or
 * the speaker — hands the whole clip over with its sound, so a piece filmed
 * with someone talking over it can actually be heard.
 */
export function BannerVideo({
  src,
  poster,
  label,
  compact = false,
  hoverToPlay = false,
}: {
  src: string;
  poster?: string;
  /** Describes the clip for assistive tech. */
  label?: string;
  /** Smaller controls, for use inside product cards. */
  compact?: boolean;
  /**
   * Hold on the poster until the pointer arrives, then loop the preview. A grid
   * of cards all playing at once is noisy, and every clip costs bandwidth the
   * shopper may never have asked for.
   */
  hoverToPlay?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [full, setFull] = React.useState(false);
  /**
   * Sound is React state bound straight to the element rather than assigned to
   * the node by hand. Setting `video.muted` imperatively under a hard-coded
   * `muted` prop leaves the two disagreeing, and the next render can silence a
   * clip the shopper deliberately unmuted.
   *
   * It starts muted because every browser refuses to autoplay audio otherwise —
   * the clip would not start at all.
   */
  const [muted, setMuted] = React.useState(true);
  /**
   * A codec the browser cannot decode reaches us as an error on the element,
   * and the default rendering is the browser's own "No video with supported
   * format and MIME type found". Fall back to the still instead — a shopper
   * should never be shown a decoder message.
   */
  const [failed, setFailed] = React.useState(false);

  // While previewing, jump back to the start once past the preview window.
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || full) return;
    if (video.currentTime >= PREVIEW_SECONDS) video.currentTime = 0;
  };

  const playFull = () => {
    const video = videoRef.current;
    if (!video) return;
    setFull(true);
    setMuted(false);
    video.currentTime = 0;
    void video.play().catch(() => {
      // Autoplay policies can refuse; the native controls still work.
    });
  };

  const backToPreview = () => {
    const video = videoRef.current;
    if (!video) return;
    setFull(false);
    setMuted(true);
    video.currentTime = 0;
    void video.play().catch(() => {});
  };

  /**
   * Asking for sound during the ambient preview means "let me hear this", not
   * "loop these two seconds out loud" — so it plays the clip through instead.
   */
  const toggleSound = () => {
    if (muted) {
      playFull();
      return;
    }
    setMuted(true);
  };

  // Hover only drives the ambient preview; a clip playing in full is left alone.
  const startPreview = () => {
    const video = videoRef.current;
    if (!video || full) return;
    video.currentTime = 0;
    void video.play().catch(() => {
      // Autoplay policies can refuse a muted play; the poster simply stays.
    });
  };

  const stopPreview = () => {
    const video = videoRef.current;
    if (!video || full) return;
    video.pause();
    video.currentTime = 0;
  };

  /**
   * Cards wrap the media in a link to the product, so a bare button click would
   * navigate away instead of playing. Every control has to claim the event.
   */
  const control = (event: React.MouseEvent, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  if (failed) {
    return poster ? (
      // Plain <img>: the URL is whatever was uploaded, and a failed clip is not
      // worth routing through the image optimiser.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt={label ?? ""} className="h-full w-full object-cover" />
    ) : (
      <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">
        <ImageOff className="size-6" />
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-muted"
      onMouseEnter={hoverToPlay ? startPreview : undefined}
      onMouseLeave={hoverToPlay ? stopPreview : undefined}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={poster}
        autoPlay={!hoverToPlay}
        muted={muted}
        // A preview repeats; the full clip is meant to run once and end.
        loop={!full}
        controls={full}
        playsInline
        preload="metadata"
        aria-label={label}
        onTimeUpdate={handleTimeUpdate}
        onEnded={backToPreview}
        onError={() => setFailed(true)}
        // Keep the button in step when the sound is changed from the native
        // controls the full clip shows.
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        /**
         * src goes on the element, not a <source type=…>. The uploader accepts
         * webm and quicktime as well as mp4, and declaring the wrong type made
         * the browser refuse the file outright — "No video with supported
         * format and MIME type found". Left to itself it trusts the
         * Content-Type the blob is served with.
         */
        src={src}
      />

      <div
        className={cn(
          "absolute flex items-center gap-2",
          compact ? "bottom-3 left-3" : "bottom-4 left-4",
        )}
      >
        <button
          type="button"
          onClick={(event) => control(event, full ? backToPreview : playFull)}
          aria-label={full ? "Back to preview" : "Play full video with sound"}
          className={cn(
            "flex items-center gap-2 rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75",
            compact
              ? "size-9 justify-center"
              : "px-4 py-2.5 text-xs font-medium tracking-wide",
          )}
        >
          {full ? (
            <>
              <Pause className="size-3.5" />
              {compact ? null : "Preview"}
            </>
          ) : (
            <>
              <Play className="size-3.5 fill-white" strokeWidth={0} />
              {compact ? null : "Play full film"}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={(event) => control(event, toggleSound)}
          aria-label={muted ? "Turn the sound on" : "Mute"}
          aria-pressed={!muted}
          className="flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75"
        >
          {muted ? (
            <VolumeX className="size-3.5" />
          ) : (
            <Volume2 className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
