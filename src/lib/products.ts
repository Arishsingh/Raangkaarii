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
  image: string;
  alt: string;
};

export const products: Product[] = [
  { id: "p1", name: "Hand-Embroidered Kurta Set", blurb: "Cotton voile kurta with hand-worked thread detail", price: 4200, category: "Kurta Sets", fabric: "Cotton Voile", colour: "Maroon", occasion: "Everyday", sizes: ["S", "M", "L", "XL"], inStock: true, image: "/hero-2.png", alt: "Model in an embroidered kurta" },
  { id: "p2", name: "Crimson Organza Sharara", blurb: "Gold thread on crimson, cut for evening light", price: 6800, category: "Sharara Sets", fabric: "Organza", colour: "Crimson", occasion: "Festive", sizes: ["S", "M", "L"], inStock: true, image: "/hero-4.png", alt: "Model in a crimson embroidered set" },
  { id: "p3", name: "Linen Blend Wide Trousers", blurb: "Breathable linen blend with a relaxed drape", price: 2600, category: "Separates", fabric: "Linen Blend", colour: "Ivory", occasion: "Everyday", sizes: ["XS", "S", "M", "L", "XL", "XXL"], inStock: true, image: "/hero-3.png", alt: "Woman choosing linen pieces" },
  { id: "p4", name: "Velvet Patiala Set", blurb: "Deep red velvet, tailored for festive evenings", price: 7400, category: "Kurta Sets", fabric: "Velvet", colour: "Crimson", occasion: "Wedding", sizes: ["M", "L", "XL"], inStock: false, image: "/hero-5.png", alt: "Model in a red velvet set" },
  { id: "p5", name: "Everyday Cotton Shirt", blurb: "Soft-washed cotton you reach for without thinking", price: 1900, category: "Separates", fabric: "Cotton", colour: "Ivory", occasion: "Everyday", sizes: ["XS", "S", "M", "L"], inStock: true, image: "/hero.png", alt: "Rails of curated clothing" },
  { id: "p6", name: "Gauze Frill Collar Set", blurb: "Rosewater gauze with a contrast piped trim", price: 3800, category: "Kurta Sets", fabric: "Cotton Gauze", colour: "Rosewater", occasion: "Everyday", sizes: ["S", "M", "L", "XL"], inStock: true, image: "/hero-4.png", alt: "Model in a gauze frill set" },
  { id: "p7", name: "Block Print Nightdress", blurb: "Hand block printed cotton, made for warm nights", price: 2200, category: "Nightwear", fabric: "Cotton", colour: "Pale Blue", occasion: "Everyday", sizes: ["S", "M", "L", "XL", "XXL"], inStock: true, image: "/hero-3.png", alt: "Printed cotton nightdress" },
  { id: "p8", name: "Satin Slip Dress", blurb: "Fluid satin with a bias cut and clean neckline", price: 4600, category: "Dresses", fabric: "Satin", colour: "Rosewater", occasion: "Party", sizes: ["XS", "S", "M"], inStock: false, image: "/hero-5.png", alt: "Model in a satin slip" },
  { id: "p9", name: "Striped Cotton Co-ord", blurb: "Woven stripes on breathable summer cotton", price: 3100, category: "Co-ord Sets", fabric: "Cotton", colour: "Pale Blue", occasion: "Everyday", sizes: ["S", "M", "L"], inStock: true, image: "/hero-2.png", alt: "Striped cotton co-ord" },
  { id: "p10", name: "Chikankari Anarkali", blurb: "White-on-white chikankari with a full sweep", price: 5900, category: "Anarkali", fabric: "Cotton Voile", colour: "Ivory", occasion: "Festive", sizes: ["S", "M", "L", "XL"], inStock: true, image: "/hero-4.png", alt: "Model in a white anarkali" },
  { id: "p11", name: "Zari Border Dupatta", blurb: "Sheer organza dupatta with a woven zari edge", price: 1600, category: "Dupattas", fabric: "Organza", colour: "Gold", occasion: "Festive", sizes: ["One Size"], inStock: true, image: "/hero-5.png", alt: "Organza dupatta with zari border" },
  { id: "p12", name: "Mul Cotton Palazzo", blurb: "Feather-light mul cotton with a wide leg", price: 1800, category: "Separates", fabric: "Cotton", colour: "Maroon", occasion: "Everyday", sizes: ["S", "M", "L", "XL", "XXL"], inStock: true, image: "/hero.png", alt: "Mul cotton palazzo trousers" },
];

/** Which product field each filter heading reads. */
export const filterFields = {
  Category: "category",
  Fabric: "fabric",
  Colour: "colour",
  Occasion: "occasion",
} as const;

/** Counts come from the catalogue so they can never drift out of sync. */
function countBy(field: keyof Product) {
  const tally = new Map<string, number>();
  for (const product of products) {
    const value = String(product[field]);
    tally.set(value, (tally.get(value) ?? 0) + 1);
  }
  return [...tally.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

export const sizeOptions = (() => {
  const order = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
  const tally = new Map<string, number>();
  for (const product of products) {
    for (const size of product.sizes) {
      tally.set(size, (tally.get(size) ?? 0) + 1);
    }
  }
  return order
    .filter((size) => tally.has(size))
    .map((label) => ({ label, count: tally.get(label)! }));
})();

export const filterGroups: FilterGroup[] = [
  { heading: "Category", options: countBy("category") },
  { heading: "Fabric", options: countBy("fabric") },
  { heading: "Colour", options: countBy("colour") },
  { heading: "Occasion", options: countBy("occasion") },
  { heading: "Size", options: sizeOptions },
  {
    heading: "Availability",
    options: [
      { label: "In stock", count: products.filter((p) => p.inStock).length },
      { label: "Made to order", count: products.filter((p) => !p.inStock).length },
    ],
  },
];

export const MAX_PRICE = 8000;

export function getProduct(id: string) {
  return products.find((product) => product.id === id) ?? null;
}
