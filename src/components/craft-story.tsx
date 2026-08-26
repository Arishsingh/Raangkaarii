"use client";

import * as React from "react";
import { Maximize2 } from "lucide-react";

const pills = ["Hand Embroidery", "Natural Dyes"];

export function CraftStory() {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const expand = () => {
    const video = videoRef.current;
    if (!video) return;
    // Safari exposes the vendor-prefixed call only.
    const request =
      video.requestFullscreen ??
      (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void })
        .webkitEnterFullscreen;
    request?.call(video);
  };

  return (
    <section className="pb-16 sm:pb-24">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-10">
          <div className="flex flex-col items-start gap-4">
            <span className="rounded-full bg-foreground px-4 py-2 text-xs font-medium tracking-wide text-background">
              Rangkaarii Atelier
            </span>
            {pills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-foreground px-5 py-2 text-lg font-light sm:text-xl"
              >
                {pill}
              </span>
            ))}
          </div>

          <div>
            <h2 className="text-2xl leading-[1.4] font-light sm:text-[1.75rem]">
              Every thread starts with a{" "}
              <span className="font-serif italic">hand</span>.
              <br />
              Every motif tells a{" "}
              <span className="font-serif italic">story</span>.
              <br />
              Every piece carries its{" "}
              <span className="font-serif italic">maker</span>.
            </h2>

            <p className="mt-5 max-w-xl text-sm font-light leading-relaxed text-foreground/75">
              Each Rangkaarii piece is cut, embroidered, and finished by artisans in
              small batches. Natural fabrics, slow processes, and detailing that
              reveals itself the longer you wear it.
            </p>
          </div>
        </div>

        <div className="relative mt-10 aspect-video overflow-hidden rounded-2xl bg-muted">
          <video
            ref={videoRef}
            className="size-full object-cover"
            poster="/hero-5.png"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Artisans finishing embroidery in the Rangkaarii atelier"
          >
            <source src="/videos/atelier.mp4" type="video/mp4" />
          </video>

          <button
            type="button"
            onClick={expand}
            aria-label="Expand video to full screen"
            className="absolute bottom-5 right-5 rounded-full bg-foreground/80 p-3 text-background backdrop-blur transition-colors hover:bg-foreground"
          >
            <Maximize2 className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  );
}
