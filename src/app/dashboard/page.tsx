import { Suspense } from "react";
import { auth } from "@/auth";

import { ShopBoard } from "@/components/shop-board";
import { CartProvider } from "@/components/cart-provider";
import { FloatingActions } from "@/components/floating-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";
import { HappyCustomers } from "@/components/showcase/happy-customers";
import { MostLoved } from "@/components/showcase/most-loved";
import { MostViral } from "@/components/showcase/most-viral";
import { getShopCatalog } from "@/lib/catalog";
import { listAdminProducts } from "@/lib/catalog-store";
import { getShowcase } from "@/lib/showcase";
import { isAdmin } from "@/lib/admin";
import { firstNameOf } from "@/lib/session-user";

export const metadata = { title: "Your account — Rangkaarii" };

export default async function DashboardPage() {
  const session = await auth();

  const [{ products, filterGroups, maxPrice }, admin, showcase] = await Promise.all([
    getShopCatalog(),
    isAdmin(),
    getShowcase(),
  ]);

  // Only pieces added through the panel have a row to edit; built-ins live in code.
  const editableIds = admin ? (await listAdminProducts()).map((entry) => entry.id) : [];

  return (
    <WishlistProvider>
      <CartProvider>
      <SiteHeader solid locked admin={admin} />
      <main className="flex-1">
        <Suspense>
          <ShopBoard
            // Remount when the ceiling moves so the slider is never stale.
            key={maxPrice}
            name={session?.user ? firstNameOf(session.user) : undefined}
            products={products}
            filterGroups={filterGroups}
            maxPrice={maxPrice}
            editableIds={editableIds}
          />
        </Suspense>
        <MostViral products={showcase.viral} signedIn />
        <MostLoved products={showcase.loved} signedIn />
        <HappyCustomers feedback={showcase.feedback} />
      </main>
      <SiteFooter locked />
      <FloatingActions />
      </CartProvider>
    </WishlistProvider>
  );
}
