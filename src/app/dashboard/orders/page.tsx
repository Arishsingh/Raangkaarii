import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { CartProvider } from "@/components/cart-provider";
import { OrdersView } from "@/components/orders-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";

export const metadata = { title: "Your orders — Rangkaarii" };

export default async function OrdersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

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
