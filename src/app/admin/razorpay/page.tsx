import { listRazorpayTransactions } from "@/lib/orders-store";
import { getRazorpayConfigStatus } from "@/lib/razorpay";
import { RazorpayDashboard } from "@/components/admin/razorpay-dashboard";

export const metadata = { title: "Razorpay Payments — Admin" };

export default async function AdminRazorpayPage() {
  const status = getRazorpayConfigStatus();
  const transactions = await listRazorpayTransactions();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-light">Razorpay Payments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor Razorpay payment gateway credentials, webhook setup, and online transactions.
        </p>
      </div>

      <RazorpayDashboard status={status} transactions={transactions} />
    </div>
  );
}
