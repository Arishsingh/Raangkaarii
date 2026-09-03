"use client";

import * as React from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, MapPin, Package, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/products";
import { splitCartLines } from "@/lib/cart-lines";
import { ProductMedia } from "@/components/product-media";
import {
  loadAddress,
  newOrderId,
  priceBreakdown,
  saveAddress,
  saveOrder,
  type Address,
  type Order,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const EMPTY: Address = {
  name: "",
  phone: "",
  pincode: "",
  line1: "",
  locality: "",
  city: "",
  state: "",
  type: "Home",
};

const STEPS = ["Delivery address", "Order summary", "Payment"] as const;

export function CheckoutFlow({
  products,
  deliveryBy,
}: {
  products: Product[];
  /**
   * Worked out on the server and passed in. Calling Date.now() while rendering
   * gave the server and the browser two different answers for the same markup,
   * which is a hydration mismatch as well as an impure render.
   */
  deliveryBy: number;
}) {
  const router = useRouter();
  const cart = useCart();
  const savedLines = cart?.lines;


  const [step, setStep] = React.useState(0);
  const [address, setAddress] = React.useState<Address>(EMPTY);
  /**
   * The answer carries the pincode it belongs to, so "still checking" is
   * derived from comparing it with what is typed rather than held as its own
   * flag — which keeps the effect below free of a synchronous setState.
   */
  const [lookup, setLookup] = React.useState<{
    pincode: string;
    serviceable: boolean | null;
    cod: boolean;
    city: string;
    state: string;
  }>({ pincode: "", serviceable: null, cod: true, city: "", state: "" });
  const [payment, setPayment] = React.useState<"Razorpay" | "Cash on Delivery">("Razorpay");
  const [scriptReady, setScriptReady] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    const saved = loadAddress();
    if (saved) setAddress(saved);
  }, []);

  // Everything the admin panel has added, which the built-in list never saw.
  const { rows, missing } = React.useMemo(
    () => splitCartLines(savedLines ?? [], products),
    [savedLines, products],
  );

  /**
   * Only what the catalogue still stocks is ever sent to the server. Posting
   * the saved cart wholesale meant one delisted piece failed the whole order
   * with "an item we no longer stock", and the shopper had no way to find it.
   */
  const orderLines = React.useMemo(() => rows.map(({ line }) => line), [rows]);

  const subtotal = rows.reduce(
    (total, row) => total + row.product.price * row.line.qty,
    0,
  );
  const itemCount = rows.reduce((total, row) => total + row.line.qty, 0);
  const totals = priceBreakdown(subtotal, itemCount);

  const pincode = address.pincode.replace(/\D/g, "");

  React.useEffect(() => {
    if (pincode.length !== 6) return;

    // A later keystroke must win, so a stale reply is discarded.
    let current = true;

    fetch(`/api/delhivery/serviceability?pincode=${pincode}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!current) return;
        setLookup({
          pincode,
          // A courier outage leaves this unknown rather than "not serviceable".
          serviceable: data ? Boolean(data.serviceable) : null,
          cod: data ? Boolean(data.cod) : true,
          city: data?.city ?? "",
          state: data?.state ?? "",
        });
      })
      .catch(() => {
        if (current) {
          setLookup({
            pincode,
            serviceable: null,
            cod: true,
            city: "",
            state: "",
          });
        }
      });

    return () => {
      current = false;
    };
  }, [pincode]);

  const answered = lookup.pincode === pincode ? lookup : null;
  const checkingPincode = pincode.length === 6 && !answered;
  const serviceable = answered?.serviceable ?? null;
  const codAvailable = answered ? answered.cod : true;

  const complete = async (receipt?: RazorpayResponse, serverId?: string) => {
    const paymentId = receipt?.razorpay_payment_id;
    const order: Order = {
      // The server mints the id when it creates the pending row, so the copy
      // the shopper sees has to reuse it or their order page points at nothing.
      id: serverId ?? newOrderId(),
      /**
       * The name and price are copied in rather than left to be looked up on
       * the order page. That page could only see the built-in range, so an
       * admin-added piece showed as nothing at all — and even for the built-ins
       * a later edit would have rewritten what the shopper was shown they paid.
       */
      lines: rows.map(({ line, product }) => ({
        ...line,
        name: product.name,
        price: product.price,
      })),
      address,
      payment,
      paymentId,
      status: "Ordered",
      placedAt: Date.now(),
      deliveryBy,
      totals,
    };
    // Local copy drives the shopper's own order pages.
    saveOrder(order);

    /**
     * Server copy is what the admin revenue page reads. A failure here must not
     * strand someone who has already paid, so it only logs.
     */
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          lines: orderLines,
          payment,
          paymentId,
          // The courier needs this; the row is unshippable without it.
          address,
          razorpayOrderId: receipt?.razorpay_order_id,
          razorpaySignature: receipt?.razorpay_signature,
        }),
      });
    } catch (caught) {
      console.error("Could not record the order server-side", caught);
    }

    cart?.clear();
    router.push(`/dashboard/orders/${order.id}`);
  };

  const submitAddress = (event: React.FormEvent) => {
    event.preventDefault();
    // Only a confirmed "no" blocks; an unreachable courier must not stop a sale.
    if (serviceable === false) {
      toast.error(`We cannot deliver to ${pincode} yet.`);
      return;
    }
    saveAddress(address);
    setStep(1);
  };

  const placeOrder = async () => {
    if (pending || rows.length === 0) return;

    if (payment === "Cash on Delivery" && !codAvailable) {
      toast.error("Cash on delivery is not available at this pincode.");
      return;
    }

    if (payment === "Cash on Delivery") {
      setPending(true);
      await complete();
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: orderLines, address }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error ?? "Could not start payment.");
      if (!window.Razorpay) throw new Error("Payment window failed to load.");

      new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Rangkaarii",
        description: `${itemCount} item${itemCount === 1 ? "" : "s"}`,
        order_id: order.orderId,
        prefill: { name: address.name, email: order.email, contact: address.phone },
        theme: { color: "#1a1a1a" },
        handler: async (result: RazorpayResponse) => {
          const verify = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
          });
          if (verify.ok) {
            await complete(result, order.receiptId);
          } else {
            toast.error("Payment could not be verified.");
            setPending(false);
          }
        },
        modal: { ondismiss: () => setPending(false) },
      }).open();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Payment failed.");
      setPending(false);
    }
  };

  if (rows.length === 0) {
    // Saying "empty" when the cart still holds pieces we have stopped stocking
    // sends the shopper back to a cart that keeps insisting it has items.
    return (
      <div className="mx-auto w-full max-w-[1400px] px-5 py-24 text-center sm:px-8">
        <p className="text-sm font-light text-foreground/60">
          {missing.length > 0
            ? "Nothing in your cart is available any more."
            : "Your cart is empty."}
        </p>
        <Link
          href={missing.length > 0 ? "/dashboard/cart" : "/dashboard"}
          className="mt-5 inline-flex rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background"
        >
          {missing.length > 0 ? "Back to your cart" : "Continue shopping"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="text-xs font-light text-foreground/50">
            <span>Your account</span>
            <span className="px-1.5">·</span>
            <span className="text-foreground">Checkout</span>
          </nav>
          <h1 className="mt-1 font-serif text-2xl">Checkout</h1>
        </div>
        <Link
          href="/dashboard/cart"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-light transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          Back to cart
        </Link>
      </div>

      {missing.length > 0 ? (
        <p className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm font-light">
          {missing.length === 1 ? "One piece" : `${missing.length} pieces`} in your cart are no
          longer stocked and are not part of this order.{" "}
          <Link href="/dashboard/cart" className="underline underline-offset-4">
            Review your cart
          </Link>
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {STEPS.map((title, index) => {
            const done = step > index;
            const active = step === index;
            const Icon = [MapPin, Package, Wallet][index];

            return (
              <section
                key={title}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-card",
                  active && "border-foreground",
                )}
              >
                <header className="flex items-center gap-3 px-5 py-4">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm",
                      done || active
                        ? "bg-foreground text-background"
                        : "border text-foreground/50",
                    )}
                  >
                    {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <h2 className="flex-1 text-sm font-medium tracking-wide">
                    {index + 1}. {title.toUpperCase()}
                  </h2>
                  {done ? (
                    <button
                      type="button"
                      onClick={() => setStep(index)}
                      className="text-sm font-light underline underline-offset-4"
                    >
                      Change
                    </button>
                  ) : null}
                </header>

                {/* Step 1 — address */}
                {index === 0 && active ? (
                  <form onSubmit={submitAddress} className="space-y-4 border-t px-5 py-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" id="name" value={address.name} onChange={(v) => setAddress({ ...address, name: v })} />
                      <Field label="Phone number" id="phone" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} pattern="[0-9]{10}" hint="10 digits" />
                      <Field label="Pincode" id="pincode" value={address.pincode} onChange={(v) => setAddress({ ...address, pincode: v })} pattern="[0-9]{6}" hint="6 digits" />
                      <Field label="Locality" id="locality" value={address.locality} onChange={(v) => setAddress({ ...address, locality: v })} />
                    </div>

                    {checkingPincode ? (
                      <p className="text-xs text-muted-foreground">
                        Checking delivery to {pincode}…
                      </p>
                    ) : serviceable === true ? (
                      <p className="text-xs text-muted-foreground">
                        We deliver to {answered?.city || pincode}
                        {answered?.state ? `, ${answered.state}` : ""}.
                        {codAvailable
                          ? ""
                          : " Cash on delivery is not available here."}
                      </p>
                    ) : serviceable === false ? (
                      <p className="text-xs text-destructive">
                        Sorry, we cannot deliver to {pincode} yet.
                      </p>
                    ) : null}
                    <Field label="Address (house no, building, street)" id="line1" value={address.line1} onChange={(v) => setAddress({ ...address, line1: v })} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="City" id="city" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} />
                      <Field label="State" id="state" value={address.state} onChange={(v) => setAddress({ ...address, state: v })} />
                    </div>

                    <div>
                      <p className="text-sm font-medium">Address type</p>
                      <div className="mt-2 flex gap-2">
                        {(["Home", "Work"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setAddress({ ...address, type: option })}
                            className={cn(
                              "rounded-full border px-5 py-2 text-sm font-light transition-colors",
                              address.type === option
                                ? "border-foreground bg-foreground text-background"
                                : "hover:bg-muted",
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="rounded-full px-8">
                      Deliver here
                    </Button>
                  </form>
                ) : null}

                {index === 0 && done ? (
                  <p className="border-t px-5 py-4 text-sm font-light text-foreground/70">
                    <span className="font-medium text-foreground">{address.name}</span>{" "}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{address.type}</span>
                    <br />
                    {address.line1}, {address.locality}, {address.city}, {address.state} — {address.pincode}
                    <br />
                    Phone: {address.phone}
                  </p>
                ) : null}

                {/* Step 2 — summary */}
                {index === 1 && active ? (
                  <div className="border-t px-5 py-5">
                    <ul className="space-y-4">
                      {rows.map(({ line, product }) => (
                        <li
                          key={`${line.id}-${line.size}`}
                          className="flex flex-wrap items-start justify-between gap-3"
                        >
                          <div className="flex min-w-0 flex-1 gap-3">
                            <span className="relative block aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                              <ProductMedia
                                image={product.image}
                                video={product.video}
                                alt={product.alt}
                                sizes="64px"
                                compact
                              />
                            </span>
                            <div className="min-w-0">
                              <p className="font-serif text-lg">{product.name}</p>
                              <p className="mt-1 text-sm font-light text-foreground/60">
                                Size {line.size} · Qty {line.qty}
                              </p>
                              <p className="mt-1 text-xs font-light text-green-700">
                                Delivery by{" "}
                                {new Date(deliveryBy).toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm">
                            ₹{(product.price * line.qty).toLocaleString("en-IN")}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <Button onClick={() => setStep(2)} className="mt-6 rounded-full px-8">
                      Continue
                    </Button>
                  </div>
                ) : null}

                {index === 1 && done ? (
                  <p className="border-t px-5 py-4 text-sm font-light text-foreground/70">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </p>
                ) : null}

                {/* Step 3 — payment */}
                {index === 2 && active ? (
                  <div className="border-t px-5 py-5">
                    <div className="space-y-3">
                      {(
                        [
                          { value: "Razorpay", label: "UPI / Card / Netbanking", note: "Secured by Razorpay" },
                          { value: "Cash on Delivery", label: "Cash on Delivery", note: "Pay when it arrives" },
                        ] as const
                      ).map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                            payment === option.value ? "border-foreground" : "hover:bg-muted",
                          )}
                        >
                          <input
                            type="radio"
                            name="payment"
                            checked={payment === option.value}
                            onChange={() => setPayment(option.value)}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                              payment === option.value && "border-foreground",
                            )}
                          >
                            {payment === option.value ? (
                              <span className="size-2 rounded-full bg-foreground" />
                            ) : null}
                          </span>
                          <span>
                            <span className="block text-sm font-medium">{option.label}</span>
                            <span className="block text-xs font-light text-foreground/55">
                              {option.note}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>

                    <Button
                      onClick={placeOrder}
                      disabled={pending || (payment === "Razorpay" && !scriptReady)}
                      className="mt-6 rounded-full px-8"
                    >
                      {pending
                        ? "Processing…"
                        : payment === "Cash on Delivery"
                          ? "Place order"
                          : `Pay ₹${totals.payable.toLocaleString("en-IN")}`}
                    </Button>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <PricePanel totals={totals} />
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  pattern,
  hint,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  pattern?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        required
        pattern={pattern}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? (
        <p className="text-xs font-light text-foreground/50">{hint}</p>
      ) : null}
    </div>
  );
}

export function PricePanel({
  totals,
}: {
  totals: ReturnType<typeof priceBreakdown>;
}) {
  return (
    <aside className="rounded-2xl border bg-card p-6">
      <h2 className="text-sm font-medium tracking-wide text-foreground/60">
        PRICE DETAILS
      </h2>
      <dl className="mt-4 space-y-3 text-sm font-light">
        <Row label={`Price (${totals.items} item${totals.items === 1 ? "" : "s"})`} value={`₹${totals.listTotal.toLocaleString("en-IN")}`} />
        <Row label="Discount" value={`− ₹${totals.discount.toLocaleString("en-IN")}`} valueClass="text-green-700" />
        <Row
          label="Delivery charges"
          value={totals.delivery === 0 ? "Free" : `₹${totals.delivery}`}
          valueClass={totals.delivery === 0 ? "text-green-700" : undefined}
        />
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-dashed pt-4 text-base font-medium">
        <span>Total payable</span>
        <span>₹{totals.payable.toLocaleString("en-IN")}</span>
      </div>
      {totals.discount > 0 ? (
        <p className="mt-3 text-sm font-light text-green-700">
          You save ₹{totals.discount.toLocaleString("en-IN")} on this order
        </p>
      ) : null}
    </aside>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-foreground/65">{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
  );
}
