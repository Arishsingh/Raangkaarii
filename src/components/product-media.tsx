import Image from "next/image";
import { ImageOff } from "lucide-react";

/**
 * A product shows whichever media it was given: its own clip when there is one,
 * its own photograph otherwise. BannerVideo autoplays, so passing an image as
 * its `poster` is not enough — the video covers it immediately, which is how
 * every card once ended up showing the same house reel.
 */
import { BannerVideo } from "@/components/banner-video";

export function ProductMedia({
  image,
  video,
  alt,
  sizes,
  compact = false,
  className,
}: {
  image?: string;
  video?: string;
  alt: string;
  /** Passed to next/image; the parent must be positioned. */
  sizes: string;
  compact?: boolean;
  className?: string;
}) {
  if (video) {
    return <BannerVideo src={video} poster={image} label={alt} compact={compact} />;
  }

  if (image) {
    return (
      <Image
        src={image}
        alt={alt}
        fill
        sizes={sizes}
        className={className ?? "object-cover"}
      />
    );
  }

  // Neither was uploaded; show a neutral tile rather than a broken image.
  return (
    <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">
      <ImageOff className="size-6" />
    </div>
  );
}
