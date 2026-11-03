"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

/** The tile a card falls back to when it has no usable photograph. */
export function MediaFallback() {
  return (
    <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">
      <ImageOff className="size-6" />
    </div>
  );
}

/**
 * next/image cannot recover from a source that fails to load: a deleted upload
 * or a blocked blob store leaves the browser's own broken-image glyph and the
 * raw alt text sitting in the middle of the card. Catch the failure and show
 * the same neutral tile a product with no media at all gets.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className,
  eager = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  /**
   * For the cards a visitor sees without scrolling: fetched straight away and
   * ahead of everything else, instead of waiting for the lazy-load check.
   * Everything below the fold stays lazy and loads as it nears the screen.
   */
  eager?: boolean;
}) {
  // The failing source is remembered rather than a bare flag: a card is reused
  // for another product as a grid filters or sorts, and the next photograph
  // deserves its own attempt.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  // Keyed by source for the same reason: a reused card fades its new photo in.
  const [loadedSrc, setLoadedSrc] = React.useState<string | null>(null);

  // A video-only product has no still; an empty src would refetch the page.
  if (!src || failedSrc === src) return <MediaFallback />;

  const loaded = loadedSrc === src;

  return (
    <>
      {/* A soft shimmer holds the space, so a photo still on its way never
          reads as an empty or broken card. */}
      {!loaded ? (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className={cn(
          className ?? "object-cover",
          "transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
      />
    </>
  );
}
