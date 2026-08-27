import Link from "next/link";
import { Boxes, PackageX, Sparkles, Video } from "lucide-react";

import { ProductList } from "@/components/admin/product-list";
import { StatCard } from "@/components/admin/stat-card";
import { getCatalogCounts } from "@/lib/catalog";
import { listAdminProducts } from "@/lib/catalog-store";
import { collectionHeadings } from "@/lib/collections";

export const metadata = { title: "Products on site — Admin" };

function Breakdown({
  title,
  description,
  rows,
  empty,
}: {
  title: string;
  description: string;
  rows: { label: string; count: number }[];
  empty: string;
}) {
  const most = Math.max(1, ...rows.map((row) => row.count));

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-heading text-sm font-medium">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 truncate">{row.label}</span>
              {/* A plain magnitude bar: one hue, longer means more. */}
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(row.count / most) * 100}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AdminProductsOverviewPage() {
  const [counts, added] = await Promise.all([
    getCatalogCounts(),
    listAdminProducts(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-light">Products on site</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything a customer can browse right now.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live on the site"
          value={counts.total.toLocaleString("en-IN")}
          hint={`${counts.added} yours · ${counts.builtIn} built in`}
          icon={Boxes}
        />
        <StatCard
          label="Added by you"
          value={counts.added.toLocaleString("en-IN")}
          hint="Posted through this panel"
          icon={Sparkles}
        />
        <StatCard
          label="With a video"
          value={counts.withVideo.toLocaleString("en-IN")}
          hint="Yours that play a clip"
          icon={Video}
        />
        <StatCard
          label="Out of stock"
          value={counts.outOfStock.toLocaleString("en-IN")}
          hint="Hidden behind the stock filter"
          icon={PackageX}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="By category"
          description="How the whole shop splits across its headings."
          rows={counts.byCategory}
          empty="No categories yet."
        />
        <Breakdown
          title="By collection"
          description="Your products only. Every one carries “Just added”."
          rows={counts.byCollection}
          empty="Nothing added through the panel yet."
        />
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-light">Your products</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Posted through this panel. The built-in range is not listed here.
            </p>
          </div>
          <Link href="/admin" className="shrink-0 text-sm underline underline-offset-4">
            Add another
          </Link>
        </div>
        <ProductList products={added} headings={collectionHeadings()} />
      </section>
    </div>
  );
}
