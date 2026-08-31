import Link from "next/link";
import {
  ArrowRight,
  Clock,
  IndianRupee,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, rupees } from "@/lib/format";
import type { RevenueStats } from "@/lib/orders-store";

/**
 * The at-a-glance strip on the admin landing page. It reads the same
 * getRevenueStats the Revenue page does — one query, already counted in SQL —
 * so the numbers here can never disagree with the numbers there.
 */
export function AdminOverview({ stats }: { stats: RevenueStats }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-light">Today at a glance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live order and payment activity across the site.
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Manage orders
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {stats.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {stats.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={rupees(stats.total)}
          hint={`${rupees(stats.thisMonth)} this month`}
          icon={IndianRupee}
        />
        <StatCard
          label="Pending"
          value={stats.pendingCount}
          hint="Awaiting activation"
          icon={Clock}
        />
        <StatCard
          label="Shipped"
          value={stats.shippedCount}
          hint="Courier booked"
          icon={Truck}
        />
        <StatCard
          label="Failed"
          value={stats.failedCount}
          hint="Payment did not go through"
          icon={XCircle}
        />
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <ShoppingBag className="size-4 text-muted-foreground" />
            Recent orders
          </h3>
          <Link
            href="/admin/orders"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </Link>
        </div>

        {stats.recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No orders yet. They appear here as soon as the first one is placed.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {/* Only the newest few; the orders page is the full list. */}
            {stats.recent.slice(0, 6).map((order) => (
              <li key={order.id}>
                <Link
                  href="/admin/orders"
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-sm font-semibold">
                      #{order.id}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {order.name || order.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(order.placedAt)}
                    </span>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {rupees(order.payable)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
