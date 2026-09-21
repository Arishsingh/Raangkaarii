import { Banknote, Clock, Landmark, Truck, type LucideIcon } from "lucide-react";

import type { MoneyState } from "@/lib/money-state";
import { cn } from "@/lib/utils";

/**
 * Where an order's money is — which is a different question from what the
 * order's status says.
 *
 * A captured payment is not yet the shop's money: Razorpay holds it and pays
 * it on to the bank account on its own cycle, a day or more later. The order
 * status cannot express that, because it describes fulfilment, not banking.
 * So the two are shown side by side and neither pretends to be the other.
 */
const MONEY_BADGES: Record<
  MoneyState,
  { label: string; icon: LucideIcon; className: string }
> = {
  awaiting: {
    label: "No payment",
    icon: Clock,
    className: "border-muted bg-muted text-muted-foreground",
  },
  settling: {
    label: "Coming to your account",
    icon: Banknote,
    className:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  "in-account": {
    label: "In your account",
    icon: Landmark,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  cod: {
    label: "Courier collects",
    icon: Truck,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

export function MoneyBadge({
  state,
  settledAt,
}: {
  state: MoneyState;
  /** Shown on the badge once the money has landed, so the date is traceable. */
  settledAt?: string | null;
}) {
  const badge = MONEY_BADGES[state];
  const Icon = badge.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        badge.className,
      )}
      title={
        state === "settling"
          ? "Razorpay has the money and pays it on to your bank on its settlement cycle."
          : state === "in-account" && settledAt
            ? `Settled on ${new Date(settledAt).toLocaleDateString()}`
            : undefined
      }
    >
      <Icon className="size-3.5" /> {badge.label}
    </span>
  );
}
