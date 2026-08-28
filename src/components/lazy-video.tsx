"use client";

import { useNearViewport } from "@/components/use-near-viewport";
import { cn } from "@/lib/utils";

/**
 * A muted background clip that does not fetch itself until it nears the screen.
 *
 * The poster carries the section on its own, so nothing is missing while the
 * clip is still off screen — and a visitor who never scrolls that far never
 * pays for it. Decorative by definition, so it stays hidden from assistive tech.
 */
export function LazyVideo({
  src,
  poster,
  className,
  type = "video/mp4",
}: {
  src: string;
  poster: string;
  className?: string;
  type?: string;
}) {
  const [ref, near] = useNearViewport<HTMLDivElement>();

  return (
    <div ref={ref} className={cn("absolute inset-0", className)}>
      <video
        className="h-full w-full object-cover"
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
      >
        {near ? <source src={src} type={type} /> : null}
      </video>
    </div>
  );
}
