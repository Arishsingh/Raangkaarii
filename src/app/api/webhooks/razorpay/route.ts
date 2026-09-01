import { handleRazorpayWebhook } from "@/lib/razorpay-webhook";

/**
 * The endpoint registered in the Razorpay dashboard:
 *   https://raangkaarii-bay.vercel.app/api/webhooks/razorpay
 *
 * `/api/razorpay/webhook` is kept as an alias for deliveries already in flight
 * against the older URL.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRazorpayWebhook(request);
}
