import type { FilterGroup } from "@/components/shop-filters";

export type Product = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  category: string;
  fabric: string;
  colour: string;
  occasion: string;
  sizes: string[];
  inStock: boolean;
  /** Headings this piece is listed under; drives the "Collection" filter. */
  collections?: string[];
  image: string;
  /** Optional clip, shown above the stills on the product page. */
  video?: string;
  alt: string;
};

export const products: Product[] = [
  { id: "p1", name: "Hand-Embroidered Kurta Set", blurb: "Cotton voile kurta with hand-worked thread detail", price: 4200, category: "Pakistani Casual", fabric: "Cotton Voile", colour: "Maroon", occasion: "Everyday", sizes: ["S", "M", "L", "XL"], inStock: true, image: "/hero-2.png", alt: "Model in an embroidered kurta" },
  { id: "p2", name: "Crimson Organza Sharara", blurb: "Gold thread on crimson, cut for evening light", price: 6800, category: "Pakistani Party Wear", fabric: "Organza", colour: "Crimson", occasion: "Festive", sizes: ["S", "M", "L"], inStock: true, image: "/hero-4.png", alt: "Model in a crimson embroidered set" },
  { id: "p3", name: "Linen Blend Wide Trousers", blurb: "Breathable linen blend with a relaxed drape", price: 2600, category: "Office Wear", fabric: "Linen Blend", colour: "Ivory", occasion: "Everyday", sizes: ["XS", "S", "M", "L", "XL", "XXL"], inStock: true, image: "/hero-3.png", alt: "Woman choosing linen pieces" },
  { id: "p4", name: "Velvet Patiala Set", blurb: "Deep red velvet, tailored for festive evenings", price: 7400, category: "Pakistani Party Wear", fabric: "Velvet", colour: "Crimson", occasion: "Wedding", sizes: ["M", "L", "XL"], inStock: false, image: "/hero-5.png", alt: "Model in a red velvet set" },
  { id: "p5", name: "Everyday Cotton Shirt", blurb: "Soft-washed cotton you reach for without thinking", price: 1900, category: "Office Wear", fabric: "Cotton", colour: "Ivory", occasion: "Everyday", sizes: ["XS", "S", "M", "L"], inStock: true, image: "/hero.png", alt: "Rails of curated clothing" },
  { id: "p6", name: "Gauze Frill Collar Set", blurb: "Rosewater gauze with a contrast piped trim", price: 3800, category: "Pakistani Casual", fabric: "Cotton Gauze", colour: "Rosewater", occasion: "Everyday", sizes: ["S", "M", "L", "XL"], inStock: true, image: "/hero-4.png", alt: "Model in a gauze frill set" },
  { id: "p7", name: "Block Print Nightdress", blurb: "Hand block printed cotton, made for warm nights", price: 2200, category: "Pakistani Casual", fabric: "Cotton", colour: "Pale Blue", occasion: "Everyday", sizes: ["S", "M", "L", "XL", "XXL"], inStock: true, image: "/hero-3.png", alt: "Printed cotton nightdress" },
  { id: "p8", name: "Satin Slip Dress", blurb: "Fluid satin with a bias cut and clean neckline", price: 4600, category: "Party Wear Cord Sets", fabric: "Satin", colour: "Rosewater", occasion: "Party", sizes: ["XS", "S", "M"], inStock: false, image: "/hero-5.png", alt: "Model in a satin slip" },
  { id: "p9", name: "Striped Cotton Co-ord", blurb: "Woven stripes on breathable summer cotton", price: 3100, category: "Cord Sets", fabric: "Cotton", colour: "Pale Blue", occasion: "Everyday", sizes: ["S", "M", "L"], inStock: true, image: "/hero-2.png", alt: "Striped cotton co-ord" },
  { id: "p10", name: "Chikankari Anarkali", blurb: "White-on-white chikankari with a full sweep", price: 5900, category: "Farshi Salwar Sets", fabric: "Cotton Voile", colour: "Ivory", occasion: "Festive", sizes: ["S", "M", "L", "XL"], inStock: true, image: "/hero-4.png", alt: "Model in a white anarkali" },
  { id: "p11", name: "Zari Border Dupatta", blurb: "Sheer organza dupatta with a woven zari edge", price: 1600, category: "Pakistani Party Wear", fabric: "Organza", colour: "Gold", occasion: "Festive", sizes: ["One Size"], inStock: true, image: "/hero-5.png", alt: "Organza dupatta with zari border" },
  { id: "p12", name: "Mul Cotton Palazzo", blurb: "Feather-light mul cotton with a wide leg", price: 1800, category: "Office Wear", fabric: "Cotton", colour: "Maroon", occasion: "Everyday", sizes: ["S", "M", "L", "XL", "XXL"], inStock: true, image: "/hero.png", alt: "Mul cotton palazzo trousers" },
];

