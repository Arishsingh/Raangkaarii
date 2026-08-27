# Rangkaarii

An online store for hand-embroidered Indian clothing — storefront, customer dashboard, and an admin panel for running the catalogue, all in one Next.js app.

Built on the App Router with Clerk for accounts, Neon Postgres for orders and catalogue, Vercel Blob for product media, and Razorpay for payments.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, Radix UI / shadcn, Motion |
| Auth | Clerk |
| Database | Neon Postgres (`@neondatabase/serverless`) |
| Media | Vercel Blob |
| Payments | Razorpay |
| Assistant | Gemini 2.5 Flash |

## Getting started

```bash
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000). Create a `.env.local` with the values below before starting — the dev server reads it only at launch.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |

## Environment

Every value lives in `.env.local`, which is gitignored. The app degrades rather than crashes when a key is missing — an unconfigured feature reports itself instead of taking the page down.

| Variable | Used for | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth (browser) | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Auth (server) | Clerk Dashboard → API Keys |
| `DATABASE_URL` | Orders + catalogue | Neon → Connection string (pooled) |
| `BLOB_READ_WRITE_TOKEN` | Product image/video upload | Vercel → Storage → Blob |
| `RAZORPAY_KEY_ID` | Payments | Razorpay → Account & Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Payment verification | Shown **once** at key generation |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification | Razorpay → Settings → Webhooks |
| `GEMINI_API_KEY` | Shopping assistant | Google AI Studio |
| `ADMIN_EMAILS` | Admin allowlist (optional) | Comma-separated; falls back to the built-in list |

## Routes

### Public

| Path | Purpose |
|---|---|
| `/` | Landing page and shop |
| `/collections/[slug]` | A single collection |
| `/sign-in`, `/sign-up` | Accounts |

### Signed in

| Path | Purpose |
|---|---|
| `/dashboard` | The shop, filtered and searchable |
| `/dashboard/product/[id]` | Product detail |
| `/dashboard/cart` | Cart |
| `/dashboard/checkout` | Address → summary → payment |
| `/dashboard/orders`, `/dashboard/orders/[id]` | Order history and tracking |

### Admin

Gated on email — see `src/lib/admin.ts`. Every admin page and server action calls `getAdminUser()`; the UI is never trusted on its own.

| Path | Purpose |
|---|---|
| `/admin` | Overview |
| `/admin/products` | Add, edit, and remove products |
| `/admin/revenue` | Sales, trend, recent orders |
| `/admin/users` | Registered accounts |

### API

| Route | Purpose |
|---|---|
| `POST /api/checkout` | Prices the cart, creates a Razorpay order + pending order row |
| `POST /api/checkout/verify` | Verifies the browser's payment signature |
| `POST /api/orders` | Marks an order paid, or records a COD order |
| `POST /api/razorpay/webhook` | Razorpay's server-to-server payment result |
| `POST /api/admin/upload` | Signed Vercel Blob upload for product media |
| `POST /api/chat` | Shopping assistant |

## How payments work

Money is never read from the browser. `src/lib/pricing.ts` is the single place a cart is priced, and both the amount charged and the amount recorded are built from it.

```
1. POST /api/checkout   → price the cart from the catalogue
                        → create the Razorpay order
                        → write the order row as `pending`
2. Razorpay Checkout    → shopper pays
3. Two independent paths mark the row `paid`:
     browser handler → POST /api/orders            (fast)
     Razorpay        → POST /api/razorpay/webhook  (reliable)
```

Both paths are idempotent — whichever arrives second matches nothing. The webhook is what covers a shopper who pays and then closes the tab; without it, money is captured against an order nobody recorded.

Order status is one of `pending`, `paid`, `cod`, or `failed`. Revenue counts only `paid` and `cod`, so an abandoned payment window cannot inflate the figures.

### Configuring the webhook

Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**

- URL — `https://<your-domain>/api/razorpay/webhook`
- Events — `payment.captured`, `payment.failed`
- Secret — set one, and copy it into `RAZORPAY_WEBHOOK_SECRET`

Localhost cannot receive webhooks; point it at a preview deployment while testing.

## Data

Tables are created on first use — there is no migration step to run.

| Table | Holds |
|---|---|
| `orders` | Placed orders, their lines, totals, and payment status |
| `admin_products` | Everything added through the admin panel |

The catalogue a shopper sees is the admin table plus a built-in range in `src/lib/products.ts`. `getShopProduct()` in `src/lib/catalog.ts` resolves either, and is the only lookup checkout uses — so an admin-added product is buyable the moment it is saved.

## Project layout

```
src/
├─ app/
│  ├─ admin/         Admin panel (email-gated)
│  ├─ api/           Route handlers
│  ├─ collections/   Public collection pages
│  ├─ dashboard/     Signed-in shop, cart, checkout, orders
│  └─ sign-in|sign-up
├─ components/       UI, including the admin and checkout flows
├─ lib/
│  ├─ admin.ts         Who counts as an admin
│  ├─ catalog.ts       Built-in range + admin additions, merged
│  ├─ db.ts            Lazy Neon client
│  ├─ pricing.ts       The only place a cart is priced
│  ├─ razorpay.ts      Payment + webhook signature verification
│  └─ orders-store.ts  Order persistence and revenue queries
└─ proxy.ts          Clerk middleware
```

## Deployment

Deploys to Vercel. Add every variable above to the project's environment (`vercel env add`), then:

```bash
vercel --prod
```

Razorpay test and live keys are separate — a `rzp_test_` key silently fails against live payments. Swap the keys and repoint the webhook URL when you go live.
