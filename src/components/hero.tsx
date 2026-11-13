"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const slides = [
  {
    image: "/hero.webp",
    alt: "Rails of curated vintage clothing in a boutique",
    tagline: "New shapes, fresh prints, instant favourites.",
  },
  {
    image: "/hero-3.webp",
    alt: "Woman choosing a piece from a linen-filled wardrobe",
    tagline: "A wardrobe you reach for without thinking.",
  },
  {
    image: "/hero-4.webp",
    alt: "Model in a crimson kurta and organza dupatta on a studio backdrop",
    tagline: "Gold thread, deep crimson, occasion-ready.",
  },
  {
    image: "/hero-5.webp",
    alt: "Model in a red velvet kurta and patiala beside an arched window",
    tagline: "Velvet and shalwar, cut for evening light.",
  },
];

const AUTOPLAY_MS = 6000;
/** Drag distance (or flick velocity) that counts as a swipe. */
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

export function Hero() {
  const [[index, direction], setSlide] = React.useState<[number, number]>([0, 1]);
  const reduce = useReducedMotion();

  const paginate = React.useCallback((step: number) => {
    setSlide(([current]) => [
      (current + step + slides.length) % slides.length,
      step >= 0 ? 1 : -1,
    ]);
  }, []);

  const goTo = React.useCallback((next: number) => {
    setSlide(([current]) => [next, next > current ? 1 : -1]);
  }, []);

  React.useEffect(() => {
    const id = setInterval(() => paginate(1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [index, paginate]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") paginate(-1);
      if (e.key === "ArrowRight") paginate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paginate]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) paginate(1);
    else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) paginate(-1);
  };

  const slide = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative h-[100svh] min-h-[560px] w-full touch-pan-y select-none overflow-hidden bg-neutral-900"
    >
      {slides.map((s, i) => {
        // Only the current slide and its neighbours are mounted, so the
        // browser never downloads all five photos up front.
        const distance = Math.min(
          Math.abs(i - index),
          slides.length - Math.abs(i - index),
        );
        if (distance > 1) return null;

        return (
          <Image
            key={s.image}
            src={s.image}
            alt={i === index ? s.alt : ""}
            fill
            priority={i === 0}
            sizes="100vw"
            draggable={false}
            className={cn(
              "object-cover transition-opacity duration-700 ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        );
      })}

      {/* Legibility scrim — keeps white type readable over a busy photo. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/40" />

      {/* Drag surface: children stay clickable, a horizontal drag paginates. */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.14}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        className="absolute inset-0 z-10 flex cursor-grab flex-col items-center justify-center px-6 text-center active:cursor-grabbing"
      >
        {/* Keyed remount: each slide's copy fades in from the swipe direction. */}
        <motion.div
          key={index}
          initial={reduce ? false : { opacity: 0, x: direction * 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-7"
        >
          <p className="max-w-2xl text-lg font-light tracking-wide text-white text-balance drop-shadow-sm sm:text-xl">
            {slide.tagline}
          </p>
          {/* The home page only renders for signed-out visitors. */}
          <Link
            href="/dashboard"
            draggable={false}
            className="bg-white/95 px-8 py-3.5 text-xs font-medium tracking-[0.18em] text-neutral-900 shadow-sm transition-colors hover:bg-white"
          >
            SHOP NOW
          </Link>
        </motion.div>
      </motion.div>

      {/* Carousel controls */}
      <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-4 text-white">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => paginate(-1)}
          className="p-1 opacity-80 pointer-coarse:p-2.5 transition-opacity hover:opacity-100"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-3 pointer-coarse:gap-5">
          {slides.map((s, i) => (
            <button
              key={s.image}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={cn(
                "relative size-2 rounded-full bg-white transition-all duration-300",
                // The dot itself must stay 8px, so the tap area is a
                // transparent pseudo-element around it rather than padding.
                "pointer-coarse:before:absolute pointer-coarse:before:-inset-2.5 pointer-coarse:before:content-['']",
                i === index
                  ? "scale-150 ring-1 ring-white/70 ring-offset-4 ring-offset-transparent"
                  : "opacity-55 hover:opacity-90",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => paginate(1)}
          className="p-1 opacity-80 pointer-coarse:p-2.5 transition-opacity hover:opacity-100"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}
