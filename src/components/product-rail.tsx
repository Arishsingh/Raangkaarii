"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";

import { cn } from "@/lib/utils";

type Product = {
  name: string;
  price: string;
  image: string;
  alt: string;
  badge?: string;
  sizes?: string[];
};

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

const tabs: { label: string; products: Product[] }[] = [
  {
    label: "New In",
    products: [
      {
        name: "Rose Pink Floral Hand-Embroidered Kurta",
        price: "£52.00",
        image: "/products/01.webp",
        alt: "Rose pink kurta with floral thread embroidery on the yoke",
        badge: "NEW",
        sizes: SIZES,
      },
      {
        name: "Teal Bandhani Zari Work Kurta Set",
        price: "£46.00",
        image: "/products/02.webp",
        alt: "Teal bandhani print kurta with gold zari placket",
        badge: "NEW",
        sizes: SIZES,
      },
      {
        name: "Mint Floral Lace Trim Kurta",
        price: "£48.00",
        image: "/products/03.webp",
        alt: "Mint green floral kurta with white lace trim",
        badge: "NEW",
        sizes: SIZES,
      },
      {
        name: "Crimson Silk Embroidered Kurta",
        price: "£46.00",
        image: "/products/04.webp",
        alt: "Crimson kurta with green and gold floral embroidery",
        badge: "NEW",
        sizes: SIZES,
      },
      {
        name: "Ivory Sheer Panel Embroidered Kurta",
        price: "£54.00",
        image: "/products/05.webp",
        alt: "Ivory kurta with black embroidery and a sheer panel",
        badge: "NEW",
        sizes: SIZES,
      },
    ],
  },
  {
    label: "Best Sellers",
    products: [
      {
        name: "Ivory Geometric Yoke Kurta",
        price: "£48.00",
        image: "/products/06.webp",
        alt: "Ivory kurta with a red and black geometric embroidered yoke",
        sizes: SIZES,
      },
      {
        name: "Powder Blue Chikankari Kurta",
        price: "£52.00",
        image: "/products/07.webp",
        alt: "Powder blue kurta with white chikankari lace panels",
        sizes: SIZES,
      },
      {
        name: "Lime Floral Kurta with Dupatta",
        price: "£46.00",
        image: "/products/08.webp",
        alt: "Lime green floral kurta with a matching dupatta",
        sizes: SIZES,
      },
      {
        name: "Blush Paisley Print Kurta",
        price: "£46.00",
        image: "/products/09.webp",
        alt: "Blush paisley print kurta with a black embroidered panel",
        sizes: SIZES,
      },
    ],
  },
  {
    label: "Linen Blend Kurtas & Sets",
    products: [
      {
        name: "Lavender Floral Embroidered Kurta",
        price: "£54.00",
        image: "/products/10.webp",
        alt: "Lavender kurta with pink floral embroidery and lace sleeves",
        sizes: SIZES,
      },
      {
        name: "Ivory Rose Embroidered Kurta",
        price: "£58.00",
        image: "/products/11.webp",
        alt: "Ivory kurta with black rose embroidery across the yoke",
        sizes: SIZES,
      },
      {
        name: "Pale Blue Heavy Chikankari Kurta",
        price: "£62.00",
        image: "/products/12.webp",
        alt: "Pale blue kurta covered in white chikankari embroidery",
        sizes: SIZES,
      },
      {
        name: "Sage Pearl Neckline Kurta",
        price: "£68.00",
        image: "/products/13.webp",
        alt: "Sage green kurta with a pearl-worked neckline",
        sizes: SIZES,
      },
    ],
  },
];

export function ProductRail() {
  const [active, setActive] = React.useState(0);
  const railRef = React.useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);

  const syncArrows = React.useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setAtStart(rail.scrollLeft <= 1);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1);
  }, []);

  React.useEffect(syncArrows, [syncArrows, active]);

  const scrollByCard = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    // One card plus its gap, so the rail lands cleanly on the next item.
    const card = rail.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8">
        <div className="mb-7 flex items-end justify-between gap-6">
          <div className="flex flex-wrap items-center gap-5 sm:gap-7">
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setActive(index);
                  railRef.current?.scrollTo({ left: 0 });
                }}
                className={cn(
                  "border-b pb-1 text-[15px] font-light tracking-wide transition-colors pointer-coarse:pb-2.5 pointer-coarse:pt-2",
                  index === active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-foreground/55 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            {([-1, 1] as const).map((direction) => {
              const Icon = direction === -1 ? ArrowLeft : ArrowRight;
              const disabled = direction === -1 ? atStart : atEnd;
              return (
                <button
                  key={direction}
                  type="button"
                  onClick={() => scrollByCard(direction)}
                  disabled={disabled}
                  aria-label={direction === -1 ? "Previous products" : "Next products"}
                  className="p-1 text-foreground transition-opacity hover:opacity-60 disabled:pointer-events-none disabled:opacity-25"
                >
                  <Icon className="size-6" strokeWidth={1.25} />
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={railRef}
          onScroll={syncArrows}
          className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs[active].products.map((product) => (
            // A product is only shoppable once signed in, so that is where a
            // card leads; the header nav still reaches the collections.
            <ProductCard key={product.name} product={product} href="/sign-in" />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product, href }: { product: Product; href: string }) {
  return (
    <article className="w-[78vw] shrink-0 snap-start sm:w-[44vw] lg:w-[26vw] xl:w-[calc((100%-3rem)/4)]">
      <Link href={href} className="group block">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <Image
            src={product.image}
            alt={product.alt}
            fill
            sizes="(max-width: 640px) 78vw, (max-width: 1024px) 44vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />

          {product.badge ? (
            <span className="absolute left-3 top-3 bg-background px-2 py-1 text-[10px] font-medium tracking-[0.12em]">
              {product.badge}
            </span>
          ) : null}

          {/* Size picker and wishlist reveal on hover, as on the product grid. */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <div className="flex flex-wrap gap-1">
              {product.sizes?.map((size) => (
                <span
                  key={size}
                  className="pointer-events-auto cursor-pointer bg-background px-1.5 py-1 text-[10px] font-medium leading-none transition-colors hover:bg-foreground hover:text-background"
                >
                  {size}
                </span>
              ))}
            </div>
            <span
              role="button"
              aria-label="Add to wishlist"
              className="pointer-events-auto shrink-0 p-1 text-foreground/70 transition-colors hover:text-foreground pointer-coarse:p-2.5"
            >
              <Heart className="size-4" strokeWidth={1.5} />
            </span>
          </div>
        </div>

        <h3 className="mt-4 font-serif text-base leading-snug">{product.name}</h3>
        {/* Signed-out visitors do not see prices anywhere on the public site. */}
        <p className="mt-1.5 text-sm font-light text-foreground/60">
          Sign in to view price
        </p>
      </Link>
    </article>
  );
}
