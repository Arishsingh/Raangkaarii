import "server-only";

import crypto from "node:crypto";

/** Constant-time compare so a signature cannot be guessed byte by byte. */
function matches(expected: string, given: string) {
  return (
    expected.length === given.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))
  );
}

/**
 * Verifies the signature Razorpay Checkout hands back in the browser.
 * Anything that fails this is treated as unpaid, whatever the browser claims.
 */
export function signatureValid(
  razorpayOrderId: string,
  paymentId: string,
  signature: string,
) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${paymentId}`)
    .digest("hex");

  return matches(expected, signature);
}

/**
 * Verifies a webhook delivery. This uses the webhook secret set in the Razorpay
 * dashboard — a *different* secret from the API key, and signed over the raw
 * request body, so the body must not be re-serialised before it gets here.
 */
export function webhookSignatureValid(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return matches(expected, signature);
}

export function webhooksConfigured() {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}
