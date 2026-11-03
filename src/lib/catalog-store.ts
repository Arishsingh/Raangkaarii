import "server-only";

import { cache } from "react";

import { getSql, isDatabaseConfigured, readWithFallback } from "@/lib/db";

/** A product created through the admin panel. Superset of both catalogue shapes. */
export type AdminProduct = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  compareAt: number | null;
  /** The primary still — always `images[0]`, kept for cards and order lines. */
  image: string;
  /** Optional clip shown on the product page. Empty string means none. */
  video: string;
  /** Every still, in the order the admin arranged them. */
  images: string[];
  /** Every clip, in the order the admin arranged them. */
  videos: string[];
  alt: string;
  /** Dashboard shop heading. Empty string means "not listed in the shop". */
  category: string;
  /** Collection slugs this product is listed under. */
  collections: string[];
  fabric: string;
  colour: string;
  occasion: string;
  style: string;
  print: string;
  sizes: string[];
  badges: string[];
  rating: number;
  inStock: boolean;
  createdAt: string;
};

let schemaReady: Promise<void> | null = null;

/** Idempotent, memoised per server instance so reads pay for it at most once. */
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        create table if not exists admin_products (
          id          text primary key,
          name        text not null,
          blurb       text not null default '',
          price       integer not null,
          compare_at  integer,
          image       text not null,
          video       text not null default '',
          alt         text not null default '',
          category    text not null default '',
          collections text[] not null default '{}',
          fabric      text not null default 'Cotton',
          colour      text not null default 'Ivory',
          occasion    text not null default 'Everyday',
          style       text not null default 'Separates',
          print       text not null default 'Plain',
          sizes       text[] not null default '{}',
          badges      text[] not null default '{}',
          rating      real not null default 4.6,
          in_stock    boolean not null default true,
          created_at  timestamptz not null default now()
        )
      `;
      // Tables created before video support need the column backfilled.
      await sql`
        alter table admin_products
        add column if not exists video text not null default ''
      `;
      /**
       * A product carried exactly one still and one clip until galleries
       * arrived. The singular columns stay as the primary of each set — cards,
       * cart lines and past orders all read them — so an existing row needs no
       * backfill: an empty array falls back to whatever the column holds.
       */
      await sql`
        alter table admin_products
          add column if not exists images text[] not null default '{}',
          add column if not exists videos text[] not null default '{}'
      `;
      // Built-in pieces live in the code, so "removing" one is recorded here.
      await sql`
        create table if not exists hidden_builtins (
          id        text primary key,
          hidden_at timestamptz not null default now()
        )
      `;
    })().catch((error) => {
      // Let the next call retry rather than caching a failed migration.
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

type Row = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  compare_at: number | null;
  image: string;
  video: string;
  images: string[] | null;
  videos: string[] | null;
  alt: string;
  category: string;
  collections: string[];
  fabric: string;
  colour: string;
  occasion: string;
  style: string;
  print: string;
  sizes: string[];
  badges: string[];
  rating: number;
  in_stock: boolean;
  created_at: string | Date;
};

/** An empty array on an older row means "whatever the singular column holds". */
function fallback(list: string[] | null, single: string) {
  const entries = (list ?? []).filter(Boolean);
  if (entries.length > 0) return entries;
  return single ? [single] : [];
}

function toProduct(row: Row): AdminProduct {
  return {
    id: row.id,
    name: row.name,
    blurb: row.blurb,
    price: row.price,
    compareAt: row.compare_at,
    image: row.image,
    video: row.video ?? "",
    // An older row predates the arrays; its single column is the whole set.
    images: fallback(row.images, row.image),
    videos: fallback(row.videos, row.video),
    alt: row.alt,
    category: row.category,
    collections: row.collections ?? [],
    fabric: row.fabric,
    colour: row.colour,
    occasion: row.occasion,
    style: row.style,
    print: row.print,
    sizes: row.sizes ?? [],
    badges: row.badges ?? [],
    rating: Number(row.rating),
    inStock: row.in_stock,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * Reads never throw — a missing database or a cold table degrades to an empty
 * catalogue so the storefront keeps rendering its built-in products.
 */
/**
 * Memoised per request: one page asks for the catalogue from several places
 * (the shop grid, the homepage shelves, the price ceiling), and over a slow
 * link every extra round trip is another chance to time out.
 */
export const listAdminProducts = cache(async function listAdminProducts(): Promise<AdminProduct[]> {
  if (!isDatabaseConfigured()) return [];
  return readWithFallback(
    "admin-products",
    async () => {
      await ensureSchema();
      const sql = getSql();
      const rows = (await sql`
        select * from admin_products order by created_at desc
      `) as Row[];
      return rows.map(toProduct);
    },
    [],
    "Could not load admin products",
  );
});

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      select * from admin_products where id = ${id} limit 1
    `) as Row[];
    return rows[0] ? toProduct(rows[0]) : null;
  } catch (error) {
    console.error("Could not load admin product", error);
    return null;
  }
}

