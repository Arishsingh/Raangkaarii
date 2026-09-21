"use client";

import * as React from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  PackageCheck,
  PackageX,
  Phone,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { updateOrderStatusAction } from "@/app/admin/actions";
import { MoneyBadge } from "@/components/admin/money-badge";
import { ShipButton } from "@/components/admin/ship-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { moneyStateOf } from "@/lib/money-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime, rupees } from "@/lib/format";
import type { OrderStatus, StoredOrder } from "@/lib/orders-store";

type Tab = "all" | "approve" | "active" | "shipped" | "delivered" | "cancelled";

/**
 * Which order statuses each tab covers. The filter and the badge counts read
 * this same map, so a tab can never show a count it would not then list.
 *
 * Only payment-verified orders reach this page at all (see listAllOrders), so
 * there is no longer a tab for unpaid ones — the first tab is the queue of
 * paid orders waiting on the admin, which is the one that needs working.
 */
const TAB_STATUSES: Record<Exclude<Tab, "all">, readonly OrderStatus[]> = {
  approve: ["paid", "cod"],
  active: ["active"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

const COUNTED_TABS = Object.keys(TAB_STATUSES) as Exclude<Tab, "all">[];

export function OrdersManagement({ initialOrders }: { initialOrders: StoredOrder[] }) {
  const [activeTab, setActiveTab] = React.useState<Tab>("all");
  const [query, setQuery] = React.useState("");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("status", newStatus);

      const res = await updateOrderStatusAction({ ok: false, message: "" }, formData);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message || "Failed to update order status.");
      }
    } catch {
      toast.error("An error occurred while updating order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = React.useMemo(() => {
    // Normalised once, not once per order.
    const q = query.trim().toLowerCase();

    return initialOrders.filter((order) => {
      if (activeTab !== "all" && !TAB_STATUSES[activeTab].includes(order.status)) {
        return false;
      }
      if (!q) return true;
      return (
        order.id.toLowerCase().includes(q) ||
        order.name.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        Boolean(order.address?.phone?.includes(q)) ||
        Boolean(order.address?.pincode?.includes(q)) ||
        Boolean(order.address?.city?.toLowerCase().includes(q))
      );
    });
  }, [initialOrders, activeTab, query]);

  // One pass over the orders rather than a separate filter() per tab.
  const counts = React.useMemo(() => {
    const tally: Record<Tab, number> = {
      all: initialOrders.length,
      approve: 0,
      active: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const order of initialOrders) {
      for (const tab of COUNTED_TABS) {
        if (TAB_STATUSES[tab].includes(order.status)) tally[tab] += 1;
      }
    }
    return tally;
  }, [initialOrders]);

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID, customer, email, phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/40 p-1 text-xs">
          {(
            [
              { id: "all", label: "All Orders", count: counts.all },
              { id: "approve", label: "To Approve", count: counts.approve },
              { id: "active", label: "Approved", count: counts.active },
              { id: "shipped", label: "Shipped", count: counts.shipped },
              { id: "delivered", label: "Delivered", count: counts.delivered },
              { id: "cancelled", label: "Cancelled", count: counts.cancelled },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ShoppingBag className="mx-auto size-8 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-medium">No orders found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {query
              ? "No orders match your search query."
              : "There are no orders in this status category yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isUpdating = updatingId === order.id;
            const money = moneyStateOf(order);
            /**
             * Approval waits for the money to arrive, not merely to be taken.
             *
             * A captured payment still sits with Razorpay; it reaches the bank
             * on their settlement cycle a day or more later. Approving — and
             * so dispatching a parcel — before then means goods leaving on the
             * strength of money the shop does not yet hold. COD is the
             * exception: there is nothing to settle, the courier collects it.
             */
            const moneyArrived = money === "in-account" || money === "cod";

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-border/80"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold tracking-tight">
                      #{order.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(order.placedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-border/60 bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      {order.payment}
                    </span>
                    <MoneyBadge
                      state={moneyStateOf(order)}
                      settledAt={order.settledAt}
                    />
                    <StatusBadge status={order.status} />
                  </div>
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-3">
                  {/* Customer & Address Details */}
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <User className="size-3.5" /> Customer Details
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-foreground">{order.name || "Guest Customer"}</p>
                      <p className="text-xs text-muted-foreground">{order.email}</p>
                      {order.address?.phone && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="size-3 text-muted-foreground/70" />
                          {order.address.phone}
                        </p>
                      )}
                    </div>

                    {order.address ? (
                      <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-xs space-y-1">
                        <p className="flex items-center gap-1 font-medium text-foreground">
                          <MapPin className="size-3 text-primary" /> Delivery Address
                        </p>
                        <p className="text-muted-foreground">
                          {order.address.line1}
                          {order.address.locality ? `, ${order.address.locality}` : ""}
                        </p>
                        <p className="text-muted-foreground">
                          {order.address.city}, {order.address.state} —{" "}
                          <span className="font-mono font-medium text-foreground">
                            {order.address.pincode}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">No address captured</p>
                    )}
                  </div>

                  {/* Order Line Items */}
                  <div className="space-y-3 lg:col-span-2">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ShoppingBag className="size-3.5" /> Order Items ({order.items})
                    </h4>
                    <div className="divide-y divide-border/40 rounded-lg border border-border/50 bg-background">
                      {order.lines.map((line, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 text-xs">
                          <div>
                            <p className="font-medium text-foreground">{line.name}</p>
                            <p className="text-muted-foreground">
                              Size: <span className="font-semibold">{line.size || "Standard"}</span>{" "}
                              × {line.qty}
                            </p>
                          </div>
                          <p className="font-mono text-sm font-medium">{rupees(line.price * line.qty)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Summary Totals & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>
                          Subtotal: <span className="font-mono text-foreground">{rupees(order.subtotal)}</span> | Delivery:{" "}
                          <span className="font-mono text-foreground">
                            {order.delivery === 0 ? "FREE" : rupees(order.delivery)}
                          </span>
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          Grand Total: <span className="font-mono text-primary">{rupees(order.payable)}</span>
                        </p>
                      </div>

                      {/* Admin Controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/*
                          Approve, then ship — in that order, and only ever for
                          an order Razorpay has confirmed.

                          Approval used to be offered on `pending` too, which is
                          an unpaid checkout, and the courier button appeared
                          for `pending` and `paid` alike — so a parcel could be
                          booked before anyone had approved the order, or paid
                          for it. The server enforces both rules as well; this
                          just stops the panel offering what it would refuse.
                        */}
                        {order.paymentVerified &&
                        (order.status === "paid" || order.status === "cod") ? (
                          moneyArrived ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, "active")}
                            >
                              {isUpdating ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3.5" />
                              )}
                              Approve for delivery
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-700 dark:text-sky-400">
                              <Loader2 className="size-3.5" />
                              Waiting for the money to reach your account —
                              approval opens then
                            </span>
                          )
                        ) : null}

                        {order.paymentVerified && order.status === "active" ? (
                          <ShipButton
                            orderId={order.id}
                            waybill={order.waybill}
                            shippable={Boolean(order.address)}
                          />
                        ) : null}

                        {/* The waybill stays reachable once the parcel is booked. */}
                        {order.status === "shipped" && order.waybill ? (
                          <ShipButton
                            orderId={order.id}
                            waybill={order.waybill}
                            shippable
                          />
                        ) : null}

                        {/* Only a parcel that went out can be marked delivered. */}
                        {order.status === "shipped" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(order.id, "delivered")}
                          >
                            {isUpdating ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="size-3.5" />
                            )}
                            Mark Delivered
                          </Button>
                        )}

                        {order.status !== "cancelled" && order.status !== "delivered" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(order.id, "cancelled")}
                          >
                            <PackageX className="size-3.5" />
                            Cancel Order
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
