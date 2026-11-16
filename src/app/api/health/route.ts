import { getDatabaseStatus } from "@/lib/db";
import { getMongoDb, isMongoConfigured } from "@/lib/mongo";

export const dynamic = "force-dynamic";

/**
 * Says which backing stores this deployment can reach, so a failing sign-up
 * or sign-in can be told apart from a missing secret without reading logs.
 * Reports only a status word — never a connection string, host or password.
 */
export async function GET() {
  let accounts = "ok";
  if (!isMongoConfigured()) {
    accounts = "MONGODB_URI is not set";
  } else {
    try {
      await (await getMongoDb()).command({ ping: 1 });
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      accounts = /auth/i.test(String(error)) ? `${name}: authentication failed` : name;
    }
  }

  const shop = await getDatabaseStatus(); // "ok" | "quota" | "down"
  const secrets = {
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST === "true",
    MONGODB_DB: process.env.MONGODB_DB ?? "(default: raangkaari)",
  };

  const healthy = accounts === "ok";
  return Response.json(
    { accounts: { mongodb: accounts }, shop: { neon: shop }, secrets },
    { status: healthy ? 200 : 503 },
  );
}
