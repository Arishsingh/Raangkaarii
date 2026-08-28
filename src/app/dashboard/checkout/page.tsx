import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { CartProvider } from "@/components/cart-provider";
import { CheckoutFlow } from "@/components/checkout-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";
import { getShopCatalog } from "@/lib/catalog";
import { estimatedDeliveryBy } from "@/lib/orders";

export const metadata = { title: "Checkout — Rangkaarii" };

export default async function CheckoutPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Same reason as the cart: only the server can see the whole catalogue.
  const { products } = await getShopCatalog();
  // Settled here so the server and the browser render the same estimate.
  const deliveryBy = estimatedDeliveryBy();

  return (
    <WishlistProvider>
      <CartProvider>
        <SiteHeader solid locked />
        <main className="flex-1">
          <CheckoutFlow products={products} deliveryBy={deliveryBy} />
        </main>
        <SiteFooter locked />
      </CartProvider>
    </WishlistProvider>
  );
}
