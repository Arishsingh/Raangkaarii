import { listAllOrders } from "@/lib/orders-store";
import { OrdersManagement } from "@/components/admin/orders-management";

export const metadata = { title: "Orders — Admin Control" };

export default async function AdminOrdersPage() {
  const orders = await listAllOrders();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-light">Orders Control</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View all customer orders, approve pending orders, book courier shipments, and manage order fulfillment.
        </p>
      </div>

      <OrdersManagement initialOrders={orders} />
    </div>
  );
}
