"use client";

import * as React from "react";
import { toast } from "sonner";

import { useCart } from "@/components/cart-provider";

/**
 * Adds a piece to the cart. Guests can fill a cart freely; sign-in is asked
 * for when they press "Place order", and brings them back to checkout.
 */
export function useAddToCart() {
  const cart = useCart();

  return React.useCallback(
    (id: string, size: string, label: string) => {
      cart?.add(id, size);
      toast.success(`${label} added to your cart`);
    },
    [cart],
  );
}
