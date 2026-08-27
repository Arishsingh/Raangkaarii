"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";

/** Clips live in /public/videos; the poster stands in until one is added. */
const reels = [
  {
    lines: ["Everyday Comfort.", "Effortless Drape."],
    video: "/videos/reel-1.mp4",
    poster: "/hero-2.png",
  },
  {
    lines: ["True to Size.", "Perfect Fit."],
    video: "/videos/reel-2.mp4",
    poster: "/hero-3.png",
  },
  {
    lines: ["Hand Embroidery.", "Worth the Wait."],
    video: "/videos/reel-3.mp4",
    poster: "/hero-4.png",
  },
  {
    lines: ["Soft Cotton Voile.", "Wears Beautifully."],
    video: "/videos/reel-4.mp4",
    poster: "/hero-5.png",
  },
  {
    lines: ["Festive Ready.", "Endless Compliments."],
    video: "/videos/reel-5.mp4",
    poster: "/hero.png",
  },
  {
    lines: ["Beautifully Wrapped.", "Arrived Early."],
    video: "/videos/reel-6.mp4",
    poster: "/hero-2.png",
  },
];

export function LovedBy() {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);

  const syncArrows = React.useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setAtStart(rail.scrollLeft <= 1);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1);
  }, []);

  React.useEffect(syncArrows, [syncArrows]);

  const scrollByCard = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <section className="pb-16 sm:pb-24">
      <div className="w-full">
        <h2 className="mb-10 text-center text-4xl sm:text-5xl">
          <span className="font-light">Loved by </span>
          <span className="font-serif italic">Families</span>
        </h2>

        <div
          ref={railRef}
          onScroll={syncArrows}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 lg:pl-[18.75vw] lg:pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {reels.map((reel) => (
            <article
              key={reel.video}
              className="w-[70vw] shrink-0 snap-start sm:w-[38vw] lg:w-[15vw]"
            >
              <div
                className="mb-3 flex gap-0.5"
                aria-label="Rated 5 out of 5"
                role="img"
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="size-3.5 fill-foreground/80"
                    strokeWidth={0}
                  />
                ))}
              </div>

              <p className="mb-4 text-[15px] font-medium leading-snug">
                {reel.lines[0]}
                <br />
                {reel.lines[1]}
              </p>

              <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted">
                <video
                  className="size-full object-cover"
                  poster={reel.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-hidden
                >
                  <source src={reel.video} type="video/mp4" />
                </video>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 px-5 lg:pr-[18.75vw]">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={atStart}
            aria-label="Previous clips"
            className="p-1 transition-opacity hover:opacity-60 disabled:pointer-events-none disabled:opacity-25 pointer-coarse:p-2.5"
          >
            <ArrowLeft className="size-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={atEnd}
            aria-label="Next clips"
            className="rounded-full border border-foreground p-2.5 transition-colors hover:bg-foreground hover:text-background disabled:pointer-events-none disabled:opacity-25"
          >
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
