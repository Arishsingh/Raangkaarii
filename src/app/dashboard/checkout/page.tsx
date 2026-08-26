import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { CartProvider } from "@/components/cart-provider";
import { CheckoutFlow } from "@/components/checkout-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";

export const metadata = { title: "Checkout — Rangkaarii" };

export default async function CheckoutPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <WishlistProvider>
      <CartProvider>
        <SiteHeader solid locked />
        <main className="flex-1">
          <CheckoutFlow />
        </main>
        <SiteFooter locked />
      </CartProvider>
    </WishlistProvider>
  );
}
