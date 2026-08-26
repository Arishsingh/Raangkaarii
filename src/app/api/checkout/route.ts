import Razorpay from "razorpay";
import { currentUser } from "@clerk/nextjs/server";

import { getProduct } from "@/lib/products";

type Line = { id: string; size: string; qty: number };

/**
 * Creates a Razorpay order. The amount is recomputed from the catalogue here —
 * never trust a price sent by the browser.
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

  let lines: Line[];
  try {
    ({ lines } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }

  let amount = 0;
  for (const line of lines) {
    const product = getProduct(line.id);
    const qty = Number(line.qty);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return Response.json({ error: "Your cart has an invalid item." }, { status: 400 });
    }
    amount += product.price * qty;
  }

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      // Razorpay works in the smallest currency unit, so rupees → paise.
      amount: amount * 100,
      currency: "INR",
      receipt: `rk_${Date.now()}`,
      notes: {
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
      },
    });

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      email: user.primaryEmailAddress?.emailAddress ?? "",
    });
  } catch (caught) {
    console.error("Razorpay order failed", caught);
    return Response.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
