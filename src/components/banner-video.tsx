"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

const PREVIEW_SECONDS = 2;

/**
 * Loops the first couple of seconds as an ambient preview. Pressing play hands
 * the whole clip over with sound and controls.
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
  /** Smaller control, for use inside product cards. */
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

  // While previewing, jump back to the start once past the preview window.
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || full) return;
    if (video.currentTime >= PREVIEW_SECONDS) video.currentTime = 0;
  };

  const playFull = async () => {
    const video = videoRef.current;
    if (!video) return;
    setFull(true);
    video.loop = false;
    video.muted = false;
    video.currentTime = 0;
    video.controls = true;
    try {
      await video.play();
    } catch {
      // Autoplay policies can refuse; the native controls still work.
    }
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

  const backToPreview = () => {
    const video = videoRef.current;
    if (!video) return;
    setFull(false);
    video.loop = true;
    video.muted = true;
    video.controls = false;
    video.currentTime = 0;
    void video.play();
  };

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
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onTimeUpdate={handleTimeUpdate}
        onEnded={backToPreview}
      >
        <source src={src} type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={full ? backToPreview : playFull}
        aria-label={full ? "Back to preview" : "Play full video"}
        className={cn(
          "absolute flex items-center gap-2 rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75",
          compact
            ? "bottom-3 left-3 size-9 justify-center"
            : "bottom-4 left-4 px-4 py-2.5 text-xs font-medium tracking-wide",
        )}
      >
        {full ? (
          <>
            <Pause className={compact ? "size-3.5" : "size-3.5"} />
            {compact ? null : "Preview"}
          </>
        ) : (
          <>
            <Play className="size-3.5 fill-white" strokeWidth={0} />
            {compact ? null : "Play full film"}
          </>
        )}
      </button>
    </div>
  );
}
