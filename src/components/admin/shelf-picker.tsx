"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { TextInput } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { saveShelf } from "@/app/admin/showcase/actions";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string; image: string; category: string };

export function ShelfPicker({
  shelf,
  title,
  description,
  products,
  initial,
  max,
}: {
  shelf: "viral" | "loved";
  title: string;
  description: string;
  products: Option[];
  initial: string[];
  max: number;
}) {
  const router = useRouter();
  const byId = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  // A pick whose product has since been removed is dropped quietly.
  const [chosen, setChosen] = React.useState(() =>
    initial.filter((id) => byId.has(id)),
  );
  const [query, setQuery] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const saved = initial.filter((id) => byId.has(id)).join("|");
  const dirty = chosen.join("|") !== saved;
  const full = chosen.length >= max;

  const visible = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter(
      (product) =>
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term),
    );
  }, [products, query]);

  const toggle = (id: string) =>
    setChosen((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      if (current.length >= max) {
        toast.error(`${title} holds ${max}. Remove one first.`);
        return current;
      }
      return [...current, id];
    });

  const move = (index: number, by: -1 | 1) =>
    setChosen((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const save = () =>
    startTransition(async () => {
      const result = await saveShelf(shelf, chosen);
      if (result.ok) {
        toast.success(`${title}: ${result.message}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-base font-medium">
            {title}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {chosen.length}/{max}
            </span>
          </h3>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">{description}</p>
        </div>
        <Button type="button" onClick={save} disabled={pending || !dirty}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {dirty ? "Save shelf" : "Saved"}
        </Button>
      </div>

      {/* The shelf as it will read on the homepage, left to right. */}
      <div className="mt-4">
        {chosen.length === 0 ? (
          <p className="rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing picked — the homepage is showing automatic picks. Tap pieces
            below to choose your own.
          </p>
        ) : (
          <ol className="flex gap-3 overflow-x-auto pb-2">
            {chosen.map((id, index) => {
              const product = byId.get(id);
              if (!product) return null;
              return (
                <li key={id} className="w-32 shrink-0">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-input bg-muted">
                    {product.image ? (
                      <Image src={product.image} alt="" fill sizes="128px" unoptimized className="object-cover" />
                    ) : null}
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[0.65rem] font-medium text-primary-foreground">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      aria-label={`Remove ${product.name}`}
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded bg-background/85 transition hover:bg-background"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-snug">{product.name}</p>
                  <div className="mt-1 flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move earlier"
                    >
                      <ArrowLeft />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() => move(index, 1)}
                      disabled={index === chosen.length - 1}
                      aria-label="Move later"
                    >
                      <ArrowRight />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a piece…"
            className="pl-9"
          />
        </div>
        <div className="mt-3 grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 lg:grid-cols-8">
          {visible.map((product) => {
            const picked = chosen.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggle(product.id)}
                aria-pressed={picked}
                title={product.name}
                className={cn(
                  "group text-left",
                  !picked && full && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "relative block aspect-[4/5] overflow-hidden rounded-md border-2 bg-muted transition",
                    picked ? "border-primary" : "border-transparent group-hover:border-input",
                  )}
                >
                  {product.image ? (
                    <Image src={product.image} alt="" fill sizes="120px" unoptimized className="object-cover" />
                  ) : null}
                  <span
                    className={cn(
                      "absolute right-1 top-1 grid size-5 place-items-center rounded-full transition",
                      picked
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/85 opacity-0 group-hover:opacity-100",
                    )}
                  >
                    {picked ? <Check className="size-3" /> : <Plus className="size-3" />}
                  </span>
                </span>
                <span className="mt-1 line-clamp-1 block text-[0.7rem] text-muted-foreground">
                  {product.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
