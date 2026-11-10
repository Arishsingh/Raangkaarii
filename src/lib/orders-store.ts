import "server-only";

import { getSql, isDatabaseConfigured } from "@/lib/db";

/** Where the parcel goes. Needed before a courier shipment can be booked. */
export type StoredAddress = {
  name: string;
  phone: string;
  line1: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
};

export type StoredOrderLine = {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number;
  /**
   * The product's photo at checkout, so the admin panel can show what was
   * bought. Optional: orders placed before this was recorded have none, and
   * the admin page fills those in from the catalogue.
   */
  image?: string;
};

/**
 * The lifecycle, in the order a real sale moves through it:
 *
 * pending   — Row written by /api/checkout *before* the payment window opens.
 *             The shopper has not paid. Most rows that stay here are abandoned
 *             checkouts, not orders waiting on the shop.
 * paid      — Razorpay confirmed the money, either by a verified signature or
 *             by the webhook. This is the first status that means a sale, and
 *             it is what "awaiting approval" actually looks like.
 * active    — The admin approved a paid order. Ready for the courier.
 * shipped   — Delhivery booked; the row carries a waybill.
 * delivered — Delivered to the customer.
 * cancelled — Cancelled by the admin.
 * cod       — Legacy cash-on-delivery order, from before COD was taken off the
 *             checkout counter. Money is collected by the courier, so these
 *             have no payment_id and are settled by a different route.
 * failed    — Razorpay reported the payment failed.
 *
 * `pending` used to be documented as "awaiting admin activation", which read as
 * though an unpaid row were merely waiting on the shop. It is not — approving
 * one books a courier, and counts money nobody paid, against an abandoned
 * checkout. Nothing downstream may treat `pending` as a sale.
 */
export type OrderStatus =
  | "pending"
  | "active"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "paid"
  | "cod"
  | "failed";

/**
 * Whether the money for an order is accounted for.
 *
 * This is deliberately not a status check. `status` is written by the admin
 * panel as well as by the payment routes, and four orders in this database were
 * sitting at `active` with no payment against them — approved by hand from the
 * panel while the shopper had only opened the payment window and walked away.
 * A status can be typed; a payment_id can only be written by markOrderPaid(),
 * which runs after a verified Razorpay signature or a signed webhook.
 *
 * Legacy COD rows are the one exception: the courier collects the money, so
 * they never carry a Razorpay payment id and are settled on delivery instead.
 *
 * In SQL this is `(payment_id is not null or status = 'cod')`, written out at
 * each query rather than shared as a constant — the neon tagged template turns
 * every interpolation into a bind parameter, so a fragment cannot be injected.
 */
export function isPaymentVerified(order: {
  paymentId: string | null;
  status: OrderStatus;
}) {
  return order.paymentId !== null || order.status === "cod";
}

export type StoredOrder = {
  id: string;
  userId: string;
  email: string;
  name: string;
  lines: StoredOrderLine[];
  payment: string;
  paymentId: string | null;
  razorpayOrderId: string | null;
  status: OrderStatus;
  items: number;
  subtotal: number;
  delivery: number;
  payable: number;
  placedAt: string;
  address: StoredAddress | null;
  /** Delhivery waybill, once a shipment has been booked for this order. */
  waybill: string | null;
  /** Razorpay confirmed the money (or it is a legacy COD row). See isPaymentVerified. */
  paymentVerified: boolean;
  /** Razorpay's settlement id, once the money has reached the bank account. */
  settlementId: string | null;
  /** When it landed. Null while the payment is captured but not yet settled. */
  settledAt: string | null;
};

let schemaReady: Promise<void> | null = null;

