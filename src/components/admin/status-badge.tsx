import {
  CheckCircle2,
  Clock,
  PackageCheck,
  PackageX,
  Truck,
  type LucideIcon,
} from "lucide-react";

import type { OrderStatus } from "@/lib/orders-store";
import { cn } from "@/lib/utils";

/**
 * Every badge was the same element with three swapped colour words, so the
 * variation lives in data now and the markup is written once.
 */
const STATUS_BADGES: Record<
  string,
  { label: string; icon: LucideIcon; className: string }
> = {
  /**
   * "Pending Activation" read as though the shop owed this order an approval.
   * It does not: the row is written before the payment window opens, so a
   * pending order is one nobody has paid for yet.
   */
  pending: {
    label: "Awaiting Payment",
    icon: Clock,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  active: {
    label: "Approved",
    icon: PackageCheck,
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    className:
      "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    icon: PackageX,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  /** Money confirmed by Razorpay, and the one state that awaits the admin. */
  paid: {
    label: "Paid — Approve",
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  cod: {
    label: "Cash on Delivery",
    icon: Clock,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const badge = STATUS_BADGES[status];
  if (!badge) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {status}
      </span>
    );
  }

  const Icon = badge.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        badge.className,
      )}
    >
      <Icon className="size-3.5" /> {badge.label}
    </span>
  );
}
