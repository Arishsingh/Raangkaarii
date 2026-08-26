import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { ShopBoard } from "@/components/shop-board";
import { CartProvider } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";

export const metadata = { title: "Your account — Rangkaarii" };

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <WishlistProvider>
      <CartProvider>
      <SiteHeader solid locked />
      <main className="flex-1">
        <Suspense>
          <ShopBoard name={user.firstName ?? "there"} />
        </Suspense>
      </main>
      <SiteFooter locked />
      </CartProvider>
    </WishlistProvider>
  );
}
