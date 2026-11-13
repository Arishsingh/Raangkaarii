import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { CartProvider } from "@/components/cart-provider";
import { CheckoutFlow } from "@/components/checkout-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";
import { getShopCatalog } from "@/lib/catalog";
import { estimatedDeliveryBy } from "@/lib/orders";

export const metadata = { title: "Checkout — Rangkaarii" };

export default async function CheckoutPage() {
  const session = await auth();
  // The proxy normally catches this first; back to checkout after signing in.
  if (!session?.user) redirect("/login?callbackUrl=%2Fdashboard%2Fcheckout");

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