export function ensureOrdersSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        create table if not exists orders (
          id         text primary key,
          user_id    text not null,
          email      text not null default '',
          name       text not null default '',
          lines      jsonb not null default '[]'::jsonb,
          payment    text not null,
          payment_id text,
          items      integer not null default 0,
          subtotal   integer not null default 0,
          delivery   integer not null default 0,
          payable    integer not null,
          placed_at  timestamptz not null default now()
        )
      `;
      /**
       * Added after the first orders were written, so this has to be additive:
       * an existing table keeps its rows and picks up the new columns. The
       * 'paid' default is what those older rows get, since they were only ever
       * written after a verified payment.
       */
      await sql`
        alter table orders
          add column if not exists status            text not null default 'paid',
          add column if not exists razorpay_order_id text
      `;
      /**
       * Shipping details arrived with the courier integration; older rows have
       * no address, which is why every read has to tolerate null here.
       */
      await sql`
        alter table orders
          add column if not exists address jsonb,
          add column if not exists waybill text
      `;
      /**
       * Where the money is, as Razorpay sees it — separate from whether the
       * payment was captured. Captured means the shopper paid; settled means
       * it has actually reached the shop's bank account, which happens on
       * Razorpay's own cycle a day or more later.
       */
      await sql`
        alter table orders
          add column if not exists settlement_id text,
          add column if not exists settled_at    timestamptz
      `;
      await sql`
        create index if not exists orders_placed_at_idx on orders (placed_at desc)
      `;
      await sql`
        create unique index if not exists orders_razorpay_order_id_idx
          on orders (razorpay_order_id) where razorpay_order_id is not null
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

type NewOrder = Omit<
  StoredOrder,
  | "placedAt"
  | "razorpayOrderId"
  | "address"
  | "waybill"
  | "paymentVerified"
  | "settlementId"
  | "settledAt"
> & {
  razorpayOrderId?: string | null;
  address?: StoredAddress | null;
};

/** Writes throw so checkout can log a failed record without silently losing it. */
export async function saveOrder(order: NewOrder) {
  await ensureOrdersSchema();
  const sql = getSql();
  await sql`
    insert into orders (
      id, user_id, email, name, lines, payment, payment_id, razorpay_order_id,
      status, items, subtotal, delivery, payable, address
    ) values (
      ${order.id}, ${order.userId}, ${order.email}, ${order.name},
      ${JSON.stringify(order.lines)}::jsonb, ${order.payment}, ${order.paymentId},
      ${order.razorpayOrderId ?? null}, ${order.status},
      ${order.items}, ${order.subtotal}, ${order.delivery}, ${order.payable},
      ${order.address ? JSON.stringify(order.address) : null}::jsonb
    )
    on conflict (id) do nothing
  `;
}

/**
 * Flips a pending order to paid. Safe to call twice: the browser handler and
 * the Razorpay webhook both race to do it, and whichever loses matches nothing.
 *
 * Matching on razorpay_order_id rather than our own id is what lets the webhook
 * work — it only ever learns Razorpay's identifiers, never ours.
 */
export async function markOrderPaid(razorpayOrderId: string, paymentId: string) {
  await ensureOrdersSchema();
  const sql = getSql();
  /**
   * Matched on "no payment recorded yet" rather than on status = 'pending'.
   *
   * A row that had been moved off 'pending' by hand could never be reconciled:
   * a late webhook for a real payment matched nothing and the money stayed
   * unrecorded. The payment id is the thing that must not be overwritten, so
   * that — not the status — is what guards the update.
   */
  const rows = (await sql`
    update orders
       set status = 'paid', payment_id = ${paymentId}
     where razorpay_order_id = ${razorpayOrderId}
       and payment_id is null
       and status <> 'cancelled'
    returning id
  `) as { id: string }[];
  return rows[0]?.id ?? null;
}

/**
 * Records a captured payment found by reading Razorpay directly, rather than
 * by being told about it.
 *
 * The webhook is the fast path, but it is only as good as its shared secret —
 * a mismatched one silently rejected 32 deliveries here while a real ₹81
 * payment sat unrecorded. Polling Razorpay for what it actually holds cannot
 * be broken by a secret, so this is the backstop that guarantees a captured
 * payment reaches the panel.
 *
 * Matched on our own order id, which Razorpay carries back in notes.receiptId.
 */
export async function reconcileCapturedPayment(input: {
  orderId: string;
  paymentId: string;
}) {
  await ensureOrdersSchema();
  const sql = getSql();
  const rows = (await sql`
    update orders
       set payment_id = ${input.paymentId},
           status = case when status = 'pending' then 'paid' else status end
     where id = ${input.orderId}
       and payment_id is null
       and status <> 'cancelled'
    returning id
  `) as { id: string }[];
  return rows[0]?.id ?? null;
}

