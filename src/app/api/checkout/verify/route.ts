import crypto from "node:crypto";

/**
 * Confirms the payment really came from Razorpay by recomputing the HMAC
 * signature with the secret key. Anything else is treated as unpaid.
 */
export async function POST(request: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
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

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  // Constant-time compare so the signature cannot be guessed byte by byte.
  const valid =
    expected.length === razorpay_signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(razorpay_signature),
    );

  if (!valid) {
    console.error("Razorpay signature mismatch", { razorpay_order_id });
    return Response.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // A real store would record the order here before confirming to the customer.
  return Response.json({ ok: true, paymentId: razorpay_payment_id });
}
