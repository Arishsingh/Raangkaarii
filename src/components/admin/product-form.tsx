"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  CheckChip,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/field";
import { MediaUpload } from "@/components/admin/media-upload";
import { Button } from "@/components/ui/button";
import { saveProduct } from "@/app/admin/actions";
import type { AdminProduct } from "@/lib/catalog-store";
import { cn } from "@/lib/utils";

export type HeadingOption = { slug: string; title: string };

export type FormOptions = {
  categories: string[];
  collections: HeadingOption[];
  /** Fabrics already in use, offered as suggestions — a new one can be typed. */
  fabrics: string[];
  images: string[];
  sizes: string[];
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-heading text-sm font-medium">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProductForm({
  options,
  editing,
}: {
  options: FormOptions;
  editing: AdminProduct | null;
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [pending, startTransition] = React.useTransition();
  const [image, setImage] = React.useState(editing?.image ?? "");
  const [video, setVideo] = React.useState(editing?.video ?? "");
  const [filter, setFilter] = React.useState("");

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await saveProduct({ ok: false, message: "" }, formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (editing) {
        router.push("/admin");
      } else {
        formRef.current?.reset();
        setImage("");
        setVideo("");
      }
      router.refresh();
    });
  };

  const visibleCollections = React.useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return options.collections;
    return options.collections.filter((entry) =>
      entry.title.toLowerCase().includes(term),
    );
  }, [filter, options.collections]);

  return (
    <form ref={formRef} action={submit} className="space-y-4">
      {editing ? <input type="hidden" name="editingId" value={editing.id} /> : null}

      <Section
        title="Image or video"
        description="Upload a photo, a video, or both — whichever you add is what customers see."
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <MediaUpload kind="image" onUploaded={setImage} />
            <MediaUpload kind="video" onUploaded={setVideo} />
          </div>

          <div className="flex flex-wrap gap-2">
            {options.images.map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setImage(image === source ? "" : source)}
                aria-pressed={image === source}
                className={cn(
                  "relative size-16 overflow-hidden rounded-md border-2 transition",
                  image === source
                    ? "border-primary"
                    : "border-transparent hover:border-input",
                )}
              >
                <Image src={source} alt="" fill sizes="64px" unoptimized className="object-cover" />
                {image === source ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/35">
                    <Check className="size-4 text-white" />
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Hidden: the URLs are set by the uploaders and the picker above. */}
          <input type="hidden" name="image" value={image} />
          <input type="hidden" name="video" value={video} />

          <div className="flex flex-wrap gap-4">
            {image ? (
              <div className="relative">
                <div className="relative h-44 w-36 overflow-hidden rounded-md border border-input bg-muted">
                  <Image src={image} alt="" fill sizes="144px" unoptimized className="object-cover" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="absolute right-1 top-1 bg-background/80"
                  onClick={() => setImage("")}
                >
                  <X />
                  Remove
                </Button>
              </div>
            ) : null}
            {video ? (
              <div className="relative">
                <video
                  key={video}
                  src={video}
                  controls
                  playsInline
                  className="h-44 w-64 rounded-md border border-input bg-black object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="absolute right-1 top-1 bg-background/80"
                  onClick={() => setVideo("")}
                >
                  <X />
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section
        title="Name, price and description"
        description="What the customer sees on the card."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <TextInput
              name="name"
              required
              defaultValue={editing?.name}
              placeholder="Hand-Embroidered Kurta Set"
            />
          </Field>
          <Field label="Price (₹)" hint="What the customer actually pays.">
            <TextInput
              name="price"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={editing?.price}
              placeholder="4200"
            />
          </Field>
          <Field
            label="Was price (₹)"
            hint="Optional. Shown crossed out beside the price, with the saving worked out. Leave empty for no offer."
            className="sm:col-span-2"
          >
            <TextInput
              name="compareAt"
              type="number"
              min={1}
              step={1}
              defaultValue={editing?.compareAt ?? ""}
              placeholder="5600"
            />
          </Field>
          <Field
            label="Description"
            hint="One line under the name, on the card and the product page. Optional."
            className="sm:col-span-2"
          >
            <TextArea
              name="blurb"
              rows={2}
              defaultValue={editing?.blurb}
              placeholder="Cotton voile kurta with hand-worked thread detail"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Category and heading"
        description="Where the product shows up. Fill in either one, or both."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Category"
              hint="Its heading in the shop customers see when signed in."
            >
              <Select name="category" defaultValue={editing?.category ?? ""}>
                <option value="">— not listed in the shop —</option>
                {options.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Fabric"
              hint="Pick one already in use or type a new one. It drives the shop's Fabric filter. Defaults to Cotton."
            >
              <TextInput
                name="fabric"
                list="fabric-options"
                defaultValue={editing?.fabric ?? ""}
                placeholder="Cotton Voile"
              />
              <datalist id="fabric-options">
                {options.fabrics.map((fabric) => (
                  <option key={fabric} value={fabric} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Heading
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <TextInput
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter headings…"
                className="pl-9"
              />
            </div>
            <div className="mt-1 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-input bg-background p-3">
              {visibleCollections.length === 0 ? (
                <p className="text-xs text-muted-foreground">No heading matches that.</p>
              ) : (
                visibleCollections.map((entry) => (
                  <CheckChip
                    key={entry.slug}
                    name="collections"
                    value={entry.slug}
                    label={entry.title}
                    defaultChecked={editing?.collections.includes(entry.slug)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Sizes"
        description="What the customer can pick on the product page."
      >
        <div className="flex flex-wrap gap-1.5">
          {options.sizes.map((size) => (
            <CheckChip
              key={size}
              name="sizes"
              value={size}
              label={size}
              defaultChecked={editing?.sizes.includes(size)}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Leave every one unticked to offer XS to XXL.
        </p>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {editing ? "Save changes" : "Add to store"}
        </Button>
        {editing ? (
          <Button asChild variant="ghost">
            <Link href="/admin">
              <X className="size-4" />
              Cancel
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
