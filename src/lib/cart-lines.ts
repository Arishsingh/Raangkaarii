import type { CartLine } from "@/components/cart-provider";
import type { Product } from "@/lib/products";

export type CartRow = { line: CartLine; product: Product };

/**
 * Resolves saved cart lines against the catalogue the server sent.
 *
 * The cart lives in localStorage and holds ids only, so a piece the admin has
 * since deleted or hidden stays in it forever. Those lines used to be filtered
 * away silently: the header badge kept counting them while the cart page said
 * it was empty, and checkout answered "an item we no longer stock" with no way
 * to tell which. They come back as `missing` here so the screen can name them
 * and offer to remove them.
 */
export function splitCartLines(lines: CartLine[], products: Product[]) {
  const catalogue = new Map(products.map((product) => [product.id, product]));
  const rows: CartRow[] = [];
  const missing: CartLine[] = [];

  for (const line of lines) {
    const product = catalogue.get(line.id);
    if (product) rows.push({ line, product });
    else missing.push(line);
  }

  return { rows, missing };
}
