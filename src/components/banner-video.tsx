"use client";

import * as React from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import { MediaFallback } from "@/components/product-image";
import { useNearViewport } from "@/components/use-near-viewport";
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
  /**
   * The source is withheld until the card approaches the screen. `preload`
   * already stops a poster-backed clip fetching itself, but an autoplaying one
   * ignores that — and a grid renders far more cards than are ever looked at.
   */
  const [frameRef, near] = useNearViewport<HTMLDivElement>();
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
  /**
   * The still that could not be loaded, remembered by URL so a card reused for
   * another product still gives the new poster its own chance.
   */
  const [badPoster, setBadPoster] = React.useState<string | null>(null);
  const posterSrc = poster && poster !== badPoster ? poster : null;

  /**
   * A poster that cannot load leaves the card blank rather than broken: with
   * `preload="none"` the clip is never fetched, so it never errors either and
   * nothing ever replaces the empty frame. Probing the still off-screen tells
   * us to stop trusting it, which in turn lets the clip load and report.
   */
  React.useEffect(() => {
    if (!poster) return;
    const probe = new window.Image();
    probe.onerror = () => setBadPoster(poster);
    probe.src = poster;
    return () => {
      probe.onerror = null;
    };
  }, [poster]);

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
    // The poster usually lives wherever the clip does, so whatever stopped one
    // — a deleted upload, a blocked store — tends to stop the other. Without
    // this second step the card ends up showing the browser's broken-image
    // glyph and the product's alt text instead of the still.
    return poster && posterSrc ? (
      // Plain <img>: the URL is whatever was uploaded, and a failed clip is not
      // worth routing through the image optimiser.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={posterSrc}
        alt={label ?? ""}
        className="h-full w-full object-cover"
        onError={() => setBadPoster(poster ?? null)}
      />
    ) : (
      <MediaFallback />
    );
  }

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full overflow-hidden bg-muted"
      onMouseEnter={hoverToPlay ? startPreview : undefined}
      onMouseLeave={hoverToPlay ? stopPreview : undefined}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={posterSrc ?? undefined}
        autoPlay={!hoverToPlay}
        muted={muted}
        // A preview repeats; the full clip is meant to run once and end.
        loop={!full}
        controls={full}
        playsInline
        /**
         * A poster means nothing of the clip is needed to paint the card, so
         * fetch none of it until the shopper actually asks. On a grid of
         * products that is the difference between one request per card and
         * none. Without a poster there is nothing else to show, so metadata
         * still has to come down for the first frame.
         */
        preload={posterSrc ? "none" : "metadata"}
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
        src={near ? src : undefined}
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
