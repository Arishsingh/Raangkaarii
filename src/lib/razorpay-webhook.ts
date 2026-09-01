import "server-only";

import { markOrderFailed, markOrderPaid } from "@/lib/orders-store";
import { webhookSignatureValid, webhooksConfigured } from "@/lib/razorpay";
import { recordWebhookEvent } from "@/lib/webhook-events-store";

/**
 * Razorpay's server-to-server record of what happened to a payment.
 *
 * This is the authoritative path, not the browser handler: a shopper who pays
 * and then closes the tab, loses signal, or hits a dead battery never runs the
 * handler at all, and without this the money would be captured against an
 * order that stays 'pending' forever.
 *
 * Configure at Razorpay Dashboard → Settings → Webhooks:
 *   URL     https://raangkaarii-bay.vercel.app/api/webhooks/razorpay
 *   Events  payment.captured, payment.failed
 *   Secret  → RAZORPAY_WEBHOOK_SECRET
 *
 * Every delivery — including the ones rejected for a bad signature — is
 * written to `razorpay_webhook_events` so the admin panel can show what
 * Razorpay actually sent and what we did about it.
 */
type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        error_description?: string;
      };
    };
    order?: { entity?: { id?: string; amount?: number } };
  };
};

/** Razorpay sends amounts in paise; the orders table stores whole rupees. */
function toRupees(paise: number | undefined) {
  return typeof paise === "number" ? Math.round(paise / 100) : null;
}

export async function handleRazorpayWebhook(request: Request) {
  const eventId = request.headers.get("x-razorpay-event-id");

  if (!webhooksConfigured()) {
    console.error("Razorpay webhook hit but RAZORPAY_WEBHOOK_SECRET is not set");
    await recordWebhookEvent({
      eventId,
      event: "unknown",
      status: "rejected",
      signatureValid: false,
      message: "RAZORPAY_WEBHOOK_SECRET is not set.",
    });
    return Response.json({ error: "Webhooks are not configured." }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    await recordWebhookEvent({
      eventId,
      event: "unknown",
      status: "rejected",
      signatureValid: false,
      message: "Missing x-razorpay-signature header.",
    });
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  // The signature covers the exact bytes Razorpay sent, so the body has to be
  // read as text and parsed afterwards — never request.json() first.
  const raw = await request.text();
  if (!webhookSignatureValid(raw, signature)) {
    console.error("Razorpay webhook signature mismatch");
    await recordWebhookEvent({
      eventId,
      event: "unknown",
      status: "rejected",
      signatureValid: false,
      message: "Signature did not match RAZORPAY_WEBHOOK_SECRET.",
      // The body is unverified here, so it is kept as text rather than parsed
      // and indexed as if it were a real Razorpay payload.
      payload: { unverifiedBody: raw.slice(0, 4000) },
    });
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let body: WebhookPayload;
  try {
    body = JSON.parse(raw);
  } catch {
    await recordWebhookEvent({
      eventId,
      event: "unknown",
      status: "rejected",
      signatureValid: true,
      message: "Body was signed but is not valid JSON.",
    });
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const event = body.event ?? "unknown";
  const payment = body.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id ?? body.payload?.order?.entity?.id ?? null;
  const paymentId = payment?.id ?? null;
  const amount = toRupees(payment?.amount ?? body.payload?.order?.entity?.amount);

  const base = {
    eventId,
    event,
    signatureValid: true,
    razorpayOrderId,
    paymentId,
    amount,
    payload: body,
  };

  if (!razorpayOrderId) {
    // Nothing to reconcile, but a non-2xx would make Razorpay retry forever.
    await recordWebhookEvent({
      ...base,
      status: "received",
      message: "No Razorpay order id on the payload; nothing to reconcile.",
    });
    return Response.json({ ok: true, ignored: event });
  }

  try {
    if (event === "payment.captured" && paymentId) {
      const id = await markOrderPaid(razorpayOrderId, paymentId);
      // Null means nothing was left to flip: either the browser handler got
      // there first, or this is a retry of a delivery we already applied.
      await recordWebhookEvent({
        ...base,
        status: id ? "processed" : "duplicate",
        orderId: id,
        message: id
          ? "Order marked paid."
          : "No pending order matched — already reconciled, or unknown to this store.",
      });
      return Response.json({ ok: true, id, alreadyRecorded: id === null });
    }

    if (event === "payment.failed") {
      await markOrderFailed(razorpayOrderId);
      await recordWebhookEvent({
        ...base,
        status: "processed",
        message: payment?.error_description ?? "Payment failed.",
      });
      return Response.json({ ok: true, failed: true });
    }
  } catch (caught) {
    // A 5xx makes Razorpay retry with backoff, which is what we want when the
    // database is briefly unreachable.
    console.error("Razorpay webhook could not update the order", caught);
    await recordWebhookEvent({
      ...base,
      status: "failed",
      message: caught instanceof Error ? caught.message : "Could not update the order.",
    });
    return Response.json({ error: "Could not update the order." }, { status: 500 });
  }

  await recordWebhookEvent({
    ...base,
    status: "received",
    message: `No handler for ${event}; acknowledged and logged.`,
  });
  return Response.json({ ok: true, ignored: event });
}