/**
 * Marks money as having reached the bank account.
 *
 * Settlement is Razorpay's own cycle and has nothing to do with capture: the
 * shopper's money is captured immediately, and lands in the shop's account a
 * day or more later. The panel shows the difference, because "paid" and "in
 * your account" are not the same thing to whoever is packing the parcel.
 */
export async function markSettled(input: {
  paymentId: string;
  settlementId: string;
  settledAt: string;
}) {
  await ensureOrdersSchema();
  const sql = getSql();
  const rows = (await sql`
    update orders
       set settlement_id = ${input.settlementId},
           settled_at    = ${input.settledAt}
     where payment_id = ${input.paymentId}
       and settlement_id is null
    returning id
  `) as { id: string }[];
  return rows[0]?.id ?? null;
}

export async function markOrderFailed(razorpayOrderId: string) {
  await ensureOrdersSchema();
  const sql = getSql();
  await sql`
    update orders set status = 'failed'
     where razorpay_order_id = ${razorpayOrderId} and status = 'pending'
  `;
}

export type RevenueStats = {
  total: number;
  thisMonth: number;
  last30: number;
  orderCount: number;
  averageOrder: number;
  paidShare: number;
  /** Paid, and waiting for the admin to approve it. */
  awaitingApprovalCount: number;
  /** Checkouts opened and never paid for. Not sales; shown only as a count. */
  unpaidCount: number;
  shippedCount: number;
  failedCount: number;
  daily: { date: string; total: number; orders: number }[];
  recent: StoredOrder[];
  error: string | null;
};

const EMPTY: RevenueStats = {
  total: 0,
  thisMonth: 0,
  last30: 0,
  orderCount: 0,
  averageOrder: 0,
  paidShare: 0,
  awaitingApprovalCount: 0,
  unpaidCount: 0,
  shippedCount: 0,
  failedCount: 0,
  daily: [],
  recent: [],
  error: null,
};

type OrderRow = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  lines: StoredOrderLine[];
  payment: string;
  payment_id: string | null;
  razorpay_order_id: string | null;
  status: OrderStatus;
  items: number;
  subtotal: number;
  delivery: number;
  payable: number;
  placed_at: string | Date;
  address: StoredAddress | null;
  waybill: string | null;
  settlement_id: string | null;
  settled_at: string | Date | null;
};

function toOrder(row: OrderRow): StoredOrder {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    lines: row.lines ?? [],
    payment: row.payment,
    paymentId: row.payment_id,
    razorpayOrderId: row.razorpay_order_id,
    status: row.status,
    items: row.items,
    subtotal: row.subtotal,
    delivery: row.delivery,
    payable: row.payable,
    placedAt: new Date(row.placed_at).toISOString(),
    address: row.address ?? null,
    waybill: row.waybill ?? null,
    paymentVerified: row.payment_id !== null || row.status === "cod",
    settlementId: row.settlement_id ?? null,
    settledAt: row.settled_at ? new Date(row.settled_at).toISOString() : null,
  };
}

