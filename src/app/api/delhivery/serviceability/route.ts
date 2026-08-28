import { checkPincode, isDelhiveryConfigured } from "@/lib/delhivery";

/**
 * Whether a pincode is deliverable, called from checkout as the shopper types.
 *
 * Deliberately unauthenticated: it exposes nothing but Delhivery's public
 * coverage, and a shopper needs the answer before they have an account.
 */
export async function GET(request: Request) {
  if (!isDelhiveryConfigured()) {
    return Response.json({ error: "Delivery checks are not configured." }, { status: 503 });
  }

  const pincode = new URL(request.url).searchParams.get("pincode") ?? "";
  if (!/^\d{6}$/.test(pincode)) {
    return Response.json({ error: "Enter a 6-digit pincode." }, { status: 400 });
  }

  try {
    return Response.json(await checkPincode(pincode));
  } catch (caught) {
    console.error("Delhivery serviceability check failed", caught);
    return Response.json({ error: "Could not check this pincode." }, { status: 502 });
  }
}
