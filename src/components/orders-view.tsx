"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { getProduct } from "@/lib/products";
import { loadOrders, statusFor, type Order } from "@/lib/orders";

export function OrdersView() {
  const [orders, setOrders] = React.useState<Order[]>([]);

  React.useEffect(() => setOrders(loadOrders()), []);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="text-xs font-light text-foreground/50">
            <span>Your account</span>
            <span className="px-1.5">·</span>
            <span className="text-foreground">Orders</span>
          </nav>
          <h1 className="mt-1 font-serif text-2xl">Your orders</h1>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-light transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          Back to all pieces
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="py-24 text-center text-sm font-light text-foreground/60">
          You have not placed an order yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => {
            const status = statusFor(order);
            const names = order.lines
              .map((line) => getProduct(line.id)?.name)
              .filter(Boolean);

            return (
              <li key={order.id}>
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="grid grid-cols-1 items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:bg-muted sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{order.id}</p>
                    <p className="mt-1 line-clamp-1 text-sm font-light text-foreground/65">
                      {names.join(", ")}
                    </p>
                    <p className="mt-1 text-xs font-light text-foreground/50">
                      Placed{" "}
                      {new Date(order.placedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {order.payment}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-green-700/10 px-3 py-1.5 text-xs font-medium text-green-800">
                    {status}
                  </span>

                  <p className="text-sm font-medium sm:w-24 sm:text-right">
                    ₹{order.totals.payable.toLocaleString("en-IN")}
                  </p>

                  <ChevronRight className="hidden size-4 text-foreground/40 sm:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
