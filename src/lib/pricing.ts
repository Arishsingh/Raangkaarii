import "server-only";

import { isPriced } from "@/lib/format";

import { getShopProduct } from "@/lib/catalog";
import { deliveryFee } from "@/lib/orders";
import type { StoredOrderLine } from "@/lib/orders-store";

export type CartLineInput = { id?: string; size?: string; qty?: number };

export type PricedCart = {
  lines: StoredOrderLine[];
  items: number;
  subtotal: number;
  delivery: number;
  payable: number;
};

/** One item cannot be ordered more than this many times in a single order. */
const MAX_QTY_PER_LINE = 20;

/**
 * Prices a cart from the catalogue, never from the browser.
 *
 * Both the Razorpay order and the recorded order are built from this, because
 * the amount charged and the amount stored have to agree. They used to be
 * computed separately, and the charge left out delivery, so every order was
 * undercharged by its delivery fee.
 */
export async function priceCart(
  input: unknown,
): Promise<{ cart: PricedCart; error: null } | { cart: null; error: string }> {
  if (!Array.isArray(input) || input.length === 0) {
    return { cart: null, error: "Your cart is empty." };
  }

  const lines: StoredOrderLine[] = [];
  let subtotal = 0;
  let items = 0;

  for (const raw of input as CartLineInput[]) {
    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      return { cart: null, error: "Your cart has an invalid quantity." };
    }

    /**
     * getShopProduct covers the built-in range *and* everything added through
     * the admin panel. The Razorpay route used to read the built-in list only,
     * so an admin-added product could be added to a cart but never paid for.
     */
    const product = await getShopProduct(String(raw?.id ?? ""));
    if (!product) {
      return { cart: null, error: "Your cart has an item we no longer stock." };
    }
    if (!product.inStock) {
      return { cart: null, error: `${product.name} is out of stock.` };
    }
    // A bulk-imported piece is listed before it is priced; it is not for sale yet.
    if (!isPriced(product.price)) {
      return { cart: null, error: `${product.name} does not have a price yet.` };
    }

    lines.push({
      id: product.id,
      name: product.name,
      size: String(raw?.size ?? ""),
      qty,
      price: product.price,
      image: product.image || undefined,
    });
    subtotal += product.price * qty;
    items += qty;
  }

  const delivery = deliveryFee(items);

  return {
    cart: { lines, items, subtotal, delivery, payable: subtotal + delivery },
    error: null,
  };
}
