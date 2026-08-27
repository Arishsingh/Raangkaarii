import { markOrderFailed, markOrderPaid } from "@/lib/orders-store";
import { webhookSignatureValid, webhooksConfigured } from "@/lib/razorpay";

/**
 * Razorpay's server-to-server record of what happened to a payment.
 *
 * This is the authoritative path, not the browser handler: a shopper who pays
 * and then closes the tab, loses signal, or hits a dead battery never runs the
 * handler at all, and without this the money would be captured against an
 * order that stays 'pending' forever.
 *
 * Configure at Razorpay Dashboard → Settings → Webhooks:
 *   URL     https://<your-domain>/api/razorpay/webhook
 *   Events  payment.captured, payment.failed
 *   Secret  → RAZORPAY_WEBHOOK_SECRET
 */
type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: { id?: string; order_id?: string; error_description?: string };
    };
  };
};

export async function POST(request: Request) {
  if (!webhooksConfigured()) {
    console.error("Razorpay webhook hit but RAZORPAY_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Webhooks are not configured." }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  // The signature covers the exact bytes Razorpay sent, so the body has to be
  // read as text and parsed afterwards — never request.json() first.
  const raw = await request.text();
  if (!webhookSignatureValid(raw, signature)) {
    console.error("Razorpay webhook signature mismatch");
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let body: WebhookPayload;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const payment = body.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id;
  const paymentId = payment?.id;

  if (!razorpayOrderId) {
    // Nothing to reconcile, but a non-2xx would make Razorpay retry forever.
    return Response.json({ ok: true, ignored: body.event ?? null });
  }

  try {
    if (body.event === "payment.captured" && paymentId) {
      const id = await markOrderPaid(razorpayOrderId, paymentId);
      // Null means the browser handler already recorded it — not an error.
      return Response.json({ ok: true, id, alreadyRecorded: id === null });
    }

    if (body.event === "payment.failed") {
      await markOrderFailed(razorpayOrderId);
      return Response.json({ ok: true, failed: true });
    }
  } catch (caught) {
    // A 5xx makes Razorpay retry with backoff, which is what we want when the
    // database is briefly unreachable.
    console.error("Razorpay webhook could not update the order", caught);
    return Response.json({ error: "Could not update the order." }, { status: 500 });
  }

  return Response.json({ ok: true, ignored: body.event ?? null });
}
