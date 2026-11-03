"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

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
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
}) {
  // The failing source is remembered rather than a bare flag: a card is reused
  // for another product as a grid filters or sorts, and the next photograph
  // deserves its own attempt.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);

  // A video-only product has no still; an empty src would refetch the page.
  if (!src || failedSrc === src) return <MediaFallback />;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className ?? "object-cover"}
      onError={() => setFailedSrc(src)}
    />
  );
}
