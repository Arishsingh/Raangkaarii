"use client";

import * as React from "react";

/**
 * True once the element is close enough to the viewport to be worth loading.
 *
 * `<video>` has no equivalent of `loading="lazy"`, and an autoplaying clip
 * starts downloading the moment it mounts however far down the page it sits.
 * This gates the source on the element actually approaching the screen.
 *
 * It latches: once something has been loaded there is nothing to gain by
 * unloading it when the shopper scrolls past.
 */
export function useNearViewport<T extends HTMLElement>(rootMargin = "300px") {
  const ref = React.useRef<T>(null);
  const [near, setNear] = React.useState(false);

  React.useEffect(() => {
    if (near) return;
    const node = ref.current;
    if (!node) return;

    // Without an observer, load rather than leave the clip permanently hidden.
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near, rootMargin]);

  return [ref, near] as const;
}
