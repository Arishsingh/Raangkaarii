import "server-only";

import { markSettled, reconcileCapturedPayment } from "@/lib/orders-store";

/**
 * Reads Razorpay for what it actually holds, and writes it onto the orders.
 *
 * The webhook is the fast path and stays the fast path. This is the backstop,
 * and it exists because the fast path has a single point of failure that fails
 * silently: a webhook secret that does not match the dashboard rejects every
 * delivery, and nothing about a rejected delivery reaches the order. That is
 * exactly what happened here — 32 rejected deliveries over a day, while a real
 * captured ₹81 payment stayed invisible to the panel.
 *
 * Polling asks Razorpay directly, with the API key, so no shared secret can
 * come between a captured payment and the admin seeing it.
 *
 * Two different questions get answered:
 *   captured — the shopper's money left their account. Razorpay has it.
 *   settled  — Razorpay has paid it on to the shop's bank account.
 * They are a day or more apart, and the panel shows both.
 */
const API = "https://api.razorpay.com/v1";

/** Razorpay caps a page at 100; the shop is nowhere near that per sync. */
const PAGE = 100;

type RazorpayPayment = {
  id: string;
  status: string;
  amount: number;
  order_id: string | null;
  created_at: number;
  notes?: { receiptId?: string } | null;
};

type ReconEntry = {
  entity_id: string;
  type: string;
  settlement_id?: string | null;
  settled_at?: number | null;
};

export type SyncResult = {
  ok: boolean;
  /** Payments found at Razorpay that the store had never recorded. */
  recovered: string[];
  /** Orders whose money has now reached the bank account. */
  settled: string[];
  error: string | null;
};

function credentials() {
  const id = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!id || !secret) return null;
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function read<T>(path: string, auth: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: auth },
    // Money state is the one thing that must never be served from a cache.
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Razorpay ${response.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as T;
}

/**
 * Only the window that can still change is worth asking about. A payment older
 * than this is either already recorded or was never going to be.
 */
const LOOKBACK_DAYS = 30;

/**
 * Brings the orders table level with Razorpay.
 *
 * Safe to call on every admin page load: each write is conditional — a payment
 * id is only set where there is none, and a settlement only where none is
 * recorded — so running it twice changes nothing the first run did.
 */
export async function syncRazorpayPayments(): Promise<SyncResult> {
  const auth = credentials();
  if (!auth) {
    return { ok: false, recovered: [], settled: [], error: "Razorpay keys are not set." };
  }

  const recovered: string[] = [];
  const settled: string[] = [];

  try {
    const from = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86400;
    const payments = await read<{ items?: RazorpayPayment[] }>(
      `/payments?count=${PAGE}&from=${from}`,
      auth,
    );

    const captured = (payments.items ?? []).filter((p) => p.status === "captured");

    for (const payment of captured) {
      /**
       * The receipt id is our own order id, put into the notes when the
       * Razorpay order was created. It survives everything in between, which
       * makes it a firmer link than matching on amounts or timestamps.
       */
      const orderId = payment.notes?.receiptId?.trim();
      if (!orderId) continue;

      const id = await reconcileCapturedPayment({ orderId, paymentId: payment.id });
      if (id) recovered.push(id);
    }

    /**
     * Settlements are reported per month, so a payment near a month boundary
     * needs last month asked for as well as this one.
     */
    const now = new Date();
    const months = [
      { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 },
      {
        year: now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear(),
        month: now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(),
      },
    ];

    for (const { year, month } of months) {
      const recon = await read<{ items?: ReconEntry[] }>(
        `/settlements/recon/combined?year=${year}&month=${String(month).padStart(2, "0")}`,
        auth,
      );

      for (const entry of recon.items ?? []) {
        if (entry.type !== "payment" || !entry.settlement_id || !entry.settled_at) {
          continue;
        }
        const id = await markSettled({
          paymentId: entry.entity_id,
          settlementId: entry.settlement_id,
          settledAt: new Date(entry.settled_at * 1000).toISOString(),
        });
        if (id) settled.push(id);
      }
    }

    return { ok: true, recovered, settled, error: null };
  } catch (caught) {
    // A sync failure must not take the admin panel down with it: the orders
    // already in the table are still worth showing.
    console.error("Could not sync with Razorpay", caught);
    return {
      ok: false,
      recovered,
      settled,
      error: caught instanceof Error ? caught.message : "Could not reach Razorpay.",
    };
  }
}

export type { MoneyState } from "@/lib/money-state";
export { moneyStateOf } from "@/lib/money-state";
