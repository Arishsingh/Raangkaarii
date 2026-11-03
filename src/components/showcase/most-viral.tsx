"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Flame } from "lucide-react";

import { LazyVideo } from "@/components/lazy-video";
import { ProductImage } from "@/components/product-image";
import { PRICE_PENDING_LABEL, isPriced, rupees } from "@/lib/format";
import type { ShowcaseProduct } from "@/lib/showcase";
import { cn } from "@/lib/utils";

/**
 * Reel-shaped cards on a dark band, so the section reads as "what's blowing up
 * on Instagram" rather than another product grid. A piece with a clip plays it
 * silently; the rest hold on the photograph with a slow push-in on hover.
 */
export function MostViral({
  products,
  signedIn,
}: {
  products: ShowcaseProduct[];
  signedIn: boolean;
}) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);

  const syncArrows = React.useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setAtStart(rail.scrollLeft <= 1);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1);
  }, []);

  React.useEffect(syncArrows, [syncArrows, products.length]);

  const scrollByCard = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="most-viral-title"
      className="bg-foreground py-14 text-background sm:py-20"
    >
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-background/25 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-background/80">
              <Flame className="size-3.5 text-orange-400" strokeWidth={2} />
              Trending now
            </p>
            <h2 id="most-viral-title" className="text-4xl sm:text-5xl">
              <span className="font-light">Most </span>
              <span className="font-serif italic">Viral</span>
            </h2>
            <p className="mt-2 max-w-md text-sm font-light text-background/60">
              The pieces everyone is sharing, saving and asking about.
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
              aria-label="Previous pieces"
              className="rounded-full border border-background/30 p-2.5 transition hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
            >
              <ArrowLeft className="size-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
              aria-label="Next pieces"
              className="rounded-full border border-background/30 p-2.5 transition hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
            >
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div
          ref={railRef}
          onScroll={syncArrows}
          className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product, index) => (
            <article
              key={product.id}
              className="w-[62vw] max-w-72 shrink-0 snap-start sm:w-[34vw] lg:w-[17.5rem]"
            >
              <Link
                href={signedIn ? `/dashboard/product/${product.id}` : "/login"}
                className="group block"
              >
                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-background/10">
                  {product.video ? (
                    <LazyVideo src={product.video} poster={product.image} />
                  ) : (
                    <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]">
                      <ProductImage
                        src={product.image}
                        alt={product.alt}
                        sizes="(max-width: 640px) 62vw, (max-width: 1024px) 34vw, 280px"
                        eager={index < 5}
                      />
                    </div>
                  )}

                  {/* Keeps the tag and rank legible over any photograph. */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/55" />

                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black backdrop-blur">
                    <Flame className="size-3 text-orange-500" strokeWidth={2.25} />
                    Viral
                  </span>
                  <span className="absolute bottom-2 left-3 font-serif text-6xl italic leading-none text-white/90 drop-shadow">
                    {index + 1}
                  </span>
                  {!product.inStock ? (
                    <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white">
                      Sold out
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 line-clamp-2 font-serif text-lg leading-snug transition-opacity group-hover:opacity-70">
                  {product.name}
                </h3>
                <PriceLine product={product} signedIn={signedIn} tone="dark" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Signed-out visitors never see prices anywhere on the public site. */
export function PriceLine({
  product,
  signedIn,
  tone = "light",
}: {
  product: ShowcaseProduct;
  signedIn: boolean;
  tone?: "light" | "dark";
}) {
  const muted = tone === "dark" ? "text-background/55" : "text-foreground/55";
  if (!signedIn) {
    return <p className={cn("mt-1.5 text-sm font-light", muted)}>Sign in to view price</p>;
  }
  if (!isPriced(product.price)) {
    return <p className={cn("mt-1.5 text-sm font-light", muted)}>{PRICE_PENDING_LABEL}</p>;
  }
  return (
    <p className="mt-1.5 flex items-baseline gap-2 text-sm">
      <span className="font-medium">{rupees(product.price)}</span>
      {product.compareAt && product.compareAt > product.price ? (
        <span className={cn("font-light line-through", muted)}>
          {rupees(product.compareAt)}
        </span>
      ) : null}
    </p>
  );
}
