import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { CartProvider } from "@/components/cart-provider";
import { CartView } from "@/components/cart-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";

export const metadata = { title: "Your cart — Rangkaarii" };

export default async function CartPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <WishlistProvider>
      <CartProvider>
        <SiteHeader solid locked />
        <main className="flex-1">
          <CartView />
        </main>
        <SiteFooter locked />
      </CartProvider>
    </WishlistProvider>
  );
}
