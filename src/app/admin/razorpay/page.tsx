import { listRazorpayTransactions } from "@/lib/orders-store";
import { getRazorpayConfigStatus } from "@/lib/razorpay";
import { listWebhookEvents } from "@/lib/webhook-events-store";
import { RazorpayDashboard } from "@/components/admin/razorpay-dashboard";

export const metadata = { title: "Razorpay Payments — Admin" };

export default async function AdminRazorpayPage() {
  const status = getRazorpayConfigStatus();
  // Independent reads, so one round trip instead of two.
  const [transactions, webhookEvents] = await Promise.all([
    listRazorpayTransactions(),
    listWebhookEvents(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-light">Razorpay Payments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor Razorpay payment gateway credentials, webhook deliveries, and online transactions.
        </p>
      </div>

      <RazorpayDashboard
        status={status}
        transactions={transactions}
        webhookEvents={webhookEvents}
      />
    </div>
  );
}
