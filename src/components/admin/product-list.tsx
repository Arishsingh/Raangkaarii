"use client";

import * as React from "react";
import { ProductMedia } from "@/components/product-media";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { removeProduct } from "@/app/admin/actions";
import type { AdminProduct } from "@/lib/catalog-store";

function titleFor(slug: string, headings: Map<string, string>) {
  return headings.get(slug) ?? slug;
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await removeProduct({ ok: false, message: "" }, formData);
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
        if (!window.confirm(`Remove “${name}” from the store?`)) {
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

export function ProductList({
  products,
  headings,
}: {
  products: AdminProduct[];
  headings: { slug: string; title: string }[];
}) {
  const lookup = React.useMemo(
    () => new Map(headings.map((entry) => [entry.slug, entry.title])),
    [headings],
  );

  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nothing added yet. Use the form to put your first piece on the site.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {products.map((product) => (
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
              <span className="text-sm">₹{product.price.toLocaleString("en-IN")}</span>
              {product.compareAt ? (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{product.compareAt.toLocaleString("en-IN")}
                </span>
              ) : null}
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
              {product.collections.map((slug) => (
                <Link
                  key={slug}
                  href={`/collections/${slug}`}
                  className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground transition hover:text-foreground"
                >
                  {titleFor(slug, lookup)}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin?edit=${encodeURIComponent(product.id)}`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            <DeleteButton id={product.id} name={product.name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
