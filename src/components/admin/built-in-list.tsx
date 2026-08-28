"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ProductMedia } from "@/components/product-media";
import { Button } from "@/components/ui/button";
import { removeBuiltInProduct } from "@/app/admin/actions";
import type { Product } from "@/lib/products";

/**
 * Built-in pieces have no database row, so removing one records the id as
 * hidden. There is no way back from the panel — the piece is off the site for
 * good, which is why the confirm below spells that out.
 */
function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await removeBuiltInProduct({ ok: false, message: "" }, formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form
      action={submit}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove “${name}” from the store for good? This cannot be undone here.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 />}
        Remove
      </Button>
    </form>
  );
}

export function BuiltInList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Every built-in piece has been removed from the site.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {products.map((product) => {
        return (
          <li
            key={product.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
          >
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
              <ProductMedia
                image={product.image}
                video={product.video}
                alt={product.alt}
                sizes="80px"
                compact
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="font-heading text-sm font-medium">{product.name}</p>
                <span className="text-sm">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                {!product.inStock ? (
                  <span className="text-xs text-destructive">Out of stock</span>
                ) : null}
              </div>

              {product.blurb ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {product.blurb}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.category ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">
                    Shop · {product.category}
                  </span>
                ) : null}
                {[product.fabric, product.colour, product.occasion]
                  .filter(Boolean)
                  .map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-border px-2.5 py-1 text-[0.7rem] text-muted-foreground">
                Built in
              </span>
              <DeleteButton id={product.id} name={product.name} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
