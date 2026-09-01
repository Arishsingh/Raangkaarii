export type Product = {
  id: string;
  name: string;
  price: number;
  compareAt?: number;
  rating: number;
  image: string;
  video?: string;
  /** The full gallery, when a product carries more than the primary media. */
  images?: string[];
  videos?: string[];
  alt: string;
  badges: string[];
  style: string;
  fabric: string;
  colour: string;
  print: string;
  sizes: string[];
  inStock: boolean;
};

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export const STYLES = [
  "Traditional Long Pyjamas",
  "Short Pyjamas",
  "Oversized Pyjamas",
  "Capri Pyjamas",
  "Dressing Gowns & Robes",
  "Nightdresses & Shirts",
  "Separates",
];
export const FABRICS = ["Cotton", "Cotton Voile", "Cotton Gauze", "Satin", "Linen Blend"];
export const COLOURS = ["Cream", "Green", "Rosewater", "Pale Blue", "Navy", "Crimson"];
export const PRINTS = ["Floral", "Gingham", "Striped", "Animal", "Plain"];
const IMAGES = [
  { src: "/products/01.webp", alt: "Rose pink kurta with floral thread embroidery" },
  { src: "/products/02.webp", alt: "Teal bandhani print kurta with a gold zari placket" },
  { src: "/products/03.webp", alt: "Mint green floral kurta with white lace trim" },
  { src: "/products/04.webp", alt: "Crimson kurta with green and gold floral embroidery" },
  { src: "/products/05.webp", alt: "Ivory kurta with black embroidery and a sheer panel" },
  { src: "/products/06.webp", alt: "Ivory kurta with a red and black geometric yoke" },
  { src: "/products/07.webp", alt: "Powder blue kurta with white chikankari lace panels" },
  { src: "/products/08.webp", alt: "Lime green floral kurta with a matching dupatta" },
  { src: "/products/09.webp", alt: "Blush paisley print kurta with a black embroidered panel" },
  { src: "/products/10.webp", alt: "Lavender kurta with pink floral embroidery" },
  { src: "/products/11.webp", alt: "Ivory kurta with black rose embroidery across the yoke" },
  { src: "/products/12.webp", alt: "Pale blue kurta covered in white chikankari embroidery" },
  { src: "/products/13.webp", alt: "Sage green kurta with a pearl-worked neckline" },
  { src: "/products/14.webp", alt: "Mocha silk kurta with tonal thread embroidery" },
  { src: "/products/15.webp", alt: "Deep red kurta with gold zari embroidery" },
  { src: "/products/16.webp", alt: "Butter yellow lace kurta over a printed base" },
  { src: "/products/17.webp", alt: "Rust red kurta with heavy gold and green embroidery" },
];

/** Deterministic pseudo-random so server and client render the same catalogue. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 2 ** 32;
    return value / 2 ** 32;
  };
}

function hash(text: string) {
  let total = 0;
  for (const char of text) total = (total * 31 + char.charCodeAt(0)) % 2 ** 31;
  return total;
}

function buildProducts(slug: string, count: number, onSale: boolean): Product[] {
  const random = seeded(hash(slug) + 7);
  return Array.from({ length: count }, (_, index) => {
    const style = STYLES[Math.floor(random() * STYLES.length)];
    const fabric = FABRICS[Math.floor(random() * FABRICS.length)];
    const colour = COLOURS[Math.floor(random() * COLOURS.length)];
    const print = PRINTS[Math.floor(random() * PRINTS.length)];
    const image = IMAGES[index % IMAGES.length];
    const base = 38 + Math.floor(random() * 9) * 4;
    const discounted = onSale || random() < 0.25;

    const badges: string[] = [];
    if (discounted) badges.push("SALE");
    if (random() < 0.2) badges.unshift("BEST SELLER");
    if (slug === "new-in") badges.unshift("NEW");

    return {
      id: `${slug}-${index}`,
      name: `Womens ${fabric} ${style.replace(" & Robes", "")} ${colour} ${print}`,
      price: discounted ? Math.round(base / 2) : base,
      compareAt: discounted ? base : undefined,
      rating: Math.round((4 + random()) * 10) / 10,
      image: image.src,
      alt: image.alt,
      badges,
      style,
      fabric,
      colour,
      print,
      sizes: SIZES.filter(() => random() < 0.75),
      inStock: random() < 0.85,
    };
  });
}

export type Collection = {
  slug: string;
  title: string;
  products: Product[];
};

const definitions: { slug: string; title: string; count: number; sale?: boolean }[] = [
  { slug: "sale", title: "Sale", count: 24, sale: true },
  { slug: "new-in", title: "New In", count: 20 },
  { slug: "womens", title: "Womens", count: 24 },
  { slug: "best-sellers", title: "Best Sellers", count: 16 },
  { slug: "shop-all-pyjama-sets", title: "Shop All Pyjama Sets", count: 24 },
  { slug: "e-gift-card", title: "E-Gift Card", count: 4 },
  ...STYLES.map((style) => ({ slug: slugify(style), title: style, count: 16 })),
  ...FABRICS.map((fabric) => ({ slug: slugify(fabric), title: fabric, count: 16 })),
  ...[
    "Rangkaarii X French Bedroom",
    "Holiday Shop",
    "Animal & Feather Print Nightwear",
    "Striped Nightwear",
    "Gingham & Checked Nightwear",
    "Floral Nightwear",
    "Matching Family Pyjamas",
    "Bridal Party Pyjamas",
    "Maternity Pyjamas",
    "Women's Cotton Pyjamas & Nightwear",
    "Women's Nightdresses and Shirts",
    "Women's Satin Pyjamas & Nightwear",
    "Striped Pyjamas & Nightwear",
    "Linen Blend Pyjamas & Nightwear",
    "This Week",
    "Back in Stock",
    "Pre-Order",
  ].map((title) => ({ slug: slugify(title), title, count: 16 })),
];

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function collectionSlugs() {
  return definitions.map((definition) => definition.slug);
}

export function getCollection(slug: string, extra: Product[] = []): Collection | null {
  const definition = definitions.find((entry) => entry.slug === slug);
  if (!definition) return null;
  return {
    slug: definition.slug,
    title: definition.title,
    // Admin-added pieces lead the grid so new stock is seen first.
    products: [
      ...extra,
      ...buildProducts(definition.slug, definition.count, definition.sale ?? false),
    ],
  };
}

/** Every heading a product can be filed under, for the admin panel's picker. */
export function collectionHeadings() {
  return definitions.map(({ slug, title }) => ({ slug, title }));
}

export const filterGroups = [
  { label: "Style", key: "style" as const, options: STYLES },
  { label: "Size", key: "sizes" as const, options: SIZES },
  { label: "Fabric", key: "fabric" as const, options: FABRICS },
  { label: "Colour", key: "colour" as const, options: COLOURS },
  { label: "Print", key: "print" as const, options: PRINTS },
  { label: "Availability", key: "availability" as const, options: ["In stock", "Out of stock"] },
];

export const sortOptions = [
  "Featured",
  "Price, low to high",
  "Price, high to low",
  "Best rated",
] as const;

export type SortOption = (typeof sortOptions)[number];
