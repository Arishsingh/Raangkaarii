import "server-only";

/**
 * Delhivery's Express Parcel API.
 *
 * The token is a production credential, so every call here is server-side only
 * — never import this from a client component.
 */
const BASE = "https://track.delhivery.com";

function apiKey() {
  const key = process.env.DELHIVERY_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

export function isDelhiveryConfigured() {
  return apiKey() !== null;
}

/**
 * The warehouse a shipment is picked up from. Delhivery matches this against
 * the pickup locations registered on the account, so it has to be the exact
 * registered name rather than a free-text address.
 */
export function pickupName() {
  return process.env.DELHIVERY_PICKUP_NAME?.trim() ?? "";
}

async function call(path: string, init?: RequestInit) {
  const key = apiKey();
  if (!key) throw new Error("DELHIVERY_API_KEY is not set.");

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${key}`,
      Accept: "application/json",
      ...init?.headers,
    },
    // Rates and serviceability move rarely, but never serve a stale shipment.
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Delhivery ${response.status}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Delhivery returned a non-JSON body: ${text.slice(0, 200)}`);
  }
}

export type Serviceability = {
  serviceable: boolean;
  /** Cash on delivery accepted at this pincode. */
  cod: boolean;
  prepaid: boolean;
  city: string;
  state: string;
};

type PinResponse = {
  delivery_codes?: {
    postal_code?: {
      pin?: number;
      city?: string;
      district?: string;
      state_code?: string;
      cod?: string;
      pre_paid?: string;
    };
  }[];
};

/** Whether Delhivery delivers to a pincode, and on what terms. */
export async function checkPincode(pincode: string): Promise<Serviceability> {
  const clean = pincode.replace(/\D/g, "");
  if (clean.length !== 6) {
    return { serviceable: false, cod: false, prepaid: false, city: "", state: "" };
  }

  const data = (await call(
    `/c/api/pin-codes/json/?filter_codes=${clean}`,
  )) as PinResponse;

  const postal = data.delivery_codes?.[0]?.postal_code;
  if (!postal) {
    return { serviceable: false, cod: false, prepaid: false, city: "", state: "" };
  }

  return {
    serviceable: true,
    cod: postal.cod === "Y",
    prepaid: postal.pre_paid === "Y",
    city: postal.city || postal.district || "",
    state: postal.state_code || "",
  };
}

export type ShipmentAddress = {
  name: string;
  phone: string;
  line1: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
};

export type ShipmentRequest = {
  orderId: string;
  address: ShipmentAddress;
  /** Rupees. Delhivery collects this from the customer for a COD parcel. */
  codAmount: number;
  paymentMode: "Prepaid" | "COD";
  description: string;
  quantity: number;
};

export type ShipmentResult = {
  waybill: string;
  /** Delhivery's own message, worth surfacing when it refuses a shipment. */
  remarks: string;
};

type CreateResponse = {
  success?: boolean;
  packages?: { waybill?: string; status?: string; remarks?: string[] }[];
  rmk?: string;
  error?: string;
};

/**
 * Books a parcel and returns its waybill.
 *
 * The payload goes as `format=json&data=<json>` form-encoded — Delhivery does
 * not accept a plain JSON body on this endpoint.
 */
export async function createShipment(
  input: ShipmentRequest,
): Promise<ShipmentResult> {
  const pickup = pickupName();
  if (!pickup) {
    throw new Error(
      "DELHIVERY_PICKUP_NAME is not set. It must match a pickup location registered on the Delhivery account.",
    );
  }

  const payload = {
    shipments: [
      {
        name: input.address.name,
        order: input.orderId,
        payment_mode: input.paymentMode,
        // Delhivery reads 0 as "collect nothing", which is what prepaid means.
        cod_amount: input.paymentMode === "COD" ? String(input.codAmount) : "0",
        total_amount: String(input.codAmount),
        add: [input.address.line1, input.address.locality]
          .filter(Boolean)
          .join(", "),
        city: input.address.city,
        state: input.address.state,
        country: "India",
        phone: input.address.phone,
        pin: input.address.pincode,
        products_desc: input.description,
        quantity: String(input.quantity),
      },
    ],
    pickup_location: { name: pickup },
  };

  const body = new URLSearchParams({
    format: "json",
    data: JSON.stringify(payload),
  });

  const data = (await call("/api/cmu/create.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })) as CreateResponse;

  const parcel = data.packages?.[0];
  const remarks = parcel?.remarks?.filter(Boolean).join("; ") ?? "";

  if (!parcel?.waybill) {
    throw new Error(
      `Delhivery did not return a waybill: ${remarks || data.rmk || data.error || "unknown reason"}`,
    );
  }

  return { waybill: parcel.waybill, remarks };
}

export type TrackingUpdate = {
  status: string;
  location: string;
  at: string;
};

export type Tracking = {
  waybill: string;
  status: string;
  expectedDate: string | null;
  history: TrackingUpdate[];
};

type TrackResponse = {
  ShipmentData?: {
    Shipment?: {
      AWB?: string;
      Status?: { Status?: string; StatusLocation?: string; StatusDateTime?: string };
      ExpectedDeliveryDate?: string | null;
      Scans?: {
        ScanDetail?: {
          Scan?: string;
          ScannedLocation?: string;
          StatusDateTime?: string;
        };
      }[];
    };
  }[];
};

/** Where a parcel is now, newest scan first. */
export async function trackShipment(waybill: string): Promise<Tracking | null> {
  const data = (await call(
    `/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`,
  )) as TrackResponse;

  const shipment = data.ShipmentData?.[0]?.Shipment;
  if (!shipment) return null;

  const history = (shipment.Scans ?? [])
    .map((entry) => ({
      status: entry.ScanDetail?.Scan ?? "",
      location: entry.ScanDetail?.ScannedLocation ?? "",
      at: entry.ScanDetail?.StatusDateTime ?? "",
    }))
    .filter((entry) => entry.status)
    .reverse();

  return {
    waybill: shipment.AWB ?? waybill,
    status: shipment.Status?.Status ?? "Pending",
    expectedDate: shipment.ExpectedDeliveryDate ?? null,
    history,
  };
}
