"use client";

import * as React from "react";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { PricePanel } from "@/components/checkout-flow";
import type { Product } from "@/lib/products";
import { priceBreakdown } from "@/lib/orders";

export function CartView({ products }: { products: Product[] }) {
  const cart = useCart();
  const lines = cart?.lines ?? [];

  // Resolved against the catalogue the server sent, which includes everything
  // added through the admin panel — the built-in list alone did not.
  const catalogue = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const rows = lines
    .map((line) => ({ line, product: catalogue.get(line.id) ?? null }))
    .filter((row) => row.product !== null);

  const subtotal = rows.reduce(
    (total, row) => total + row.product!.price * row.line.qty,
    0,
  );
  const itemCount = rows.reduce((total, row) => total + row.line.qty, 0);
  const totals = priceBreakdown(subtotal, itemCount);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8">
      <nav className="text-xs font-light text-foreground/50">
        <span>Your account</span>
        <span className="px-1.5">·</span>
        <span className="text-foreground">Cart</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl">Your cart</h1>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-light transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          Back to all pieces
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-24 text-center text-sm font-light text-foreground/60">
          Your cart is empty — add a piece to see it here.
        </p>
      ) : (
        <>
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid auto-rows-fr gap-5 sm:grid-cols-2">
              {rows.map(({ line, product }) => (
                <article
                  key={`${line.id}-${line.size}`}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card"
                >
                  <div className="flex flex-1 flex-col p-5">
                    <Link href={`/dashboard/product/${product!.id}`}>
                      <h2 className="line-clamp-2 font-serif text-xl leading-snug transition-opacity hover:opacity-70">
                        {product!.name}
                      </h2>
                    </Link>
                    <p className="mt-1.5 text-sm font-light text-foreground/60">
                      Size {line.size} · {product!.fabric}
                    </p>
                    <p className="mt-3 flex flex-wrap items-baseline gap-2 text-base">
                      <span>
                        ₹{(product!.price * line.qty).toLocaleString("en-IN")}
                      </span>
                      {line.qty > 1 ? (
                        <span className="text-sm font-light text-foreground/55">
                          ₹{product!.price.toLocaleString("en-IN")} each
                        </span>
                      ) : null}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <div className="flex items-center gap-1 rounded-full border p-1">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            cart?.setQty(line.id, line.size, line.qty - 1)
                          }
                          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            cart?.setQty(line.id, line.size, line.qty + 1)
                          }
                          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${product!.name}`}
                        onClick={() => cart?.remove(line.id, line.size)}
                        className="flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-muted"
                      >
                        <Trash2 className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="space-y-4">
              <PricePanel totals={totals} />
              <div className="flex flex-wrap gap-3">
                <Button asChild className="flex-1 rounded-full">
                  <Link href="/dashboard/checkout">Place order</Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full px-6"
                  onClick={() => {
                    cart?.clear();
                    toast.success("Cart cleared");
                  }}
                >
                  Clear
                </Button>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
