"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  IndianRupee,
  Key,
  RefreshCw,
  Search,
  ShieldCheck,
  Webhook,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime, rupees } from "@/lib/format";
import type { StoredOrder } from "@/lib/orders-store";
import type { RazorpayConfigStatus } from "@/lib/razorpay";

/** The origin never changes for the life of the page, so nothing to subscribe to. */
const subscribeToNothing = () => () => {};

export function RazorpayDashboard({
  status,
  transactions,
}: {
  status: RazorpayConfigStatus;
  transactions: StoredOrder[];
}) {
  const [query, setQuery] = React.useState("");

  /**
   * The origin is only knowable in the browser. Reading it through
   * useSyncExternalStore gives the server an empty snapshot and the client the
   * real value in the same render — where a setState-in-effect forced a second,
   * cascading render and briefly showed the wrong webhook URL.
   */
  const origin = React.useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );

  const webhookUrl = origin ? `${origin}/api/razorpay/webhook` : "/api/razorpay/webhook";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  const filtered = React.useMemo(() => {
    if (!query.trim()) return transactions;
    const q = query.toLowerCase().trim();
    return transactions.filter(
      (tx) =>
        tx.id.toLowerCase().includes(q) ||
        tx.name.toLowerCase().includes(q) ||
        tx.email.toLowerCase().includes(q) ||
        (tx.razorpayOrderId && tx.razorpayOrderId.toLowerCase().includes(q)) ||
        (tx.paymentId && tx.paymentId.toLowerCase().includes(q)),
    );
  }, [transactions, query]);

  // One pass: the three tallies and the revenue sum all come off the same loop.
  const metrics = React.useMemo(() => {
    let totalRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const tx of transactions) {
      if (tx.status === "paid" || (tx.paymentId && tx.status !== "failed")) {
        totalRevenue += tx.payable;
        paidCount += 1;
      }
      if (tx.status === "pending") pendingCount += 1;
      if (tx.status === "failed") failedCount += 1;
    }

    return { totalRevenue, paidCount, pendingCount, failedCount };
  }, [transactions]);

  return (
    <div className="space-y-8">
      {/* Integration & Configuration Health Card */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <CreditCard className="size-5 text-primary" />
              <h3 className="font-heading text-lg font-medium">SDK & Webhook Configuration</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Razorpay payment gateway credentials & server-to-server webhook setup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status.isTestMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" /> Test Mode Active (`rzp_test_`)
              </span>
            )}
            {status.isLiveMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Live Production Mode (`rzp_live_`)
              </span>
            )}
            {!status.isConfigured && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                <XCircle className="size-3.5" /> Keys Unconfigured
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {/* Key ID Status */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Key className="size-3.5" /> RAZORPAY_KEY_ID
              </span>
              {status.keyId ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
            </div>
            <p className="mt-2 font-mono text-xs font-medium text-foreground">
              {status.maskedKeyId || "Not set in environment"}
            </p>
          </div>

          {/* Key Secret Status */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="size-3.5" /> RAZORPAY_KEY_SECRET
              </span>
              {status.hasKeySecret ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-foreground">
              {status.hasKeySecret ? "••••••••••••••••" : "Not set in environment"}
            </p>
          </div>

          {/* Webhook Secret Status */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Webhook className="size-3.5" /> RAZORPAY_WEBHOOK_SECRET
              </span>
              {status.hasWebhookSecret ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="size-4 text-amber-500" />
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-foreground">
              {status.hasWebhookSecret ? "Configured & Active" : "Missing (Webhooks unverified)"}
            </p>
          </div>
        </div>

        {/* Webhook URL Copy box */}
        <div className="mt-6 rounded-lg border border-border/70 bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Webhook Endpoint URL for Razorpay Dashboard
            </p>
            <a
              href="https://dashboard.razorpay.com/#/app/webhooks"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Open Razorpay Dashboard <ExternalLink className="size-3" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground select-all">
              {webhookUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
            >
              <Copy className="size-3.5" /> Copy URL
            </Button>
          </div>
          <p className="text-[0.75rem] text-muted-foreground">
            Configure this URL under <strong>Settings → Webhooks</strong> in your Razorpay Dashboard with events:{" "}
            <code className="rounded bg-muted px-1 font-mono">payment.captured</code> and{" "}
            <code className="rounded bg-muted px-1 font-mono">payment.failed</code>.
          </p>
        </div>

        {/* Razorpay Test Mode Cards & Sandbox Guide */}
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <CreditCard className="size-4" /> Razorpay Sandbox Test Cards & Credentials
            </h4>
            <span className="text-[0.7rem] font-mono text-muted-foreground">For Test Mode Checkout</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="rounded-md border border-border bg-background p-2.5 space-y-1">
              <p className="font-semibold text-foreground">Standard Visa (Success)</p>
              <p className="font-mono text-primary font-medium select-all">4111 1111 1111 1111</p>
              <p className="text-[0.7rem] text-muted-foreground">Exp: Any Future | CVV: 123 | OTP: 1234</p>
            </div>

            <div className="rounded-md border border-border bg-background p-2.5 space-y-1">
              <p className="font-semibold text-foreground">Mastercard (Success)</p>
              <p className="font-mono text-primary font-medium select-all">5123 4567 8901 2345</p>
              <p className="text-[0.7rem] text-muted-foreground">Exp: Any Future | CVV: 123 | OTP: Any</p>
            </div>

            <div className="rounded-md border border-border bg-background p-2.5 space-y-1">
              <p className="font-semibold text-foreground">RuPay (Success)</p>
              <p className="font-mono text-primary font-medium select-all">5081 2612 3456 7890</p>
              <p className="text-[0.7rem] text-muted-foreground">Exp: Any Future | CVV: 123 | OTP: Any</p>
            </div>

            <div className="rounded-md border border-border bg-background p-2.5 space-y-1">
              <p className="font-semibold text-foreground">Test UPI & Netbanking</p>
              <p className="font-mono text-primary font-medium select-all">success@razorpay</p>
              <p className="text-[0.7rem] text-muted-foreground">UPI VPA or pick any test bank</p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Razorpay Revenue"
          value={rupees(metrics.totalRevenue)}
          hint={`${metrics.paidCount} successful online payments`}
          icon={IndianRupee}
        />
        <StatCard
          label="Paid Online"
          value={metrics.paidCount.toString()}
          hint="Verified transactions"
          icon={CheckCircle2}
        />
        <StatCard
          label="Pending Window"
          value={metrics.pendingCount.toString()}
          hint="Unfinished checkout sessions"
          icon={RefreshCw}
        />
        <StatCard
          label="Failed Attempts"
          value={metrics.failedCount.toString()}
          hint="Declined or failed payments"
          icon={XCircle}
        />
      </section>

      {/* Transactions Table */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading text-lg font-light">Razorpay Payment Log</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Detailed record of Razorpay orders, payment IDs, customer info, and transactions.
            </p>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Order ID, Payment ID, Customer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No Razorpay transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">Razorpay Order ID</th>
                  <th className="px-4 py-3 font-medium">Payment ID</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const isPaid = tx.status === "paid" || Boolean(tx.paymentId && tx.status !== "failed");
                  const isFailed = tx.status === "failed";

                  return (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <span className="block font-medium text-foreground">{tx.name || "Customer"}</span>
                        <span className="block text-xs text-muted-foreground">{tx.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="cursor-pointer font-mono text-xs font-semibold text-primary underline underline-offset-2"
                          onClick={() => copyToClipboard(tx.id, "Order ID")}
                          title="Click to copy"
                        >
                          {tx.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {tx.razorpayOrderId ? (
                          <span
                            className="cursor-pointer hover:text-foreground"
                            onClick={() => copyToClipboard(tx.razorpayOrderId!, "Razorpay Order ID")}
                            title="Click to copy"
                          >
                            {tx.razorpayOrderId}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {tx.paymentId ? (
                          <span
                            className="cursor-pointer font-semibold text-emerald-600 dark:text-emerald-400"
                            onClick={() => copyToClipboard(tx.paymentId!, "Payment ID")}
                            title="Click to copy"
                          >
                            {tx.paymentId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Pending payment</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                        {rupees(tx.payable)}
                      </td>
                      <td className="px-4 py-3">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Paid
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                            <XCircle className="size-3" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(tx.placedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
