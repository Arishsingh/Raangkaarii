import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { CartProvider } from "@/components/cart-provider";
import { CartView } from "@/components/cart-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";
import { getShopCatalog } from "@/lib/catalog";

export const metadata = { title: "Your cart — Rangkaarii" };

export default async function CartPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  /**
   * The cart holds ids only, and the browser cannot resolve them: the built-in
   * list it used to search knows nothing about anything added through the admin
   * panel, so a real product vanished from the cart entirely. The catalogue is
   * read here, on the server, where both halves are visible.
   */
  const { products } = await getShopCatalog();

  return (
    <WishlistProvider>
      <CartProvider>
        <SiteHeader solid locked />
        <main className="flex-1">
          <CartView products={products} />
        </main>
        <SiteFooter locked />
      </CartProvider>
    </WishlistProvider>
  );
}
