import Link from "next/link";

import { AdminOverview } from "@/components/admin/admin-overview";
import { ProductForm, type FormOptions } from "@/components/admin/product-form";
import { listAdminProducts } from "@/lib/catalog-store";
import { collectionHeadings } from "@/lib/collections";
import { isDatabaseConfigured } from "@/lib/db";
import { getRevenueStats } from "@/lib/orders-store";
import { syncRazorpayPayments } from "@/lib/razorpay-sync";
import { categories, fabrics, sizeChoices } from "@/lib/products";

export const metadata = { title: "Add product — Admin" };

/** Takings move at Razorpay, so this page is read fresh rather than cached. */
export const dynamic = "force-dynamic";

const IMAGES = ["/hero.webp", "/hero-2.webp", "/hero-3.webp", "/hero-4.webp", "/hero-5.webp"];

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin">) {
  const { edit } = await searchParams;
  const editingId = typeof edit === "string" ? edit : undefined;

  /**
   * Razorpay is asked first, so the takings below count a payment the webhook
   * may have failed to deliver. It writes only what is missing, so the read
   * that follows sees the corrected rows.
   */
  await syncRazorpayPayments();

  // Independent reads, so they overlap rather than queue.
  const [added, stats] = await Promise.all([
    listAdminProducts(),
    getRevenueStats(),
  ]);
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

      {/* Editing one product is a focused task; the dashboard would only
          get in the way, so it stands down until the edit is finished. */}
      {editing ? null : <AdminOverview stats={stats} />}

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