/** Which product field each filter heading reads. */
export const filterFields = {
  Category: "category",
  Fabric: "fabric",
  Colour: "colour",
  Occasion: "occasion",
} as const;

/** Counts come from the catalogue so they can never drift out of sync. */
function countBy(list: Product[], field: keyof Product) {
  const tally = new Map<string, number>();
  for (const product of list) {
    const value = String(product[field]);
    if (!value) continue;
    tally.set(value, (tally.get(value) ?? 0) + 1);
  }
  return [...tally.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

/** Every admin-added piece carries this, so new stock is one click away. */
export const JUST_ADDED = "Just added";

function countCollections(list: Product[]) {
  const tally = new Map<string, number>();
  for (const product of list) {
    for (const entry of product.collections ?? []) {
      tally.set(entry, (tally.get(entry) ?? 0) + 1);
    }
  }
  // "Just added" leads; the admin's own headings follow alphabetically.
  return [...tally.entries()]
    .sort((a, b) => {
      if (a[0] === JUST_ADDED) return -1;
      if (b[0] === JUST_ADDED) return 1;
      return a[0].localeCompare(b[0]);
    })
    .map(([label, count]) => ({ label, count }));
}

function countSizes(list: Product[]) {
  const tally = new Map<string, number>();
  for (const product of list) {
    for (const size of product.sizes) {
      tally.set(size, (tally.get(size) ?? 0) + 1);
    }
  }
  return SIZE_ORDER.filter((size) => tally.has(size)).map((label) => ({
    label,
    count: tally.get(label)!,
  }));
}

/** Built from whichever catalogue is on screen, so admin products are counted. */
export function buildFilterGroups(list: Product[]): FilterGroup[] {
  const collections = countCollections(list);

  return [
    // Only shown once something has been added through the admin panel.
    ...(collections.length > 0
      ? [{ heading: "Collection", options: collections }]
      : []),
    { heading: "Category", options: countBy(list, "category") },
    { heading: "Fabric", options: countBy(list, "fabric") },
    { heading: "Colour", options: countBy(list, "colour") },
    { heading: "Occasion", options: countBy(list, "occasion") },
    { heading: "Size", options: countSizes(list) },
    {
      heading: "Availability",
      options: [
        { label: "In stock", count: list.filter((p) => p.inStock).length },
        { label: "Made to order", count: list.filter((p) => !p.inStock).length },
      ],
    },
  ];
}

export const sizeOptions = countSizes(products);

export const filterGroups: FilterGroup[] = buildFilterGroups(products);

/**
 * The shop's headings. A fixed list rather than one derived from the range, so
 * a heading can be offered before any product sits in it — and so retiring a
 * product cannot quietly remove a heading from the picker.
 */
export const categories = [
  "Farshi Salwar Sets",
  "Pakistani Party Wear",
  "Pakistani Casual",
  "Office Wear",
  "Cord Sets",
  "Party Wear Cord Sets",
];

export const fabrics = [...new Set(products.map((p) => p.fabric))].sort();
export const colours = [...new Set(products.map((p) => p.colour))].sort();
export const occasions = [...new Set(products.map((p) => p.occasion))].sort();

export const MAX_PRICE = 8000;

export function getProduct(id: string) {
  return products.find((product) => product.id === id) ?? null;
}