export type ProductInput = Omit<AdminProduct, "createdAt">;

/** Writes DO throw — the admin form needs to surface a real failure. */
export async function upsertAdminProduct(input: ProductInput) {
  await ensureSchema();
  const sql = getSql();
  await sql`
    insert into admin_products (
      id, name, blurb, price, compare_at, image, video, images, videos, alt,
      category, collections,
      fabric, colour, occasion, style, print, sizes, badges, rating, in_stock
    ) values (
      ${input.id}, ${input.name}, ${input.blurb}, ${input.price},
      ${input.compareAt}, ${input.image}, ${input.video},
      ${input.images}::text[], ${input.videos}::text[], ${input.alt}, ${input.category},
      ${input.collections}::text[], ${input.fabric}, ${input.colour},
      ${input.occasion}, ${input.style}, ${input.print}, ${input.sizes}::text[],
      ${input.badges}::text[], ${input.rating}, ${input.inStock}
    )
    on conflict (id) do update set
      name = excluded.name,
      blurb = excluded.blurb,
      price = excluded.price,
      compare_at = excluded.compare_at,
      image = excluded.image,
      video = excluded.video,
      images = excluded.images,
      videos = excluded.videos,
      alt = excluded.alt,
      category = excluded.category,
      collections = excluded.collections,
      fabric = excluded.fabric,
      colour = excluded.colour,
      occasion = excluded.occasion,
      style = excluded.style,
      print = excluded.print,
      sizes = excluded.sizes,
      badges = excluded.badges,
      rating = excluded.rating,
      in_stock = excluded.in_stock
  `;
}

export async function deleteAdminProduct(id: string) {
  await ensureSchema();
  const sql = getSql();
  await sql`delete from admin_products where id = ${id}`;
}

/** True when an id is already taken, so the form can suffix a unique one. */
export async function adminProductIdExists(id: string) {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    select 1 from admin_products where id = ${id} limit 1
  `) as unknown[];
  return rows.length > 0;
}

/**
 * Ids from the built-in range that the admin has removed. Like the other reads
 * this never throws: without a database nothing is hidden, which keeps the
 * whole built-in catalogue on the site rather than emptying it.
 */
export const listHiddenBuiltIns = cache(async function listHiddenBuiltIns(): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];
  return readWithFallback(
    "hidden-builtins",
    async () => {
      await ensureSchema();
      const sql = getSql();
      const rows = (await sql`select id from hidden_builtins`) as { id: string }[];
      return rows.map((row) => row.id);
    },
    [],
    "Could not load hidden built-ins",
  );
});

export async function hideBuiltIn(id: string) {
  await ensureSchema();
  const sql = getSql();
  await sql`
    insert into hidden_builtins (id) values (${id})
    on conflict (id) do nothing
  `;
}
