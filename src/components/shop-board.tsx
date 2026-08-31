"use client";

import * as React from "react";
import { ArrowLeft, Heart, Search, ShoppingBag, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ProductMedia } from "@/components/product-media";
import { ShopFilters } from "@/components/shop-filters";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import {
  MAX_PRICE,
  filterFields,
  filterGroups as builtInFilterGroups,
  products as builtInProducts,
  type Product,
} from "@/lib/products";
import type { FilterGroup } from "@/components/shop-filters";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const tabs = ["All", "New Arrivals", "Sale"];

export function ShopBoard({
  name,
  products = builtInProducts,
  filterGroups = builtInFilterGroups,
  maxPrice = MAX_PRICE,
}: {
  name: string;
  products?: Product[];
  filterGroups?: FilterGroup[];
  /** Ceiling of the price slider; derived from the catalogue, never fixed. */
  maxPrice?: number;
}) {
  const searchParams = useSearchParams();
  const lovedView = searchParams.get("view") === "loved";
  const [selected, setSelected] = React.useState<Record<string, string[]>>({});
  const [price, setPrice] = React.useState(maxPrice);
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState("All");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const wishlist = useWishlist();
  const cart = useCart();
  // Stable identity: a fresh [] each render re-ran the product filter every time.
  const loved = React.useMemo(() => wishlist?.items ?? [], [wishlist?.items]);

  const toggleFilter = (heading: string, option: string) => {
    setSelected((current) => {
      const chosen = current[heading] ?? [];
      return {
        ...current,
        [heading]: chosen.includes(option)
          ? chosen.filter((value) => value !== option)
          : [...chosen, option],
      };
    });
  };

  const activeCount =
    Object.values(selected).reduce((total, chosen) => total + chosen.length, 0) +
    (price < maxPrice ? 1 : 0);

  const clearAll = () => {
    setSelected({});
    setPrice(maxPrice);
  };

  const filterPanel = (
    <ShopFilters
      groups={filterGroups}
      selected={selected}
      onToggle={toggleFilter}
      onResetGroup={(heading) =>
        setSelected((current) => ({ ...current, [heading]: [] }))
      }
      price={price}
      onPriceChange={setPrice}
      maxPrice={maxPrice}
    />
  );

  const visible = React.useMemo(() => {
    return products.filter((product) => {
      // Simple field filters share one loop; size and availability differ.
      for (const [heading, field] of Object.entries(filterFields)) {
        const chosen = selected[heading] ?? [];
        if (chosen.length && !chosen.includes(String(product[field]))) return false;
      }

      // Multi-value, so a match on any one heading is enough.
      const collections = selected.Collection ?? [];
      if (
        collections.length &&
        !collections.some((entry) => (product.collections ?? []).includes(entry))
      ) {
        return false;
      }

      const sizes = selected.Size ?? [];
      if (sizes.length && !sizes.some((size) => product.sizes.includes(size))) {
        return false;
      }

      const availability = selected.Availability ?? [];
      if (
        availability.length &&
        !availability.some((option) =>
          option === "In stock" ? product.inStock : !product.inStock,
        )
      ) {
        return false;
      }

      if (product.price > price) return false;
      if (query && !`${product.name} ${product.blurb}`.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (lovedView && !loved.includes(product.id)) return false;
      if (tab === "Sale" && product.price >= 4000) return false;
      if (tab === "New Arrivals" && product.price < 3000) return false;
      return true;
    });
  }, [loved, lovedView, price, products, query, selected, tab]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground/40" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the collection…"
            aria-label="Search products"
            className="rounded-full pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Below md the rail collapses into a drawer so it never
              pushes the pieces off the first screen. */}
          {lovedView ? null : (
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-light transition-colors hover:bg-muted md:hidden"
                >
                  <SlidersHorizontal className="size-4" strokeWidth={1.5} />
                  Filters
                  {activeCount > 0 ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
                      {activeCount}
                    </span>
                  ) : null}
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[85vw] gap-0 p-0 sm:max-w-sm"
              >
                <SheetHeader className="border-b px-5 py-4">
                  <SheetTitle className="font-serif text-lg">Filters</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-5 py-6">
                  {filterPanel}
                </div>
                <div className="flex items-center gap-3 border-t px-5 py-4">
                  <button
                    type="button"
                    onClick={clearAll}
                    className="flex-1 rounded-full border py-2.5 text-sm font-light transition-colors hover:bg-muted"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="flex-1 rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
                  >
                    Show {visible.length}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          )}
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "rounded-full border px-5 py-2 text-sm font-light transition-colors",
                tab === item
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-muted",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Greeting stays to one line: the collection is the landing view. */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl sm:text-3xl">
          Welcome back, {name}
        </h1>

      </div>

      {/* Breadcrumb */}
      <nav className="mt-8 text-xs font-light text-foreground/50">
        <span>Your account</span>
        <span className="px-1.5">·</span>
        <span className="text-foreground">
          {lovedView ? "Loved" : "Your Collection"}
        </span>
      </nav>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">
          {lovedView ? "Loved pieces" : "Your Collection"}
        </h2>
        {lovedView ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-light transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} />
            Back to all pieces
          </Link>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-6 grid items-start gap-8",
          lovedView
            ? ""
            : "md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)]",
        )}
      >
        {lovedView ? null : (
          <div className="hidden md:sticky md:top-6 md:block md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:pr-2 md:pb-2">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-lg">Filters</h3>
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-light text-foreground/55 transition-colors hover:text-foreground"
                >
                  Clear all
                </button>
              ) : null}
            </div>
            {filterPanel}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="py-24 text-center text-sm font-light text-foreground/60">
            {lovedView && loved.length === 0
              ? "You have not loved anything yet — tap the heart on a piece to save it here."
              : "Nothing matches those filters yet."}
          </p>
        ) : (
          <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((product) => {
              const saved = loved.includes(product.id);
              return (
                <article
                  key={product.id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card"
                >
                  <Link
                    href={`/dashboard/product/${product.id}`}
                    className="relative block aspect-[4/5] shrink-0 bg-muted"
                  >
                    <ProductMedia
                      image={product.image}
                      video={product.video}
                      alt={product.alt}
                      // Accounts for the filter rail: cards are narrower than
                      // the raw viewport fractions would suggest.
                      sizes="(min-width: 1280px) 340px, (min-width: 768px) 30vw, (min-width: 640px) 45vw, 90vw"
                      compact
                    />
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <Link href={`/dashboard/product/${product.id}`}>
                      <h3 className="line-clamp-2 font-serif text-xl leading-snug transition-opacity hover:opacity-70">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="mt-1.5 line-clamp-2 text-sm font-light leading-relaxed text-foreground/60">
                      {product.blurb}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      {/* Buying needs a size, so this opens the piece's page. */}
                      <Link
                        href={`/dashboard/product/${product.id}`}
                        className="rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85"
                      >
                        Buy
                      </Link>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
                          aria-pressed={saved}
                          onClick={() => wishlist?.toggle(product.id)}
                          className="flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-muted"
                        >
                          <Heart
                            className={cn("size-4", saved && "fill-red-500 text-red-500")}
                            strokeWidth={1.5}
                          />
                        </button>
                        <button
                          type="button"
                          aria-label={`Add ${product.name} to cart`}
                          onClick={() => {
                            cart?.add(product.id, product.sizes[0]);
                            toast.success(`${product.name} added to your cart`);
                          }}
                          className="flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85"
                        >
                          <ShoppingBag className="size-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
