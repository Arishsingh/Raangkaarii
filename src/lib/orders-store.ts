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
};

/**
 * pending   — Awaiting admin activation / approval (Default for new orders).
 * active    — Admin approved / activated and processing.
 * shipped   — Courier shipment booked or marked shipped.
 * delivered — Delivered to customer.
 * cancelled — Cancelled by admin.
 * paid      — Payment confirmed online via Razorpay.
 * cod       — Cash on delivery order.
 * failed    — Payment failed.
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
  "placedAt" | "razorpayOrderId" | "address" | "waybill"
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
  const rows = (await sql`
    update orders
       set status = 'paid', payment_id = ${paymentId}
     where razorpay_order_id = ${razorpayOrderId}
       and status = 'pending'
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
  pendingCount: number;
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
  pendingCount: 0,
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
     * Revenue counts placed orders only. An abandoned Razorpay window leaves a
     * 'pending' row behind, and counting those would report money that was
     * never charged.
     */
    const [totals] = (await sql`
      select
        coalesce(sum(payable) filter (where status in ('paid','cod','active','shipped','delivered')), 0)::int as total,
        count(*) filter (where status in ('paid','cod','active','shipped','delivered'))::int                  as order_count,
        count(*) filter (where status = 'pending')::int                        as pending_count,
        coalesce(sum(payable) filter (
          where status in ('paid','cod','active','shipped','delivered')
            and placed_at >= date_trunc('month', now())), 0)::int              as this_month,
        coalesce(sum(payable) filter (
          where status in ('paid','cod','active','shipped','delivered')
            and placed_at >= now() - interval '30 days'), 0)::int              as last30,
        count(*) filter (where status in ('paid','active','shipped','delivered'))::int                        as paid_count
      from orders
    `) as {
      total: number;
      order_count: number;
      pending_count: number;
      this_month: number;
      last30: number;
      paid_count: number;
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
       and o.status in ('paid','cod','active','shipped','delivered')
      group by day
      order by day
    `) as { date: string; total: number; orders: number }[];

    const recent = (await sql`
      select * from orders
       where status not in ('failed')
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
      pendingCount: totals?.pending_count ?? 0,
      daily,
      recent: recent.map(toOrder),
      error: null,
    };
  } catch (caught) {
    console.error("Could not load revenue", caught);
    return { ...EMPTY, error: "Could not read orders from the database." };
  }
}

/** Fetches all orders for the admin orders view. */
export async function listAllOrders(): Promise<StoredOrder[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    await ensureOrdersSchema();
    const sql = getSql();
    const rows = (await sql`
      select * from orders order by placed_at desc
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
    `) as OrderRow[];
    return rows.map(toOrder);
  } catch (caught) {
    console.error("Could not list Razorpay transactions", caught);
    return [];
  }
}

/** Admin action to update order lifecycle status (e.g. pending -> active -> shipped -> delivered). */
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await ensureOrdersSchema();
  const sql = getSql();
  await sql`
    update orders set status = ${status} where id = ${orderId}
  `;
}

/** Records the courier waybill once a shipment has been booked and marks as shipped. */
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
