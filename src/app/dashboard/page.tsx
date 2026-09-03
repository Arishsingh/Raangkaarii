import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { ShopBoard } from "@/components/shop-board";
import { CartProvider } from "@/components/cart-provider";
import { FloatingActions } from "@/components/floating-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";
import { getShopCatalog } from "@/lib/catalog";
import { isAdmin } from "@/lib/admin";
import { firstNameOf } from "@/lib/session-user";

export const metadata = { title: "Your account — Rangkaarii" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [{ products, filterGroups, maxPrice }, admin] = await Promise.all([
    getShopCatalog(),
    isAdmin(),
  ]);

  return (
    <WishlistProvider>
      <CartProvider>
      <SiteHeader solid locked admin={admin} />
      <main className="flex-1">
        <Suspense>
          <ShopBoard
            // Remount when the ceiling moves so the slider is never stale.
            key={maxPrice}
            name={firstNameOf(session.user)}
            products={products}
            filterGroups={filterGroups}
            maxPrice={maxPrice}
          />
        </Suspense>
      </main>
      <SiteFooter locked />
      <FloatingActions />
      </CartProvider>
    </WishlistProvider>
  );
}
