"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { quickEditProduct, removeProduct } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/products";
import { sizeChoices } from "@/lib/products";
import { cn } from "@/lib/utils";

const field =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/**
 * The admin's pencil on a shop card. Opens the few fields a piece needs to go
 * on sale — name, price, sizes — without leaving the shop, so pricing a batch
 * of imported pieces is one card after another.
 */
export function QuickEdit({
  product,
  className,
}: {
  product: Pick<Product, "id" | "name" | "price" | "compareAt" | "blurb" | "sizes" | "inStock">;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [sizes, setSizes] = React.useState<string[]>(product.sizes);
  const priceRef = React.useRef<HTMLInputElement>(null);
  const [price, setPrice] = React.useState(product.price > 0 ? String(product.price) : "");
  const [was, setWas] = React.useState(product.compareAt ? String(product.compareAt) : "");
  const [showWas, setShowWas] = React.useState(Boolean(product.compareAt));

  const priceValue = Number(price);
  const wasValue = Number(was);
  // Said before saving, so a typo like ₹2,222,222 is caught while typing.
  const wasProblem =
    showWas && was !== "" && priceValue > 0 && wasValue <= priceValue
      ? "Must be higher than the price — or remove it."
      : null;
  const discount =
    showWas && was !== "" && priceValue > 0 && wasValue > priceValue
      ? Math.round((1 - priceValue / wasValue) * 100)
      : null;
  const [deleting, startDelete] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  const remove = () =>
    startDelete(async () => {
      const data = new FormData();
      data.set("id", product.id);
      const result = await removeProduct({ ok: false, message: "" }, data);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await quickEditProduct({
        id: product.id,
        name: String(data.get("name") ?? ""),
        price: Number(data.get("price")),
        // Removed or left empty means no offer.
        compareAt: showWas && was !== "" ? Number(was) : null,
        blurb: String(data.get("blurb") ?? ""),
        sizes,
        inStock: data.get("inStock") === "on",
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // The card underneath is a link; this must not follow it.
          event.preventDefault();
          event.stopPropagation();
          // Reopening shows what is saved now, not what was half-typed last time.
          setSizes(product.sizes);
          setPrice(product.price > 0 ? String(product.price) : "");
          setWas(product.compareAt ? String(product.compareAt) : "");
          setShowWas(Boolean(product.compareAt));
          setConfirming(false);
          setOpen(true);
        }}
        aria-label={`Edit ${product.name}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-black shadow-sm backdrop-blur transition hover:bg-white",
          className,
        )}
      >
        <Pencil className="size-3.5" />
        Edit
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          // Width set outright: the responsive max-width on the base dialog was
          // not taking effect, and the form stretched across the screen.
          className="max-h-[92dvh] w-[min(92vw,32rem)] max-w-none overflow-y-auto sm:max-w-none"
          onOpenAutoFocus={(event) => {
            // Pricing is the usual job, so land there rather than on the name.
            event.preventDefault();
            priceRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit piece</DialogTitle>
            <DialogDescription>
              Changes go live on the site as soon as you save.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</span>
              <input name="name" required defaultValue={product.name} className={field} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Price (₹)</span>
              <input
                ref={priceRef}
                name="price"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="2499"
                className={field}
              />
            </label>

            {/* Optional: only for a piece on offer. Hidden until asked for. */}
            {showWas ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor={`was-${product.id}`}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Was price (₹) <span className="normal-case tracking-normal">— optional</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setWas("");
                      setShowWas(false);
                    }}
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  id={`was-${product.id}`}
                  name="compareAt"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={was}
                  onChange={(event) => setWas(event.target.value)}
                  placeholder="The higher, original price"
                  className={field}
                />
                <span
                  className={cn(
                    "text-xs",
                    wasProblem ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {wasProblem ??
                    (discount
                      ? `Customers will see ₹${Number(was).toLocaleString("en-IN")} crossed out — ${discount}% off.`
                      : "Shown crossed out beside the price.")}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowWas(true)}
                className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                + Add was price (show a discount)
              </button>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</span>
              <textarea
                name="blurb"
                rows={2}
                defaultValue={product.blurb}
                placeholder="Cotton suit with hand embroidery, dupatta included"
                className={cn(field, "h-auto py-2")}
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sizes</span>
              <div className="flex flex-wrap gap-1.5">
                {sizeChoices.map((size) => {
                  const on = sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSizes((current) =>
                          on ? current.filter((entry) => entry !== size) : [...current, size],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:border-ring",
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="inStock" defaultChecked={product.inStock} className="size-4" />
              In stock
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              {confirming ? (
                <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2.5">
                  <p className="text-sm text-destructive">
                    Delete “{product.name}” from the shop? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
                      Keep it
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={remove} disabled={deleting}>
                      {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 />}
                      Yes, delete
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(true)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 />
                  Delete
                </Button>
              )}
              <Link
                href={`/admin?edit=${encodeURIComponent(product.id)}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <ExternalLink className="size-3.5" />
                Photos, category & more
              </Link>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || Boolean(wasProblem)}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
