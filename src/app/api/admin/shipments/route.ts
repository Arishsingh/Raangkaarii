import { getAdminUser } from "@/lib/admin";
import {
  createShipment,
  isDelhiveryConfigured,
  pickupName,
  trackShipment,
} from "@/lib/delhivery";
import { getOrder, setOrderWaybill } from "@/lib/orders-store";

/** Books a Delhivery parcel for an order and records its waybill. */
export async function POST(request: Request) {
  if (!(await getAdminUser())) {
    return Response.json({ error: "Not authorised." }, { status: 403 });
  }
  if (!isDelhiveryConfigured()) {
    return Response.json({ error: "DELHIVERY_API_KEY is not set." }, { status: 503 });
  }
  if (!pickupName()) {
    return Response.json(
      {
        error:
          "DELHIVERY_PICKUP_NAME is not set. It must match a pickup location registered on your Delhivery account.",
      },
      { status: 503 },
    );
  }

  let orderId = "";
  try {
    ({ orderId } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const order = await getOrder(String(orderId).trim());
  if (!order) return Response.json({ error: "No such order." }, { status: 404 });
  if (order.waybill) {
    // Booking twice would leave two parcels against one order.
    return Response.json({ waybill: order.waybill, alreadyBooked: true });
  }
  if (!order.address) {
    return Response.json(
      { error: "This order has no delivery address, so it cannot be shipped." },
      { status: 400 },
    );
  }

  try {
    const { waybill, remarks } = await createShipment({
      orderId: order.id,
      address: order.address,
      codAmount: order.payable,
      paymentMode: order.payment === "Cash on Delivery" ? "COD" : "Prepaid",
      description: order.lines.map((line) => line.name).join(", ").slice(0, 250),
      quantity: order.items,
    });

    await setOrderWaybill(order.id, waybill);
    return Response.json({ waybill, remarks });
  } catch (caught) {
    console.error("Could not book the shipment", caught);
    return Response.json(
      { error: caught instanceof Error ? caught.message : "Could not book the shipment." },
      { status: 502 },
    );
  }
}

/** Current tracking for a booked parcel. */
export async function GET(request: Request) {
  if (!(await getAdminUser())) {
    return Response.json({ error: "Not authorised." }, { status: 403 });
  }

  const waybill = new URL(request.url).searchParams.get("waybill") ?? "";
  if (!waybill) return Response.json({ error: "Missing waybill." }, { status: 400 });

  try {
    const tracking = await trackShipment(waybill);
    if (!tracking) return Response.json({ error: "Nothing tracked yet." }, { status: 404 });
    return Response.json(tracking);
  } catch (caught) {
    console.error("Could not track the shipment", caught);
    return Response.json({ error: "Could not reach Delhivery." }, { status: 502 });
  }
}
