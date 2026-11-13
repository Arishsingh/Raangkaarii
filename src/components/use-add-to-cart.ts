"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { useCart } from "@/components/cart-provider";

/** Where a guest lands after signing in from an add-to-cart. */
const AFTER_SIGN_IN = "/dashboard/cart";

/**
 * Browsing is open to everyone; signing in is asked for at the first
 * add-to-cart. The piece goes into the cart either way (it lives in this
 * browser), so a guest who signs in finds it waiting in the cart.
 */
export function useAddToCart() {
  const cart = useCart();
  const router = useRouter();
  const { status } = useSession();

  return React.useCallback(
    (id: string, size: string, label: string) => {
      cart?.add(id, size);

      if (status === "authenticated") {
        toast.success(`${label} added to your cart`);
        return;
      }

      toast.success(`${label} added to your cart — sign in to continue`);
      // A beat so the toast is seen and the cart is saved before leaving.
      window.setTimeout(() => {
        router.push(`/login?callbackUrl=${encodeURIComponent(AFTER_SIGN_IN)}`);
      }, 700);
    },
    [cart, router, status],
  );
}
