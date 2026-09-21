import type { StoredOrder } from "@/lib/orders-store";

/**
 * Where an order's money is — which is a different question from what the
 * order's status says.
 *
 * `awaiting`   — nothing captured. Not a sale.
 * `settling`   — captured by Razorpay, on its way to the bank account.
 * `in-account` — settled. The money is the shop's.
 * `cod`        — collected by the courier on delivery, so nothing to settle.
 *
 * This lives apart from razorpay-sync.ts, which is server-only: the admin
 * order list is a client component and needs to read the same states without
 * dragging the API credentials into the browser bundle. The StoredOrder import
 * is type-only, so nothing from the server module survives compilation.
 */
export type MoneyState = "awaiting" | "settling" | "in-account" | "cod";

export function moneyStateOf(
  order: Pick<StoredOrder, "status" | "paymentId" | "settledAt">,
): MoneyState {
  if (order.status === "cod") return "cod";
  if (!order.paymentId) return "awaiting";
  return order.settledAt ? "in-account" : "settling";
}
