// Copies the shop's data from the OLD Neon database into the NEW one.
//
//   OLD_DATABASE_URL='postgresql://...old...' \
//     node --env-file=.env.local scripts/copy-neon-data.mjs          # dry run (counts only)
//   ... same ... scripts/copy-neon-data.mjs --write                  # copy
//
// DATABASE_URL (from .env.local) is the destination. Copies products, media,
// homepage picks, customer feedback, hidden built-ins and orders. Existing rows
// in the destination are kept (ON CONFLICT DO NOTHING), so it is safe to re-run.
// Users are not copied: accounts live in MongoDB Atlas now.
import { neon } from "@neondatabase/serverless";

const write = process.argv.includes("--write");
const from = neon(process.env.OLD_DATABASE_URL ?? (() => { throw new Error("Set OLD_DATABASE_URL"); })());
const to = neon(process.env.DATABASE_URL);

const tables = [
  ["admin_products", "id"],
  ["hidden_builtins", "id"],
  ["homepage_picks", "shelf, product_id"],
  ["customer_feedback", "id"],
  ["media", "id"],
  ["orders", "id"],
  ["webhook_events", "id"],
];

for (const [table, key] of tables) {
  let rows;
  try {
    rows = await from.query(`select * from ${table}`);
  } catch (e) {
    console.log(`${table}: skipped (${e.message.slice(0, 70)})`);
    continue;
  }
  console.log(`${table}: ${rows.length} rows${write ? "" : " (dry run)"}`);
  if (!write || rows.length === 0) continue;
  for (const row of rows) {
    const cols = Object.keys(row);
    const vals = cols.map((c) => row[c]);
    const marks = cols.map((_, i) => `$${i + 1}`).join(", ");
    await to.query(
      `insert into ${table} (${cols.map((c) => `"${c}"`).join(", ")}) values (${marks}) on conflict (${key}) do nothing`,
      vals,
    );
  }
}
