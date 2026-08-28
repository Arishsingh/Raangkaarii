import Razorpay from "razorpay";
import { currentUser } from "@clerk/nextjs/server";

import { saveOrder, type StoredAddress } from "@/lib/orders-store";
import { priceCart } from "@/lib/pricing";

/** Only the fields a courier needs; anything else the browser sends is dropped. */
function readAddress(value: unknown): StoredAddress | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const text = (key: string) => String(raw[key] ?? "").trim();

  const address = {
    name: text("name"),
    phone: text("phone").replace(/\D/g, ""),
    line1: text("line1"),
    locality: text("locality"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode").replace(/\D/g, ""),
  };

  // A partial address cannot be shipped, so store nothing rather than a stub.
  if (!address.name || !address.line1 || !address.city || address.pincode.length !== 6) {
    return null;
  }
  return address;
}

/**
 * Creates a Razorpay order and the pending order row that goes with it.
 *
 * The row is written *before* the payment window opens so the webhook has
 * something to flip to 'paid'. Without it, a shopper who pays and then closes
 * the tab would leave money captured against no order at all.
 *
 * The amount is recomputed from the catalogue here — never trust a price sent
 * by the browser.
 */
export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return Response.json(
      { error: "Payments are not configured yet." },
      { status: 503 },
    );
  }

  const user = await currentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  let lines: unknown;
  let addressInput: unknown;
  try {
    ({ lines, address: addressInput } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { cart, error } = await priceCart(lines);
  if (!cart) return Response.json({ error }, { status: 400 });

  // Our own id, minted here so the browser cannot pick one that collides with
  // an order someone else already placed.
  const receiptId = `OD${Date.now().toString().slice(-10)}${Math.floor(
    Math.random() * 1000,
  )
    .toString()
    .padStart(3, "0")}`;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      // Razorpay works in the smallest currency unit, so rupees → paise. This
      // is the full payable including delivery; charging the subtotal alone
      // undercharged every order below the free-delivery threshold.
      amount: cart.payable * 100,
      currency: "INR",
      receipt: receiptId,
      notes: { userId: user.id, email, receiptId },
    });

    await saveOrder({
      id: receiptId,
      userId: user.id,
      email,
      name,
      lines: cart.lines,
      payment: "Razorpay",
      paymentId: null,
      razorpayOrderId: order.id,
      status: "pending",
      items: cart.items,
      subtotal: cart.subtotal,
      delivery: cart.delivery,
      payable: cart.payable,
      address: readAddress(addressInput),
    });

    return Response.json({
      orderId: order.id,
      receiptId,
      amount: order.amount,
      currency: order.currency,
      keyId,
      name,
      email,
    });
  } catch (caught) {
    console.error("Razorpay order failed", caught);
    return Response.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
