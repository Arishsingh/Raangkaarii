import "server-only";

import { getShopCatalog } from "@/lib/catalog";
import type { Product } from "@/lib/products";
import { listFeedback, listPicks, type Feedback } from "@/lib/showcase-store";

/** Just what a homepage card needs — never the whole record. */
export type ShowcaseProduct = Pick<
  Product,
  "id" | "name" | "price" | "compareAt" | "image" | "video" | "alt" | "inStock"
>;

export type Showcase = {
  viral: ShowcaseProduct[];
  loved: ShowcaseProduct[];
  feedback: Feedback[];
};

function slim(product: Product): ShowcaseProduct {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    compareAt: product.compareAt,
    image: product.image,
    video: product.video,
    alt: product.alt,
    inStock: product.inStock,
  };
}

/**
 * A shelf nobody has filled yet still shows something, so the homepage never
 * opens on a gap: the newest pieces stand in for "viral", and the next few
 * for "loved". The moment the admin picks anything, the picks take over.
 */
export async function getShowcase(): Promise<Showcase> {
  const [{ products }, picks, feedback] = await Promise.all([
    getShopCatalog(),
    listPicks(),
    listFeedback(),
  ]);

  const byId = new Map(products.map((product) => [product.id, product]));
  const resolve = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product))
      .map(slim);

  // Only pieces with something to show — a blank tile is worse than none.
  const inStock = products.filter(
    (product) => product.inStock && (product.image || product.video),
  );
  const withPhoto = inStock.filter((product) => product.image);
  const viral = resolve(picks.viral);
  const loved = resolve(picks.loved);

  return {
    // Unpicked, the rail carries the whole in-stock range, newest first.
    viral: viral.length > 0 ? viral : inStock.slice(0, 24).map(slim),
    // The bento is all photographs, so it draws only from pieces that have one.
    loved:
      loved.length > 0
        ? loved
        : (withPhoto.length > 8 ? withPhoto.slice(8, 12) : withPhoto.slice(0, 4)).map(slim),
    feedback,
  };
}
