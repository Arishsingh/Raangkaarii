import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { CartProvider } from "@/components/cart-provider";
import { OrderDetail } from "@/components/order-detail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";

export const metadata = { title: "Order — Rangkaarii" };

export default async function OrderPage({
  params,
}: PageProps<"/dashboard/orders/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  return (
    <WishlistProvider>
      <CartProvider>
        <SiteHeader solid locked />
        <main className="flex-1">
          <OrderDetail id={id} />
        </main>
        <SiteFooter locked />
      </CartProvider>
    </WishlistProvider>
  );
}
