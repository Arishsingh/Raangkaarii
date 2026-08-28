"use client";

import * as React from "react";
import Image from "next/image";
import { Play } from "lucide-react";

import { ProductMedia } from "@/components/product-media";
import { cn } from "@/lib/utils";

type Item = { kind: "video" | "image"; url: string };

/**
 * Every photo and clip a product carries, with the thumbnail strip only
 * appearing once there is more than one — a single-media product should look
 * exactly as it did before galleries existed.
 *
 * Clips lead: a piece filmed on a model says more than a still of it, and the
 * primary still stays available one thumbnail away.
 */
export function ProductGallery({
  image,
  video,
  images,
  videos,
  alt,
}: {
  image: string;
  video?: string;
  images?: string[];
  videos?: string[];
  alt: string;
}) {
  const items = React.useMemo<Item[]>(() => {
    // A built-in product has no arrays; its singular fields are the whole set.
    const clips = videos?.length ? videos : video ? [video] : [];
    const stills = images?.length ? images : image ? [image] : [];
    return [
      ...clips.map((url) => ({ kind: "video" as const, url })),
      ...stills.map((url) => ({ kind: "image" as const, url })),
    ];
  }, [image, images, video, videos]);

  const [active, setActive] = React.useState(0);
  // A product can change under the component; never point past the new set.
  const current = items[Math.min(active, items.length - 1)];

  if (!current) {
    return (
      <div className="relative aspect-[4/5] max-h-[560px] w-full overflow-hidden rounded-2xl border bg-muted" />
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/5] max-h-[560px] w-full overflow-hidden rounded-2xl border bg-muted">
        <ProductMedia
          // Remount on change so a clip does not keep playing under the next one.
          key={current.url}
          image={current.kind === "image" ? current.url : undefined}
          video={current.kind === "video" ? current.url : undefined}
          alt={alt}
          sizes="(min-width: 1024px) 560px, 90vw"
          hoverToPlay={false}
        />
      </div>

      {items.length > 1 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <li key={item.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View ${item.kind} ${index + 1} of ${items.length}`}
                aria-current={index === active}
                className={cn(
                  "relative size-16 overflow-hidden rounded-lg border-2 transition sm:size-20",
                  index === active
                    ? "border-foreground"
                    : "border-transparent hover:border-border",
                )}
              >
                {item.kind === "image" ? (
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <>
                    {/* metadata alone is enough to paint the opening frame. */}
                    <video
                      src={item.url}
                      preload="metadata"
                      muted
                      playsInline
                      aria-hidden
                      className="h-full w-full bg-black object-cover"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-black/25">
                      <Play className="size-4 fill-white text-white" strokeWidth={0} />
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
