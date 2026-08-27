import { signatureValid } from "@/lib/razorpay";

/**
 * Confirms the payment really came from Razorpay by recomputing the HMAC
 * signature with the secret key. Anything else is treated as unpaid.
 *
 * This only reports on the signature — /api/orders is what records the result,
 * and it re-verifies rather than trusting a prior call to this route.
 */
export async function POST(request: Request) {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return Response.json({ error: "Payments are not configured." }, { status: 503 });
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return Response.json({ error: "Missing payment details." }, { status: 400 });
  }

  if (!signatureValid(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    console.error("Razorpay signature mismatch", { razorpay_order_id });
    return Response.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  return Response.json({ ok: true, paymentId: razorpay_payment_id });
}
