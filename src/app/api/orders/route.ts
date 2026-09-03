import { auth } from "@/auth";

import {
  markOrderPaid,
  saveOrder,
  type StoredAddress,
} from "@/lib/orders-store";
import { priceCart } from "@/lib/pricing";
import { signatureValid } from "@/lib/razorpay";

type Body = {
  id?: string;
  address?: unknown;
  lines?: unknown;
  payment?: string;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
};


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
 * Records an order once the shopper is through checkout.
 *
 * Razorpay orders already have a pending row from /api/checkout, so this only
 * flips it to paid — the same thing the webhook does, whichever arrives first.
 * Cash on delivery never touches Razorpay, so it is written here in full.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Please sign in." }, { status: 401 });
  }
  const user = session.user;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const isCod = body.payment === "Cash on Delivery";

  if (!isCod) {
    const { paymentId, razorpayOrderId, razorpaySignature } = body;
    if (!paymentId || !razorpayOrderId || !razorpaySignature) {
      return Response.json({ error: "Missing payment details." }, { status: 400 });
    }
    // A payment id only counts as paid if its Razorpay signature checks out.
    if (!signatureValid(razorpayOrderId, paymentId, razorpaySignature)) {
      return Response.json(
        { error: "Payment could not be verified." },
        { status: 400 },
      );
    }

    try {
      const id = await markOrderPaid(razorpayOrderId, paymentId);
      // Null means the webhook already claimed it, which is a success too.
      return Response.json({ ok: true, id: id ?? body.id ?? null });
    } catch (caught) {
      console.error("Could not mark the order paid", caught);
      return Response.json(
        { error: "Could not record the order." },
        { status: 500 },
      );
    }
  }

  const id = String(body.id ?? "").trim();
  if (!id) return Response.json({ error: "Missing order id." }, { status: 400 });

  /**
   * Prices are recomputed from the catalogue, never read from the request —
   * the same rule the Razorpay order route follows.
   */
  const { cart, error } = await priceCart(body.lines);
  if (!cart) return Response.json({ error }, { status: 400 });

  try {
    await saveOrder({
      id,
      userId: user.id,
      email: user.email ?? "",
      name: user.name ?? "",
      lines: cart.lines,
      payment: "Cash on Delivery",
      paymentId: null,
      razorpayOrderId: null,
      status: "pending",
      items: cart.items,
      subtotal: cart.subtotal,
      delivery: cart.delivery,
      payable: cart.payable,
      address: readAddress(body.address),
    });
  } catch (caught) {
    console.error("Could not record order", caught);
    return Response.json({ error: "Could not record the order." }, { status: 500 });
  }

  return Response.json({ ok: true, id, payable: cart.payable });
}
