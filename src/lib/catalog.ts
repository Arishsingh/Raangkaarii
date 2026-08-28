import "server-only";

import {
  listAdminProducts,
  listHiddenBuiltIns,
  type AdminProduct,
} from "@/lib/catalog-store";
import {
  collectionHeadings,
  type Product as CollectionProduct,
} from "@/lib/collections";
import {
  JUST_ADDED,
  MAX_PRICE,
  buildFilterGroups,
  getProduct as getBuiltInProduct,
  products as builtInProducts,
  type Product as ShopProduct,
} from "@/lib/products";

/**
 * Signed-in shoppers are redirected away from /collections, so a product filed
 * only under a heading would be invisible to them. Fall back to the heading's
 * own title as its shop category so everything the admin adds is reachable.
 */
/** Rows saved before the form defaulted sizes would leave "Add to cart" empty. */
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function sizesFor(entry: AdminProduct) {
  return entry.sizes.length > 0 ? entry.sizes : DEFAULT_SIZES;
}

/**
 * Headings for the shop's "Collection" filter: everything added through the
 * admin panel lands in "Just added" automatically, on top of whichever
 * headings the admin picked.
 */
function shopCollections(entry: AdminProduct) {
  const titles = collectionHeadings();
  const chosen = entry.collections
    .map((slug) => titles.find((heading) => heading.slug === slug)?.title)
    .filter((title): title is string => Boolean(title));
  return [JUST_ADDED, ...chosen];
}

function shopCategory(entry: AdminProduct) {
  if (entry.category) return entry.category;
  const first = entry.collections[0];
  if (!first) return "More from us";
  return collectionHeadings().find((h) => h.slug === first)?.title ?? "More from us";
}

/** Admin record → the shape the signed-in dashboard shop renders. */
function toShopProduct(entry: AdminProduct): ShopProduct {
  return {
    id: entry.id,
    name: entry.name,
    blurb: entry.blurb,
    price: entry.price,
    compareAt: entry.compareAt ?? undefined,
    category: shopCategory(entry),
    fabric: entry.fabric,
    colour: entry.colour,
    occasion: entry.occasion,
    collections: shopCollections(entry),
    sizes: sizesFor(entry),
    inStock: entry.inStock,
    image: entry.image,
    video: entry.video || undefined,
    alt: entry.alt || entry.name,
  };
}

/** Admin record → the shape the public collection grids render. */
function toCollectionProduct(entry: AdminProduct): CollectionProduct {
  return {
    id: entry.id,
    name: entry.name,
    price: entry.price,
    compareAt: entry.compareAt ?? undefined,
    rating: entry.rating,
    image: entry.image,
    video: entry.video || undefined,
    alt: entry.alt || entry.name,
    badges: entry.badges,
    style: entry.style,
    fabric: entry.fabric,
    colour: entry.colour,
    print: entry.print,
    sizes: sizesFor(entry),
    inStock: entry.inStock,
  };
}

/**
 * The dashboard shop: everything the admin has added, newest first, followed by
 * the built-in catalogue.
 */
export async function getShopCatalog() {
  const [added, visibleBuiltIns] = await Promise.all([
    listAdminProducts(),
    listVisibleBuiltIns(),
  ]);
  const products = [...added.map(toShopProduct), ...visibleBuiltIns];
  return {
    products,
    filterGroups: buildFilterGroups(products),
    maxPrice: ceilingFor(products),
  };
}

/**
 * The price slider's ceiling. It has to come from the catalogue on screen —
 * a fixed cap silently hides every product priced above it.
 */
function ceilingFor(products: ShopProduct[]) {
  const dearest = Math.max(MAX_PRICE, ...products.map((product) => product.price));
  // Round up to a whole thousand so the slider's end reads cleanly.
  return Math.ceil(dearest / 1000) * 1000;
}

/** The built-in range minus anything removed through the admin panel. */
export async function listVisibleBuiltIns(): Promise<ShopProduct[]> {
  const hidden = new Set(await listHiddenBuiltIns());
  return builtInProducts.filter((product) => !hidden.has(product.id));
}

export async function getShopProduct(id: string): Promise<ShopProduct | null> {
  const builtIn = getBuiltInProduct(id);
  if (builtIn) {
    const hidden = await listHiddenBuiltIns();
    return hidden.includes(id) ? null : builtIn;
  }

  const added = await listAdminProducts();
  const match = added.find((entry) => entry.id === id);
  return match ? toShopProduct(match) : null;
}

/** Admin products filed under one collection heading. */
export async function getCollectionExtras(slug: string): Promise<CollectionProduct[]> {
  const added = await listAdminProducts();
  return added
    .filter((entry) => entry.collections.includes(slug))
    .map(toCollectionProduct);
}

export type CatalogCounts = {
  /** Everything a customer can browse: your additions plus the built-in range. */
  total: number;
  added: number;
  builtIn: number;
  withVideo: number;
  outOfStock: number;
  byCategory: { label: string; count: number }[];
  byCollection: { label: string; count: number }[];
};

/** Powers the admin panel's "Products on site" overview. */
export async function getCatalogCounts(): Promise<CatalogCounts> {
  const [added, visibleBuiltIns] = await Promise.all([
    listAdminProducts(),
    listVisibleBuiltIns(),
  ]);
  const shop = [...added.map(toShopProduct), ...visibleBuiltIns];

  const tally = (values: string[]) => {
    const counts = new Map<string, number>();
    for (const value of values) {
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));
  };

  return {
    total: shop.length,
    added: added.length,
    builtIn: visibleBuiltIns.length,
    withVideo: added.filter((entry) => entry.video).length,
    outOfStock: shop.filter((product) => !product.inStock).length,
    byCategory: tally(shop.map((product) => product.category)),
    // Only your products carry headings, so this is the admin-side breakdown.
    byCollection: tally(added.flatMap((entry) => shopCollections(entry))),
  };
}