/** Reads degrade to zeroes so the panel renders before the first sale. */
export async function getRevenueStats(days = 14): Promise<RevenueStats> {
  if (!isDatabaseConfigured()) {
    return { ...EMPTY, error: "DATABASE_URL is not set." };
  }

  try {
    await ensureOrdersSchema();
    const sql = getSql();

    /**
     * Revenue counts money that actually arrived.
     *
     * The filter was `status in ('paid','cod','active',…)`, which trusted the
     * status alone — so an unpaid row an admin had activated by hand was booked
     * as revenue. It now also requires a payment id, so approving something can
     * never move the takings: only Razorpay can.
     *
     * `cancelled` is left out of the totals even when it was paid, since the
     * money goes back; it stays visible in the list so a refund can be traced.
     */
    const [totals] = (await sql`
      select
        coalesce(sum(payable) filter (
          where (payment_id is not null or status = 'cod')
            and status in ('paid','cod','active','shipped','delivered')), 0)::int as total,
        count(*) filter (
          where (payment_id is not null or status = 'cod')
            and status in ('paid','cod','active','shipped','delivered'))::int      as order_count,
        count(*) filter (
          where (payment_id is not null or status = 'cod')
            and status in ('paid','cod'))::int                                     as awaiting_approval_count,
        count(*) filter (where status = 'pending' and payment_id is null)::int     as unpaid_count,
        coalesce(sum(payable) filter (
          where (payment_id is not null or status = 'cod')
            and status in ('paid','cod','active','shipped','delivered')
            and placed_at >= date_trunc('month', now())), 0)::int                  as this_month,
        coalesce(sum(payable) filter (
          where (payment_id is not null or status = 'cod')
            and status in ('paid','cod','active','shipped','delivered')
            and placed_at >= now() - interval '30 days'), 0)::int                  as last30,
        count(*) filter (
          where payment_id is not null
            and status in ('paid','active','shipped','delivered'))::int            as paid_count,
        count(*) filter (where status = 'shipped')::int                            as shipped_count,
        count(*) filter (where status = 'failed')::int                             as failed_count
      from orders
    `) as {
      total: number;
      order_count: number;
      awaiting_approval_count: number;
      unpaid_count: number;
      this_month: number;
      last30: number;
      paid_count: number;
      shipped_count: number;
      failed_count: number;
    }[];

    /**
     * generate_series fills the gaps, so a quiet day shows as zero rather than
     * vanishing and making the trend look denser than it is.
     */
    const daily = (await sql`
      select
        to_char(day, 'YYYY-MM-DD')                as date,
        coalesce(sum(o.payable), 0)::int          as total,
        count(o.id)::int                          as orders
      from generate_series(
        date_trunc('day', now()) - make_interval(days => ${days - 1}),
        date_trunc('day', now()),
        interval '1 day'
      ) as day
      left join orders o
        on date_trunc('day', o.placed_at) = day
       and (o.payment_id is not null or o.status = 'cod')
       and o.status in ('paid','cod','active','shipped','delivered')
      group by day
      order by day
    `) as { date: string; total: number; orders: number }[];

    /**
     * Only orders that were actually paid for. This used to be "anything but
     * failed", which put every abandoned checkout on the admin landing page
     * looking exactly like a sale waiting to be approved.
     */
    const recent = (await sql`
      select * from orders
       where (payment_id is not null or status = 'cod')
         and status not in ('failed')
       order by placed_at desc limit 12
    `) as OrderRow[];

    const orderCount = totals?.order_count ?? 0;
    return {
      total: totals?.total ?? 0,
      thisMonth: totals?.this_month ?? 0,
      last30: totals?.last30 ?? 0,
      orderCount,
      averageOrder: orderCount ? Math.round((totals?.total ?? 0) / orderCount) : 0,
      paidShare: orderCount
        ? Math.round(((totals?.paid_count ?? 0) / orderCount) * 100)
        : 0,
      awaitingApprovalCount: totals?.awaiting_approval_count ?? 0,
      unpaidCount: totals?.unpaid_count ?? 0,
      shippedCount: totals?.shipped_count ?? 0,
      failedCount: totals?.failed_count ?? 0,
      daily,
      recent: recent.map(toOrder),
      error: null,
    };
  } catch (caught) {
    console.error("Could not load revenue", caught);
    return { ...EMPTY, error: "Could not read orders from the database." };
  }
}

/**
 * Fetches orders for the admin orders view, newest first.
 *
 * Only payment-verified orders reach the fulfilment panel. An unpaid checkout
 * is not an order to work on, and showing one next to a real sale is how four
 * of them came to be approved by hand. The Razorpay page below is where every
 * attempt — including the abandoned ones — is still visible.
 *
 * Bounded: the page filters and searches in the browser, so an unbounded read
 * would ship every order ever placed to the client on each visit and grow
 * without limit. Raise the ceiling here if the panel ever needs paging.
 */
const ADMIN_ORDER_LIMIT = 500;

