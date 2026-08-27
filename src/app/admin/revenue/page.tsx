import { CreditCard, IndianRupee, Receipt, TrendingUp } from "lucide-react";

import { RevenueChart } from "@/components/admin/revenue-chart";
import { StatCard } from "@/components/admin/stat-card";
import { getRevenueStats } from "@/lib/orders-store";

export const metadata = { title: "Revenue — Admin" };

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminRevenuePage() {
  const stats = await getRevenueStats();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-light">Revenue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every order placed through checkout, recorded server-side.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={rupees(stats.total)}
          hint={`${stats.orderCount.toLocaleString("en-IN")} orders all time`}
          icon={IndianRupee}
        />
        <StatCard
          label="This month"
          value={rupees(stats.thisMonth)}
          hint={`${rupees(stats.last30)} in the last 30 days`}
          icon={TrendingUp}
        />
        <StatCard
          label="Average order"
          value={rupees(stats.averageOrder)}
          hint="Total revenue ÷ orders"
          icon={Receipt}
        />
        <StatCard
          label="Paid online"
          value={`${stats.paidShare}%`}
          hint="Razorpay rather than cash on delivery"
          icon={CreditCard}
        />
      </section>

      {stats.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {stats.error}
        </p>
      ) : null}

      <RevenueChart data={stats.daily} />

      <section>
        <h3 className="font-heading text-lg font-light">Recent orders</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          The latest {stats.recent.length || 0} orders.
        </p>

        {stats.recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No orders yet. One will appear here as soon as a customer completes
            checkout.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Placed</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                    <td className="px-4 py-3">
                      <span className="block truncate">{order.name || "—"}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {order.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{order.items}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          order.paymentId
                            ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                            : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        }
                      >
                        {order.paymentId ? "Paid" : order.payment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {rupees(order.payable)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(order.placedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
