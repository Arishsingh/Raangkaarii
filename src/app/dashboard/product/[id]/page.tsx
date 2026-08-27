import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { ProductDetail } from "@/components/product-detail";
import { CartProvider } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WishlistProvider } from "@/components/wishlist-provider";
import { getShopProduct } from "@/lib/catalog";
import { products } from "@/lib/products";

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/product/[id]">) {
  const { id } = await params;
  const product = await getShopProduct(id);
  return { title: product ? `${product.name} — Rangkaarii` : "Rangkaarii" };
}

export default async function ProductPage({
  params,
}: PageProps<"/dashboard/product/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) notFound();

  return (
    <WishlistProvider>
      <CartProvider>
      <SiteHeader solid locked />
      <main className="flex-1">
        <ProductDetail product={product} />
      </main>
      <SiteFooter locked />
      </CartProvider>
    </WishlistProvider>
  );
}
