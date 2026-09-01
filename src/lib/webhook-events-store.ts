import "server-only";

import { getSql, isDatabaseConfigured } from "@/lib/db";

/**
 * Every Razorpay delivery is written here before anything is done with it.
 *
 * Razorpay's own dashboard keeps deliveries for a limited window and shows
 * nothing about what *we* did with one, so a payment that never reconciled
 * used to leave no trace on our side at all. These rows are that trace: the
 * raw payload, the signature verdict, and the outcome of the handler.
 *
 * received  — stored, not acted on yet (or an event we do not handle).
 * processed — an order row was updated because of this delivery.
 * duplicate — Razorpay retried an event we had already applied.
 * rejected  — missing or mismatched signature; nothing was applied.
 * failed    — the handler threw; Razorpay will retry.
 */
export type WebhookEventStatus =
  | "received"
  | "processed"
  | "duplicate"
  | "rejected"
  | "failed";

export type WebhookEvent = {
  id: number;
  eventId: string | null;
  event: string;
  status: WebhookEventStatus;
  signatureValid: boolean;
  razorpayOrderId: string | null;
  paymentId: string | null;
  orderId: string | null;
  amount: number | null;
  message: string | null;
  payload: unknown;
  receivedAt: string;
};

let schemaReady: Promise<void> | null = null;

export function ensureWebhookEventsSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        create table if not exists razorpay_webhook_events (
          id                bigserial primary key,
          event_id          text,
          event             text not null default 'unknown',
          status            text not null default 'received',
          signature_valid   boolean not null default false,
          razorpay_order_id text,
          payment_id        text,
          order_id          text,
          amount            integer,
          message           text,
          payload           jsonb,
          received_at       timestamptz not null default now()
        )
      `;
      await sql`
        create index if not exists razorpay_webhook_events_received_at_idx
          on razorpay_webhook_events (received_at desc)
      `;
      /**
       * Razorpay retries a delivery until it gets a 2xx, and reuses the
       * x-razorpay-event-id across those retries. Indexing it is what lets the
       * log show a retry next to the original instead of looking like two
       * unrelated payments.
       */
      await sql`
        create index if not exists razorpay_webhook_events_event_id_idx
          on razorpay_webhook_events (event_id)
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

type NewWebhookEvent = {
  eventId?: string | null;
  event?: string | null;
  status: WebhookEventStatus;
  signatureValid: boolean;
  razorpayOrderId?: string | null;
  paymentId?: string | null;
  orderId?: string | null;
  amount?: number | null;
  message?: string | null;
  payload?: unknown;
};

/**
 * Never throws: a webhook must still be acknowledged when only the logging
 * leg fails, otherwise Razorpay retries a payment we already reconciled.
 */
export async function recordWebhookEvent(entry: NewWebhookEvent) {
  if (!isDatabaseConfigured()) return;
  try {
    await ensureWebhookEventsSchema();
    const sql = getSql();
    await sql`
      insert into razorpay_webhook_events (
        event_id, event, status, signature_valid, razorpay_order_id,
        payment_id, order_id, amount, message, payload
      ) values (
        ${entry.eventId ?? null}, ${entry.event ?? "unknown"}, ${entry.status},
        ${entry.signatureValid}, ${entry.razorpayOrderId ?? null},
        ${entry.paymentId ?? null}, ${entry.orderId ?? null},
        ${entry.amount ?? null}, ${entry.message ?? null},
        ${entry.payload === undefined ? null : JSON.stringify(entry.payload)}::jsonb
      )
    `;
  } catch (caught) {
    console.error("Could not record the Razorpay webhook delivery", caught);
  }
}

type WebhookEventRow = {
  id: number | string;
  event_id: string | null;
  event: string;
  status: WebhookEventStatus;
  signature_valid: boolean;
  razorpay_order_id: string | null;
  payment_id: string | null;
  order_id: string | null;
  amount: number | null;
  message: string | null;
  payload: unknown;
  received_at: string | Date;
};

function toEvent(row: WebhookEventRow): WebhookEvent {
  return {
    id: Number(row.id),
    eventId: row.event_id,
    event: row.event,
    status: row.status,
    signatureValid: row.signature_valid,
    razorpayOrderId: row.razorpay_order_id,
    paymentId: row.payment_id,
    orderId: row.order_id,
    amount: row.amount,
    message: row.message,
    payload: row.payload ?? null,
    receivedAt: new Date(row.received_at).toISOString(),
  };
}

/** Reads degrade to an empty list so the panel renders before the first delivery. */
export async function listWebhookEvents(limit = 100): Promise<WebhookEvent[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    await ensureWebhookEventsSchema();
    const sql = getSql();
    const rows = (await sql`
      select * from razorpay_webhook_events
       order by received_at desc, id desc
       limit ${limit}
    `) as WebhookEventRow[];
    return rows.map(toEvent);
  } catch (caught) {
    console.error("Could not list Razorpay webhook deliveries", caught);
    return [];
  }
}
