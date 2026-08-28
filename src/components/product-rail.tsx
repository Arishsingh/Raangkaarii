"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";

import { slugify } from "@/lib/collections";
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
        name: "Green Watercolour Gingham Seersucker Boxy Pyjama Set",
        price: "£52.00",
        image: "/hero.webp",
        alt: "Green gingham seersucker boxy pyjama set",
        badge: "NEW",
        sizes: SIZES,
      },
      {
        name: "Womens Green Watercolour Gingham Drop Shoulder Mini Nightdress",
        price: "£46.00",
        image: "/hero-3.webp",
        alt: "Green gingham drop shoulder mini nightdress",
        badge: "NEW",
        sizes: SIZES,
      },
      {
        name: "Womens Rosewater Contrast Trim Gauze Frill Collar Pyjama Set",
        price: "£48.00",
        image: "/hero-4.webp",
        alt: "Rosewater gauze frill collar pyjama set",
        badge: "NEW",
        sizes: SIZES,
      },
      {
        name: "Pale Blue Wisteria Cotton Voile Oversize Short Pyjama Set",
        price: "£46.00",
        image: "/hero-5.webp",
        alt: "Pale blue wisteria cotton voile short pyjama set",
        badge: "NEW",
        sizes: SIZES,
      },
      {
        name: "Ivory Embroidered Cotton Long Sleeve Nightdress",
        price: "£54.00",
        image: "/hero-2.webp",
        alt: "Ivory embroidered cotton nightdress",
        badge: "NEW",
        sizes: SIZES,
      },
    ],
  },
  {
    label: "Best Sellers",
    products: [
      {
        name: "Womens Rosewater Contrast Trim Gauze Frill Collar Pyjama Set",
        price: "£48.00",
        image: "/hero-4.webp",
        alt: "Rosewater gauze frill collar pyjama set",
        sizes: SIZES,
      },
      {
        name: "Green Watercolour Gingham Seersucker Boxy Pyjama Set",
        price: "£52.00",
        image: "/hero.webp",
        alt: "Green gingham seersucker boxy pyjama set",
        sizes: SIZES,
      },
      {
        name: "Pale Blue Wisteria Cotton Voile Oversize Short Pyjama Set",
        price: "£46.00",
        image: "/hero-5.webp",
        alt: "Pale blue wisteria cotton voile short pyjama set",
        sizes: SIZES,
      },
      {
        name: "Womens Green Watercolour Gingham Drop Shoulder Mini Nightdress",
        price: "£46.00",
        image: "/hero-3.webp",
        alt: "Green gingham drop shoulder mini nightdress",
        sizes: SIZES,
      },
    ],
  },
  {
    label: "Linen Blend Pyjamas & Nightwear",
    products: [
      {
        name: "Ivory Embroidered Linen Blend Long Sleeve Nightdress",
        price: "£54.00",
        image: "/hero-2.webp",
        alt: "Ivory embroidered linen blend nightdress",
        sizes: SIZES,
      },
      {
        name: "Sand Linen Blend Oversize Short Pyjama Set",
        price: "£58.00",
        image: "/hero-3.webp",
        alt: "Sand linen blend short pyjama set",
        sizes: SIZES,
      },
      {
        name: "Crimson Linen Blend Piped Pyjama Set",
        price: "£62.00",
        image: "/hero-4.webp",
        alt: "Crimson linen blend piped pyjama set",
        sizes: SIZES,
      },
      {
        name: "Washed Blue Linen Blend Dressing Gown",
        price: "£68.00",
        image: "/hero-5.webp",
        alt: "Washed blue linen blend dressing gown",
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
            <ProductCard
              key={product.name}
              product={product}
              href={`/collections/${slugify(tabs[active].label)}`}
            />
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
        <p className="mt-1.5 text-sm font-light text-foreground/70">{product.price}</p>
      </Link>
    </article>
  );
}
