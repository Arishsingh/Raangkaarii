import type { CartLine } from "@/components/cart-provider";

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
  lines: CartLine[];
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

/** Free delivery over this, like most Indian storefronts. */
export const FREE_DELIVERY_OVER = 5000;
export const DELIVERY_FEE = 79;

/** Everything is shown at a notional 12% off, the way marketplaces list MRP. */
export function priceBreakdown(subtotal: number, itemCount: number) {
  const listTotal = Math.round(subtotal / 0.88);
  const discount = listTotal - subtotal;
  const delivery = subtotal >= FREE_DELIVERY_OVER || subtotal === 0 ? 0 : DELIVERY_FEE;
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
