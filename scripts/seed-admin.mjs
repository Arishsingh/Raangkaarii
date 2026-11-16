// Creates (or resets the password of) an admin account in MongoDB Atlas.
//
//   ADMIN_EMAIL=admin@gmail.com ADMIN_PASSWORD='...' \
//     node --env-file=.env.local scripts/seed-admin.mjs
//
// The email must also be in ADMIN_EMAILS (src/lib/admin-emails.ts) to get admin
// rights. The password is hashed with bcrypt, 12 rounds — same as sign-up.
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD.");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set.");

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
try {
  const users = client.db(process.env.MONGODB_DB || "raangkaari").collection("users");
  await users.createIndex({ email: 1 }, { unique: true, sparse: true });
  const hash = await bcrypt.hash(password, 12);
  const result = await users.updateOne(
    { email },
    { $set: { password: hash, emailVerified: new Date() }, $setOnInsert: { name: "Admin", image: null } },
    { upsert: true },
  );
  console.log(result.upsertedCount ? `Created ${email}` : `Updated password for ${email}`);
} finally {
  await client.close();
}
