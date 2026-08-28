import Link from "next/link";

import { ProductForm, type FormOptions } from "@/components/admin/product-form";
import { listAdminProducts } from "@/lib/catalog-store";
import { collectionHeadings } from "@/lib/collections";
import { isDatabaseConfigured } from "@/lib/db";
import { categories, fabrics, sizeChoices } from "@/lib/products";

export const metadata = { title: "Add product — Admin" };

const IMAGES = ["/hero.png", "/hero-2.png", "/hero-3.png", "/hero-4.png", "/hero-5.png"];

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin">) {
  const { edit } = await searchParams;
  const editingId = typeof edit === "string" ? edit : undefined;

  const added = await listAdminProducts();
  const editing = editingId
    ? (added.find((entry) => entry.id === editingId) ?? null)
    : null;

  const headings = collectionHeadings();
  const options: FormOptions = {
    categories: [...categories].sort(),
    collections: headings,
    // The built-in range plus anything already typed in, so a fabric only ever
    // has to be spelled out once.
    fabrics: [
      ...new Set([...fabrics, ...added.map((entry) => entry.fabric)]),
    ]
      .filter(Boolean)
      .sort(),
    images: IMAGES,
    sizes: sizeChoices,
  };

  return (
    <div className="space-y-12">
      {!isDatabaseConfigured() ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          DATABASE_URL is not set, so products cannot be saved. Run{" "}
          <code className="font-mono text-xs">vercel env pull .env.local</code> and
          restart the dev server.
        </p>
      ) : null}

      <section>
        <h2 className="font-heading text-2xl font-light">
          {editing ? `Edit “${editing.name}”` : "Add a product"}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Add the image or video, a name and price, then say where it belongs.
          It goes live for customers as soon as you save.
        </p>
        <ProductForm key={editing?.id ?? "new"} options={options} editing={editing} />
      </section>

      <p className="text-sm text-muted-foreground">
        {added.length === 0
          ? "Nothing posted yet."
          : `${added.length} product${added.length === 1 ? "" : "s"} posted so far — `}
        <Link href="/admin/products" className="underline underline-offset-4">
          see everything on the site
        </Link>
        .
      </p>
    </div>
  );
}
