import { getDatabaseStatus } from "@/lib/db";
import { getMongoDb, isMongoConfigured } from "@/lib/mongo";

export const dynamic = "force-dynamic";

/**
 * A short, safe label for why Mongo could not be reached: an error class and
 * a network code only. Never the message, which can carry hostnames, and never
 * the connection string.
 */
function mongoFailureReason(error: unknown) {
  const name = error instanceof Error ? error.name : "Error";
  if (/auth/i.test(String(error))) return `${name}, authentication failed`;

  const codes = new Set<string>();
  const reason = (error as { reason?: { servers?: Map<string, { error?: { code?: unknown; name?: string; cause?: { code?: unknown } } }> } }).reason;
  for (const server of reason?.servers?.values() ?? []) {
    const code = server.error?.cause?.code ?? server.error?.code ?? server.error?.name;
    if (typeof code === "string" || typeof code === "number") codes.add(String(code));
  }
  const cause = (error as { cause?: { code?: unknown } }).cause?.code;
  if (typeof cause === "string") codes.add(cause);
  return codes.size ? `${name}: ${[...codes].join(", ")}` : name;
}

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
      accounts = `down (${mongoFailureReason(error)})`;
      console.error("Health check: MongoDB unreachable", error);
    }
  }

  const shop = await getDatabaseStatus(); // "ok" | "quota" | "down"
  const healthy = accounts === "ok";
  return Response.json(
    { accounts: { mongodb: accounts }, shop: { neon: shop } },
    { status: healthy ? 200 : 503 },
  );
}
