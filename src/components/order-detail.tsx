"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleDashed } from "lucide-react";

import { getProduct } from "@/lib/products";
import {
  ORDER_STAGES,
  getOrder,
  statusFor,
  type Order,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

export function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = React.useState<Order | null | "loading">("loading");

  // Orders live in browser storage, so they can only be read after mount.
  React.useEffect(() => setOrder(getOrder(id)), [id]);

  if (order === "loading") {
    return <p className="px-5 py-24 text-center text-sm font-light text-foreground/60">Loading…</p>;
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-5 py-24 text-center sm:px-8">
        <p className="text-sm font-light text-foreground/60">
          We could not find that order.
        </p>
        <Link href="/dashboard/orders" className="mt-5 inline-flex rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background">
          View your orders
        </Link>
      </div>
    );
  }

  const status = statusFor(order);
  const reached = ORDER_STAGES.indexOf(status);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="text-xs font-light text-foreground/50">
            <span>Your account</span>
            <span className="px-1.5">·</span>
            <Link href="/dashboard/orders" className="hover:text-foreground">Orders</Link>
            <span className="px-1.5">·</span>
            <span className="text-foreground">{order.id}</span>
          </nav>
          <h1 className="mt-1 font-serif text-2xl">Order {order.id}</h1>
        </div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-light transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          All orders
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-green-700/30 bg-green-700/5 p-5">
        <p className="text-sm font-medium text-green-800">
          Order placed successfully
        </p>
        <p className="mt-1 text-sm font-light text-foreground/70">
          Paid by {order.payment}
          {order.paymentId ? ` · ${order.paymentId}` : ""} · Delivery by{" "}
          {new Date(order.deliveryBy).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* Tracking */}
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-medium tracking-wide text-foreground/60">
              TRACKING
            </h2>
            <ol className="mt-5 space-y-0">
              {ORDER_STAGES.map((stage, index) => {
                const done = index <= reached;
                const last = index === ORDER_STAGES.length - 1;
                return (
                  <li key={stage} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full",
                          done ? "bg-green-700 text-white" : "border text-foreground/35",
                        )}
                      >
                        {done ? <Check className="size-3.5" /> : <CircleDashed className="size-3.5" />}
                      </span>
                      {last ? null : (
                        <span className={cn("h-10 w-px", done ? "bg-green-700" : "bg-border")} />
                      )}
                    </div>
                    <div className="pb-2">
                      <p className={cn("text-sm", done ? "font-medium" : "font-light text-foreground/50")}>
                        {stage}
                      </p>
                      {index === reached ? (
                        <p className="mt-0.5 text-xs font-light text-foreground/55">
                          Current status
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Items */}
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-medium tracking-wide text-foreground/60">ITEMS</h2>
            <ul className="mt-4 space-y-4">
              {order.lines.map((line) => {
                /**
                 * What the order recorded wins. Falling back to the catalogue
                 * dropped every admin-added piece from the list — getProduct
                 * only ever knew the built-in range — and re-priced the rest
                 * from today's catalogue instead of what was actually paid.
                 * The lookup remains only for orders placed before lines
                 * carried their own name and price.
                 */
                const fallback = getProduct(line.id);
                const name = line.name ?? fallback?.name ?? "Item no longer listed";
                const price = line.price ?? fallback?.price ?? 0;
                return (
                  <li key={`${line.id}-${line.size}`} className="flex flex-wrap justify-between gap-3">
                    <div>
                      <Link href={`/dashboard/product/${line.id}`}>
                        <p className="font-serif text-lg transition-opacity hover:opacity-70">
                          {name}
                        </p>
                      </Link>
                      <p className="mt-1 text-sm font-light text-foreground/60">
                        Size {line.size} · Qty {line.qty}
                      </p>
                    </div>
                    <p className="text-sm">
                      ₹{(price * line.qty).toLocaleString("en-IN")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Address */}
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-medium tracking-wide text-foreground/60">
              DELIVERY ADDRESS
            </h2>
            <p className="mt-3 text-sm font-light leading-relaxed text-foreground/75">
              <span className="font-medium text-foreground">{order.address.name}</span>
              <br />
              {order.address.line1}, {order.address.locality}
              <br />
              {order.address.city}, {order.address.state} — {order.address.pincode}
              <br />
              Phone: {order.address.phone}
            </p>
          </section>
        </div>

        <aside className="rounded-2xl border bg-card p-6">
          <h2 className="text-sm font-medium tracking-wide text-foreground/60">
            PRICE DETAILS
          </h2>
          <dl className="mt-4 space-y-3 text-sm font-light">
            <div className="flex justify-between">
              <dt className="text-foreground/65">Price ({order.totals.items} items)</dt>
              <dd>₹{order.totals.listTotal.toLocaleString("en-IN")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground/65">Discount</dt>
              <dd className="text-green-700">− ₹{order.totals.discount.toLocaleString("en-IN")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground/65">Delivery</dt>
              <dd className={order.totals.delivery === 0 ? "text-green-700" : undefined}>
                {order.totals.delivery === 0 ? "Free" : `₹${order.totals.delivery}`}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-between border-t border-dashed pt-4 text-base font-medium">
            <span>Total paid</span>
            <span>₹{order.totals.payable.toLocaleString("en-IN")}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
