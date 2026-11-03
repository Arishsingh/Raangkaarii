import "server-only";

import { getSql, isDatabaseConfigured, readWithFallback } from "@/lib/db";

/**
 * What the homepage spotlights: two hand-picked product shelves and a wall of
 * customer feedback. All of it is chosen in the admin panel, so it lives in
 * the database next to the products rather than in code.
 */
export const SHELVES = ["viral", "loved"] as const;
export type Shelf = (typeof SHELVES)[number];

export function isShelf(value: unknown): value is Shelf {
  return typeof value === "string" && (SHELVES as readonly string[]).includes(value);
}

export type Feedback = {
  id: string;
  /** A photo of the customer in the piece, or a screenshot of their message. */
  image: string;
  /** Optional — a screenshot often says it all. Empty string means none. */
  name: string;
  quote: string;
  /** 1–5. Zero means "no stars shown". */
  rating: number;
  createdAt: string;
};

let schemaReady: Promise<void> | null = null;

function ensureShowcaseSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      /**
       * product_id is not a foreign key: a pick can name a built-in piece,
       * which lives in code. A pick whose product has since gone is skipped
       * when the shelf is read.
       */
      await sql`
        create table if not exists homepage_picks (
          shelf      text not null,
          product_id text not null,
          position   integer not null default 0,
          primary key (shelf, product_id)
        )
      `;
      await sql`
        create table if not exists customer_feedback (
          id         text primary key,
          image      text not null,
          name       text not null default '',
          quote      text not null default '',
          rating     integer not null default 5,
          created_at timestamptz not null default now()
        )
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/** Reads never throw — a missing table only means an empty shelf. */
export async function listPicks(): Promise<Record<Shelf, string[]>> {
  const empty = (): Record<Shelf, string[]> => ({ viral: [], loved: [] });
  if (!isDatabaseConfigured()) return empty();
  return readWithFallback(
    "homepage-picks",
    async () => {
      await ensureShowcaseSchema();
      const sql = getSql();
      const rows = (await sql`
        select shelf, product_id from homepage_picks order by position asc
      `) as { shelf: string; product_id: string }[];
      const picks = empty();
      for (const row of rows) {
        if (isShelf(row.shelf)) picks[row.shelf].push(row.product_id);
      }
      return picks;
    },
    empty(),
    "Could not load homepage picks",
  );
}

/** Replaces a whole shelf, in the order given. */
export async function setShelf(shelf: Shelf, productIds: string[]) {
  await ensureShowcaseSchema();
  const sql = getSql();
  const unique = [...new Set(productIds)];
  const positions = unique.map((_, index) => index);
  await sql.transaction([
    sql`delete from homepage_picks where shelf = ${shelf}`,
    ...(unique.length > 0
      ? [
          sql`
            insert into homepage_picks (shelf, product_id, position)
            select ${shelf}, id, pos
            from unnest(${unique}::text[], ${positions}::int[]) as t(id, pos)
          `,
        ]
      : []),
  ]);
}

type FeedbackRow = {
  id: string;
  image: string;
  name: string;
  quote: string;
  rating: number;
  created_at: string | Date;
};

export async function listFeedback(): Promise<Feedback[]> {
  if (!isDatabaseConfigured()) return [];
  return readWithFallback("customer-feedback", async () => {
    await ensureShowcaseSchema();
    const sql = getSql();
    const rows = (await sql`
      select * from customer_feedback order by created_at desc
    `) as FeedbackRow[];
    return rows.map((row) => ({
      id: row.id,
      image: row.image,
      name: row.name,
      quote: row.quote,
      rating: Number(row.rating),
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }, [], "Could not load customer feedback");
}

export async function addFeedback(input: Omit<Feedback, "createdAt">) {
  await ensureShowcaseSchema();
  const sql = getSql();
  await sql`
    insert into customer_feedback (id, image, name, quote, rating)
    values (${input.id}, ${input.image}, ${input.name}, ${input.quote}, ${input.rating})
  `;
}

export async function deleteFeedback(id: string) {
  await ensureShowcaseSchema();
  const sql = getSql();
  await sql`delete from customer_feedback where id = ${id}`;
}
