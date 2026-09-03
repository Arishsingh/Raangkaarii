import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import crypto from "node:crypto";
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const sql = neon(process.env.DATABASE_URL);
await sql`create table if not exists _bytea_probe (id text primary key, b bytea)`;

for (const mb of [0.3, 2, 8, 20]) {
  const buf = crypto.randomBytes(Math.round(mb * 1024 * 1024));
  const hex = "\\x" + buf.toString("hex");
  const id = `probe-${mb}`;
  const t0 = Date.now();
  try {
    await sql`insert into _bytea_probe (id, b) values (${id}, ${hex}::bytea)
              on conflict (id) do update set b = excluded.b`;
    const tIn = Date.now() - t0;
    const t1 = Date.now();
    const rows = await sql`select b, octet_length(b) as len from _bytea_probe where id = ${id}`;
    const out = rows[0];
    const tOut = Date.now() - t1;
    const val = out.b;
    const kind = Buffer.isBuffer(val) ? "Buffer" : typeof val;
    const roundTrip = kind === "string" ? Buffer.from(val.slice(2), "hex") : Buffer.from(val);
    console.log(`  ${String(mb).padStart(4)} MB  write ${String(tIn).padStart(5)}ms  read ${String(tOut).padStart(5)}ms  len=${out.len}  type=${kind}  identical=${roundTrip.equals(buf)}`);
  } catch (e) {
    console.log(`  ${String(mb).padStart(4)} MB  FAILED: ${e.message.slice(0, 120)}`);
  }
}
await sql`drop table _bytea_probe`;
