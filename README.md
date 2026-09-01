# Rangkaarii

An online store for hand-embroidered Indian clothing — storefront, customer dashboard, and an admin panel for running the catalogue, all in one Next.js app.

Built on the App Router with Clerk for accounts, Neon Postgres for orders and catalogue, Vercel Blob for product media, Razorpay for payments, and Delhivery for shipping.

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
| Shipping | Delhivery Express Parcel |
| Assistant | Gemini 2.5 Flash |

## Getting started

```bash
pnpm install
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000). Create a `.env.local` with the values below before starting — the dev server reads it only at launch, so a key added mid-session needs a restart.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `./scripts/import-product-images.sh <folder>` | Import shop photography into `public/products` |

## What is public

The storefront is a window, not a shop. A signed-out visitor sees the range, the photography, and the collections — and nothing else:

- **No prices.** Every price, was-price, and discount chip reads "Sign in to view price".
- **No product pages.** A card leads to `/sign-in`; the detail page, cart, and checkout all live behind auth.
- **No stale session.** A signed-in customer hitting `/` or `/collections/*` is redirected to `/dashboard`, so those pages only ever render in their signed-out form.

The gating is in `product-rail.tsx` (home) and `collection-view.tsx` (collections). If you want prices public again, those two components are the whole change.

## Environment

Every value lives in `.env.local`, which is gitignored. The app degrades rather than crashes when a key is missing — an unconfigured feature reports itself instead of taking the page down.

| Variable | Used for | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth (browser) | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Auth (server), registration | Clerk Dashboard → API Keys |
| `DATABASE_URL` | Orders + catalogue | Neon → Connection string (pooled) |
| `BLOB_READ_WRITE_TOKEN` | Product image/video upload | Vercel → Storage → Blob |
| `RAZORPAY_KEY_ID` | Payments | Razorpay → Account & Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Payment verification | Shown **once** at key generation |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification | Razorpay → Settings → Webhooks |
| `DELHIVERY_API_KEY` | Booking and tracking parcels | Delhivery → API token |
| `DELHIVERY_PICKUP_NAME` | Which warehouse a parcel leaves from | Must match a pickup location registered on the account, exactly |
| `GEMINI_API_KEY` | Shopping assistant | Google AI Studio |
| `ADMIN_EMAILS` | Admin allowlist (optional) | Comma-separated; falls back to the built-in list in `src/lib/admin.ts` |

Clerk's redirect variables (`NEXT_PUBLIC_CLERK_SIGN_IN_URL` and the two `*_FALLBACK_REDIRECT_URL`s) are also read from the environment; `vercel env pull` brings down a working set.

## Routes

### Public

| Path | Purpose |
|---|---|
| `/` | Landing page, product rail, craft sections |
| `/collections/[slug]` | A single collection, filtered and sortable |
| `/sign-in`, `/sign-up` | Accounts |
| `/sso-callback` | Clerk OAuth handoff |

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
| `/admin` | Overview — the day's takings first |
| `/admin/products` | Add, edit, and remove products |
| `/admin/orders` | Fulfilment, and booking a Delhivery parcel |
| `/admin/revenue` | Sales, trend, recent orders |
| `/admin/razorpay` | Payments as Razorpay sees them |
| `/admin/users` | Registered accounts |

### API

| Route | Purpose |
|---|---|
| `POST /api/register` | Server-side Clerk sign-up |
| `POST /api/checkout` | Prices the cart, creates a Razorpay order + pending order row |
| `POST /api/checkout/verify` | Verifies the browser's payment signature |
| `POST /api/orders` | Marks an order paid, or records a COD order |
| `POST /api/razorpay/webhook` | Razorpay's server-to-server payment result |
| `POST /api/admin/upload` | Signed Vercel Blob upload for product media |
| `POST /api/admin/shipments` | Books a Delhivery parcel, records its waybill |
| `GET /api/delhivery/serviceability` | Whether a pincode can be delivered to |
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

## Product media

Media reaches a card from two places.

**The house photography** lives in `public/products` as `01.webp … 17.webp` and backs the home rail, the craft cards, the reel posters, and every collection grid. To replace the range, drop the new shots in a folder and run:

```bash
./scripts/import-product-images.sh ~/path/to/shots
```

Files are taken in filename order and written out as numbered WebP at 1200px wide, so the paths the components reference never change. `cwebp` is required (`brew install webp`).

**Admin uploads** go straight from the browser to Vercel Blob through a signed token minted by `POST /api/admin/upload`, so a large clip never passes through a serverless function. The token is minted per kind — image or video — so a photo cannot be used to push a video-sized file.

Every card degrades on its own when media cannot be fetched: a failed still falls back to a neutral tile, and a clip whose poster cannot load stops trusting it, loads the video far enough to report, and lands on the same tile. A blocked blob store therefore looks empty rather than broken.

## Data

Tables are created on first use — there is no migration step to run. Schema changes are additive (`add column if not exists`), so an existing deployment keeps its rows.

| Table | Holds |
|---|---|
| `orders` | Placed orders, their lines, totals, address, waybill, and payment status |
| `admin_products` | Everything added through the admin panel |
| `hidden_builtins` | Built-in pieces the admin has retired — they live in code, so removal is recorded rather than deleted |

The catalogue a shopper sees is the admin table plus a built-in range in `src/lib/products.ts`. `getShopProduct()` in `src/lib/catalog.ts` resolves either, and is the only lookup checkout uses — so an admin-added product is buyable the moment it is saved.

## Project layout

```
public/products/     House photography, 01.webp … 17.webp
scripts/             Media import
src/
├─ app/
│  ├─ admin/         Admin panel (email-gated)
│  ├─ api/           Route handlers
│  ├─ collections/   Public collection pages
│  ├─ dashboard/     Signed-in shop, cart, checkout, orders
│  └─ sign-in|sign-up
├─ components/       UI, including the admin and checkout flows
│  ├─ product-media.tsx   Picks clip or still for a card
│  ├─ product-image.tsx   Still, with the fallback tile
│  └─ banner-video.tsx    Hover preview, sound, poster recovery
├─ lib/
│  ├─ admin.ts         Who counts as an admin
│  ├─ catalog.ts       Built-in range + admin additions, merged
│  ├─ db.ts            Lazy Neon client
│  ├─ pricing.ts       The only place a cart is priced
│  ├─ razorpay.ts      Payment + webhook signature verification
│  ├─ delhivery.ts     Serviceability, booking, tracking
│  └─ orders-store.ts  Order persistence and revenue queries
└─ proxy.ts          Clerk middleware
```


Deploys to Vercel. Add every variable above to the project's environment (`vercel env add`), then:

```bash
vercel --prod
```

Razorpay test and live keys are separate — a `rzp_test_` key silently fails against live payments. Swap the keys and repoint the webhook URL when you go live.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Every uploaded photo is a placeholder tile; the blob URL returns `403 Your store is blocked` | Account-level state on the Vercel Blob store, usually billing or a spend cap. Nothing in the app can route around it — clear it in Vercel → Storage. |
| Payment succeeds but the order stays `pending` | The webhook never arrived. It cannot reach localhost; check the URL and `RAZORPAY_WEBHOOK_SECRET` on a deployed URL. |
| "Booking a parcel" fails with a 503 | `DELHIVERY_API_KEY` or `DELHIVERY_PICKUP_NAME` is unset, or the pickup name does not match one registered on the Delhivery account. |
| Admin pages 404 for the right person | Their Clerk email is not in `ADMIN_EMAILS`, or is on the account but not verified. |
