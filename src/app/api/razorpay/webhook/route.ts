import { handleRazorpayWebhook } from "@/lib/razorpay-webhook";

/**
 * Legacy alias for `/api/webhooks/razorpay`, which is the URL now registered in
 * the Razorpay dashboard. Kept so a delivery still queued against the old path
 * (or a retry of one) is reconciled instead of retried forever.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRazorpayWebhook(request);
}
