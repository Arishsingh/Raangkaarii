import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { CartProvider } from "@/components/cart-provider";
import { OrdersView } from "@/components/orders-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";

export const metadata = { title: "Your orders — Rangkaarii" };

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <WishlistProvider>
      <CartProvider>
        <SiteHeader solid locked />
        <main className="flex-1">
          <OrdersView />
        </main>
        <SiteFooter locked />
      </CartProvider>
    </WishlistProvider>
  );
}
