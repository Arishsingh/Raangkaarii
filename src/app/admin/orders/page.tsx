import { listAllOrders } from "@/lib/orders-store";
import { syncRazorpayPayments } from "@/lib/razorpay-sync";
import { OrdersManagement } from "@/components/admin/orders-management";

export const metadata = { title: "Orders — Admin Control" };

/** Money state changes at Razorpay, not here, so this page is never cached. */
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  /**
   * Ask Razorpay what it holds before listing anything.
   *
   * Without this the panel can only show what the webhook managed to tell it,
   * and a webhook with a mismatched secret tells it nothing at all — which is
   * how a captured payment went missing for a day. Syncing first means a
   * payment that reached Razorpay reaches this page, whatever the webhook did.
   */
  const sync = await syncRazorpayPayments();
  const orders = await listAllOrders();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-light">Orders Control</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every payment Razorpay has taken, where the money is now, and the
          parcel that follows once it has reached your account.
        </p>
      </div>

      {sync.error ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          Could not check Razorpay for new payments, so this list may be behind:{" "}
          {sync.error}
        </p>
      ) : null}

      <OrdersManagement initialOrders={orders} />
    </div>
  );
}
