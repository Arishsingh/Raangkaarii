"use client";

import * as React from "react";
import { ProductMedia } from "@/components/product-media";
import Link from "next/link";
import { ChevronDown, Heart, ShoppingBag, SlidersHorizontal, Star } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  filterGroups,
  sortOptions,
  type Collection,
  type Product,
  type SortOption,
} from "@/lib/collections";
import { cn } from "@/lib/utils";

type Selections = Record<string, string[]>;

export function CollectionView({ collection }: { collection: Collection }) {
  const [showFilters, setShowFilters] = React.useState(true);
  const [selections, setSelections] = React.useState<Selections>({});
  const [sort, setSort] = React.useState<SortOption>("Featured");

  const toggle = (key: string, option: string) => {
    setSelections((current) => {
      const chosen = current[key] ?? [];
      const next = chosen.includes(option)
        ? chosen.filter((value) => value !== option)
        : [...chosen, option];
      return { ...current, [key]: next };
    });
  };

  const products = React.useMemo(() => {
    const filtered = collection.products.filter((product) =>
      filterGroups.every((group) => {
        const chosen = selections[group.key];
        if (!chosen?.length) return true;
        if (group.key === "availability") {
          return chosen.some((option) =>
            option === "In stock" ? product.inStock : !product.inStock,
          );
        }
        if (group.key === "sizes") {
          return chosen.some((option) => product.sizes.includes(option));
        }
        return chosen.includes(product[group.key]);
      }),
    );

    const sorted = [...filtered];
    if (sort === "Price, low to high") sorted.sort((a, b) => a.price - b.price);
    if (sort === "Price, high to low") sorted.sort((a, b) => b.price - a.price);
    if (sort === "Best rated") sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [collection.products, selections, sort]);

  const activeCount = Object.values(selections).flat().length;

  return (
    <>
      {/* Title banner */}
      <div className="mx-auto w-full max-w-[1600px] px-5 pt-6 sm:px-8">
        <div className="bg-blush px-8 py-12 text-blush-foreground sm:px-12 sm:py-16">
          <h1 className="font-serif text-4xl uppercase tracking-[0.02em] sm:text-5xl">
            {collection.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-8">
        <div className="border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowFilters((open) => !open)}
                className="flex items-center gap-2 text-[15px] font-light transition-opacity hover:opacity-70"
              >
                <SlidersHorizontal className="size-4" strokeWidth={1.5} />
                {showFilters ? "Hide filters" : "Show filters"}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-200",
                    showFilters && "rotate-180",
                  )}
                />
              </button>
              <span className="text-sm font-light text-foreground/60">
                {products.length} Result{products.length === 1 ? "" : "s"}
              </span>
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelections({})}
                  className="text-sm font-light underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Clear all
                </button>
              ) : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 text-[15px] font-light outline-none transition-opacity hover:opacity-70">
                Sort: {sort}
                <ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => setSort(value as SortOption)}
                >
                  {sortOptions.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {showFilters ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {filterGroups.map((group) => {
                const chosen = selections[group.key] ?? [];
                return (
                  <DropdownMenu key={group.label}>
                    <DropdownMenuTrigger
                      className={cn(
                        "flex items-center gap-2 border px-4 py-2 text-sm font-light outline-none transition-colors hover:bg-muted",
                        chosen.length > 0 && "border-foreground",
                      )}
                    >
                      {group.label}
                      {chosen.length > 0 ? ` (${chosen.length})` : ""}
                      <ChevronDown className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                      {group.options.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option}
                          checked={chosen.includes(option)}
                          onCheckedChange={() => toggle(group.key, option)}
                          onSelect={(event) => event.preventDefault()}
                        >
                          {option}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
            </div>
          ) : null}
        </div>

        {products.length === 0 ? (
          <p className="py-24 text-center text-sm font-light text-foreground/60">
            No products match those filters.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discount = product.compareAt
    ? Math.round((1 - product.price / product.compareAt) * 100)
    : 0;

  return (
    <article>
      <Link href="#" className="group block">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <ProductMedia
            image={product.image}
            video={product.video}
            alt={product.alt}
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            compact
          />

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.badges.map((badge) => (
              <span
                key={badge}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium tracking-[0.12em]",
                  badge === "SALE"
                    ? "bg-background text-destructive"
                    : "bg-background text-foreground",
                )}
              >
                {badge}
              </span>
            ))}
          </div>

          <span className="absolute bottom-3 left-3 flex items-center gap-1 bg-background px-2 py-1 text-[11px] font-light">
            <Star className="size-3 fill-foreground" strokeWidth={0} />
            {product.rating.toFixed(1)}
          </span>

          <span
            role="button"
            aria-label="Add to wishlist"
            className="absolute bottom-3 right-3 p-1 text-foreground/70 transition-colors hover:text-foreground pointer-coarse:bottom-2 pointer-coarse:right-2 pointer-coarse:p-2.5"
          >
            <Heart className="size-4" strokeWidth={1.5} />
          </span>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-base leading-snug">{product.name}</h3>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-light">
              <span>£{product.price.toFixed(2)}</span>
              {product.compareAt ? (
                <>
                  <span className="text-foreground/45 line-through">
                    £{product.compareAt.toFixed(2)}
                  </span>
                  <span className="bg-destructive px-1.5 py-0.5 text-[11px] text-white">
                    {discount}% off
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <span
            role="button"
            aria-label="Add to cart"
            className="mt-1 shrink-0 p-1 text-foreground/70 transition-colors hover:text-foreground"
          >
            <ShoppingBag className="size-4" strokeWidth={1.5} />
          </span>
        </div>
      </Link>
    </article>
  );
}
