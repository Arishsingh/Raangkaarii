import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";

import { ProductImage } from "@/components/product-image";
import { PriceLine } from "@/components/showcase/most-viral";
import type { ShowcaseProduct } from "@/lib/showcase";
import { cn } from "@/lib/utils";

/**
 * An editorial bento of four: the first pick takes the large tile, the rest
 * stack beside it. Below lg it settles into a plain two-up grid.
 */
export function MostLoved({
  products,
  signedIn,
}: {
  products: ShowcaseProduct[];
  signedIn: boolean;
}) {
  const shown = products.slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="most-loved-title" className="py-14 sm:py-20">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8">
        <div className="mb-10 text-center">
          <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/60">
            <Heart className="size-3.5 fill-rose-500 text-rose-500" strokeWidth={0} />
            Customer favourites
          </p>
          <h2 id="most-loved-title" className="text-4xl sm:text-5xl">
            <span className="font-light">Most </span>
            <span className="font-serif italic">Loved</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-light text-foreground/60">
            The styles our customers keep coming back for.
          </p>
        </div>

        <div
          className={cn(
            "grid grid-cols-2 gap-3 sm:gap-4",
            // Fixed row heights on large screens: the tiles there are free of
            // an aspect ratio, so the rows must carry the height themselves.
            shown.length >= 3 &&
              "lg:grid-cols-4 lg:auto-rows-[clamp(17rem,23vw,25rem)]",
          )}
        >
          {shown.map((product, index) => {
            const hero = index === 0 && shown.length >= 3;
            /**
             * Four: hero on the left, two small tiles top right, one wide tile
             * beneath them. Three: hero, then two wide tiles stacked.
             */
            const wide =
              (shown.length === 4 && index === 3) ||
              (shown.length === 3 && index > 0);
            return (
              <Link
                key={product.id}
                href={signedIn ? `/dashboard/product/${product.id}` : "/login"}
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-muted",
                  hero
                    ? "col-span-2 aspect-[4/5] sm:aspect-[16/11] lg:row-span-2"
                    : wide && shown.length === 4
                      ? "col-span-2 aspect-[16/10] lg:col-span-2"
                      : "aspect-[4/5]",
                  wide && "lg:col-span-2",
                  shown.length >= 3 && "lg:aspect-auto",
                )}
              >
                <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]">
                  <ProductImage
                    src={product.image}
                    alt={product.alt}
                    sizes={hero ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-black opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <ArrowUpRight className="size-4" strokeWidth={1.5} />
                </span>

                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
                  <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/80">
                    <Heart className="size-3 fill-white" strokeWidth={0} />
                    Most loved
                  </p>
                  <h3
                    className={cn(
                      "mt-1.5 font-serif leading-tight",
                      hero ? "text-2xl sm:text-4xl" : "text-lg sm:text-xl",
                    )}
                  >
                    {product.name}
                  </h3>
                  <div className="text-white [&_p]:text-white/80 [&_span]:text-white">
                    <PriceLine product={product} signedIn={signedIn} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