export async function listAllOrders(): Promise<StoredOrder[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    await ensureOrdersSchema();
    const sql = getSql();
    const rows = (await sql`
      select * from orders
       where (payment_id is not null or status = 'cod')
       order by placed_at desc
       limit ${ADMIN_ORDER_LIMIT}
    `) as OrderRow[];
    return rows.map(toOrder);
  } catch (caught) {
    console.error("Could not list orders", caught);
    return [];
  }
}

/** Fetches Razorpay specific transaction orders for the admin Razorpay dashboard. */
export async function listRazorpayTransactions(): Promise<StoredOrder[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    await ensureOrdersSchema();
    const sql = getSql();
    const rows = (await sql`
      select * from orders
       where razorpay_order_id is not null or payment = 'Razorpay'
       order by placed_at desc
       limit ${ADMIN_ORDER_LIMIT}
    `) as OrderRow[];
    return rows.map(toOrder);
  } catch (caught) {
    console.error("Could not list Razorpay transactions", caught);
    return [];
  }
}

/**
 * Statuses that assert the shop is working on a sale. None of them may be
 * reached by an order nobody paid for — `active` counts as revenue and opens
 * the courier button, and `shipped`/`delivered` claim a parcel exists.
 */
const NEEDS_SETTLED_PAYMENT: readonly OrderStatus[] = [
  "active",
  "shipped",
  "delivered",
];

export type StatusChange = { ok: true } | { ok: false; reason: string };

/**
 * Moves an order along its lifecycle: paid → active → shipped → delivered.
 *
 * The payment check is part of the UPDATE rather than a read before it, so it
 * cannot be raced or skipped — and it lives here rather than in the panel
 * because a Server Action is reachable by direct POST. The admin panel used to
 * be the only thing standing between an abandoned checkout and an approved
 * order, which is how four unpaid rows ended up counted as revenue.
 *
 * Cancelling is always allowed: an order that should not have been placed has
 * to be closable whatever state it is in.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<StatusChange> {
  await ensureOrdersSchema();
  const sql = getSql();

  if (!NEEDS_SETTLED_PAYMENT.includes(status)) {
    await sql`update orders set status = ${status} where id = ${orderId}`;
    return { ok: true };
  }

  /**
   * Approval additionally waits for settlement: the money has to have reached
   * the bank account, not merely been captured by Razorpay. COD is exempt —
   * the courier collects it, so there is nothing to settle.
   */
  const rows = (await sql`
    update orders
       set status = ${status}
     where id = ${orderId}
       and (payment_id is not null or status = 'cod')
       and (settled_at is not null or status = 'cod')
    returning id
  `) as { id: string }[];

  if (rows[0]) return { ok: true };

  // Nothing matched: say which of the reasons it was.
  const [row] = (await sql`
    select status, payment_id, settled_at
      from orders where id = ${orderId} limit 1
  `) as {
    status: OrderStatus;
    payment_id: string | null;
    settled_at: string | null;
  }[];

  if (!row) return { ok: false, reason: "No such order." };

  if (row.payment_id === null && row.status !== "cod") {
    return {
      ok: false,
      reason:
        "This order has no confirmed payment, so it cannot be approved or shipped. " +
        "Razorpay has not verified it — check the Razorpay page before doing anything with it.",
    };
  }

  return {
    ok: false,
    reason:
      "The money for this order has not reached your bank account yet. Razorpay " +
      "has captured it and settles on its own cycle, usually a day or two — this " +
      "opens on its own once the settlement lands.",
  };
}

/**
 * Records the courier waybill once a shipment has been booked and marks the
 * order shipped. Called only after /api/admin/shipments has checked that the
 * order is paid for and approved, so it does no checking of its own.
 */
export async function setOrderWaybill(orderId: string, waybill: string) {
  await ensureOrdersSchema();
  const sql = getSql();
  await sql`update orders set waybill = ${waybill}, status = 'shipped' where id = ${orderId}`;
}

export async function getOrder(orderId: string): Promise<StoredOrder | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    await ensureOrdersSchema();
    const sql = getSql();
    const rows = (await sql`
      select * from orders where id = ${orderId} limit 1
    `) as OrderRow[];
    return rows[0] ? toOrder(rows[0]) : null;
  } catch (caught) {
    console.error("Could not load the order", caught);
    return null;
  }
}
