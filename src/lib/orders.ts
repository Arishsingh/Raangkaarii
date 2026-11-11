import type { CartLine } from "@/components/cart-provider";

/**
 * A line as it is recorded against an order.
 *
 * The name and price are copied in at checkout rather than looked up later: an
 * order is a record of what was bought at the price paid, and resolving it
 * against the live catalogue meant a renamed, re-priced or withdrawn product
 * silently rewrote the shopper's own history — or, for anything added through
 * the admin panel, rendered nothing at all.
 *
 * Optional because orders placed before this shipped carry only the id.
 */
export type OrderLine = CartLine & { name?: string; price?: number };

export type Address = {
  name: string;
  phone: string;
  pincode: string;
  line1: string;
  locality: string;
  city: string;
  state: string;
  type: "Home" | "Work";
};

export type OrderStatus = "Ordered" | "Packed" | "Shipped" | "Out for delivery" | "Delivered";

export const ORDER_STAGES: OrderStatus[] = [
  "Ordered",
  "Packed",
  "Shipped",
  "Out for delivery",
  "Delivered",
];

export type Order = {
  id: string;
  lines: OrderLine[];
  address: Address;
  payment: "Razorpay" | "Cash on Delivery";
  paymentId?: string;
  status: OrderStatus;
  placedAt: number;
  deliveryBy: number;
  totals: {
    items: number;
    listTotal: number;
    discount: number;
    delivery: number;
    payable: number;
  };
};

const STORAGE_KEY = "rangkaarii:orders";

/** Charged per item, on every order — there is no free-delivery threshold. */
export const DELIVERY_FEE_PER_ITEM = 120;

/** The delivery charge for a cart holding `itemCount` items in total. */
export function deliveryFee(itemCount: number) {
  return Math.max(0, itemCount) * DELIVERY_FEE_PER_ITEM;
}

/** Everything is shown at a notional 12% off, the way marketplaces list MRP. */
export function priceBreakdown(subtotal: number, itemCount: number) {
  const listTotal = Math.round(subtotal / 0.88);
  const discount = listTotal - subtotal;
  const delivery = subtotal === 0 ? 0 : deliveryFee(itemCount);
  return {
    items: itemCount,
    listTotal,
    discount,
    delivery,
    payable: subtotal + delivery,
  };
}

export function loadOrders(): Order[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Order[]) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Order) {
  try {
    const all = [order, ...loadOrders()];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable; the confirmation still shows for this session.
  }
}

export function getOrder(id: string) {
  return loadOrders().find((order) => order.id === id) ?? null;
}

/** Orders advance a stage a day, so tracking looks alive without a backend. */
export function statusFor(order: Order): OrderStatus {
  const days = Math.floor((Date.now() - order.placedAt) / 86_400_000);
  return ORDER_STAGES[Math.min(days, ORDER_STAGES.length - 1)];
}

/** Days from placing an order to the estimate a shopper is shown. */
const DELIVERY_DAYS = 5;

/**
 * The delivery estimate. Worked out once on the server and handed to the
 * checkout, so the markup rendered there and the markup hydrated in the browser
 * agree on the date — and so the figure stored with the order is the same one
 * the shopper was shown.
 */
export function estimatedDeliveryBy(from = Date.now()) {
  return from + DELIVERY_DAYS * 86_400_000;
}

export function newOrderId() {
  return `OD${Date.now().toString().slice(-10)}`;
}

export const ADDRESS_STORAGE_KEY = "rangkaarii:address";

export function loadAddress(): Address | null {
  try {
    const saved = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Address) : null;
  } catch {
    return null;
  }
}

export function saveAddress(address: Address) {
  try {
    window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(address));
  } catch {
    // Not worth failing checkout over.
  }
}
