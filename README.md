# Rangkaarii

An online store for hand-embroidered Indian clothing — storefront, customer dashboard, and an admin panel for running the catalogue, all in one Next.js app.

Built on the App Router with Auth.js (NextAuth v5) for accounts, Neon Postgres for orders, catalogue and users, the database for product media, Razorpay for payments, and Delhivery for shipping.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, Radix UI / shadcn, Motion |
| Auth | Auth.js / NextAuth v5 — email + password, and Google |
| Database | Neon Postgres (`@neondatabase/serverless`) |
| Media | Postgres (`media` table), served through `/api/media/[id]` |
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

## Accounts

Auth.js (NextAuth v5) handles sign-in, sessions and sign-out; the app adds one
endpoint around it, `POST /api/register`, because the credentials provider only
ever checks an existing password — it has no sign-up flow of its own.

Two ways in, both landing on `/dashboard`:

- **Email and password.** The password is hashed with bcrypt at cost 12 and
  stored in `users.password`. Nothing anywhere holds a plaintext copy, and a
  failed sign-in says only "Invalid email or password" — the check spends the
  same time on an unknown address as on a wrong password, so it cannot be used
  to find out who has an account.
- **Continue with Google.** Auth.js creates the user on first sign-in and finds
  them on every one after.

Sessions are JWTs in an httpOnly cookie — the strategy is not a preference but a
requirement, since Auth.js cannot issue a database session for a password
sign-in. `users`, `accounts` and `sessions` are still written by the Neon
adapter, so the admin panel can list who has signed up and with what.

### Where the session comes from

```tsx
import { auth } from "@/auth";        // server components, routes, actions
const session = await auth();

import { useSession } from "next-auth/react";   // client components
const { data: session, status } = useSession();
```

Nothing decodes the token by hand, and no authentication state is kept in
`localStorage`.

### Protecting a route

`src/proxy.ts` redirects a signed-out visitor from `/dashboard`, `/admin`,
`/profile` and `/settings` to `/login?callbackUrl=…`, and the sign-in sends them
back where they were headed. It is the outer gate only — every page, route
handler and Server Action checks `auth()` itself, because a proxy check cannot
be the last word on who may read an order. Add a prefix to `PROTECTED` in
`src/proxy.ts` to cover a new area.

### Same email, two ways in

Signing in with Google against an address that already has a password account
does **not** create a second user: Auth.js refuses and returns
`?error=OAuthAccountNotLinked`, which `/login` renders as a message asking for
the password instead. Automatic linking is off deliberately — with it, anyone
who could get Google to assert an address could sign in as the password account
holding it. To turn it on anyway, set `allowDangerousEmailAccountLinking: true`
on the Google provider in `src/auth.config.ts`.

### Setting up Google OAuth

The Google button only appears once both variables are set. In **Google Cloud
Console → APIs & Services → Credentials → Create credentials → OAuth client ID
→ Web application**, add every environment's callback as an authorised redirect
URI:

```
http://localhost:3000/api/auth/callback/google       development
https://<your-domain>/api/auth/callback/google       production
https://<preview-url>/api/auth/callback/google       previews, if you use them
```

Then copy the client ID and secret into `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`. The path is fixed by Auth.js; no localhost URL is
written into the app itself.

## What is public

The storefront is a window, not a shop. A signed-out visitor sees the range, the photography, and the collections — and nothing else:

- **No prices.** Every price, was-price, and discount chip reads "Sign in to view price".
- **No product pages.** A card leads to `/login`; the detail page, cart, and checkout all live behind auth.
- **No stale session.** A signed-in customer hitting `/` or `/collections/*` is redirected to `/dashboard`, so those pages only ever render in their signed-out form.

The gating is in `product-rail.tsx` (home) and `collection-view.tsx` (collections). If you want prices public again, those two components are the whole change.

## Environment

Every value lives in `.env.local`, which is gitignored. The app degrades rather than crashes when a key is missing — an unconfigured feature reports itself instead of taking the page down.

| Variable | Used for | Where to get it |
|---|---|---|
| `AUTH_SECRET` | Signs and encrypts the session cookie | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Continue with Google | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Continue with Google | Shown once, at client creation |
| `DATABASE_URL` | Orders + catalogue | Neon → Connection string (pooled) |
| `RAZORPAY_KEY_ID` | Payments | Razorpay → Account & Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Payment verification | Shown **once** at key generation |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification | Razorpay → Settings → Webhooks |
| `DELHIVERY_API_KEY` | Booking and tracking parcels | Delhivery → API token |
| `DELHIVERY_PICKUP_NAME` | Which warehouse a parcel leaves from | Must match a pickup location registered on the account, exactly |
| `GEMINI_API_KEY` | Shopping assistant | Google AI Studio |
| `ADMIN_EMAILS` | Admin allowlist (optional) | Comma-separated; falls back to the built-in list in `src/lib/admin.ts` |

`.env.example` carries the full list with placeholders. Both Google variables are optional: with neither set, the sign-in and sign-up pages hide the Google button and the shop runs on email and password alone.

`AUTH_URL` is not needed — Auth.js reads the request host, so the same build works on localhost, on a preview URL, and in production.

## Routes

### Public

| Path | Purpose |
|---|---|
| `/` | Landing page, product rail, craft sections |
| `/collections/[slug]` | A single collection, filtered and sortable |
| `/login` | Sign in — email + password, or Google |
| `/signup` | Create an account |
| `/sign-in`, `/sign-up` | Permanent redirects to the two above, for old links |

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
| `/api/auth/*` | Every Auth.js endpoint — sign in, callback, session, sign out |
| `POST /api/register` | Sign-up: validates, hashes with bcrypt, writes the user |
| `POST /api/checkout` | Prices the cart, creates a Razorpay order + pending order row |
| `POST /api/checkout/verify` | Verifies the browser's payment signature |
| `POST /api/orders` | Marks an order paid, or records a COD order |
| `POST /api/razorpay/webhook` | Razorpay's server-to-server payment result |
| `POST /api/admin/upload` | Stores a product photo or clip in the database |
| `GET /api/media/[id]` | Serves one stored file, cached immutably |
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

**Admin uploads** are posted to `POST /api/admin/upload`, which checks the admin session, checks the type and size against `src/lib/media-limits.ts`, and stores the bytes in the `media` table. The browser gets back a `/api/media/<id>` URL.

These used to go to Vercel Blob. A Blob store is suspended once the account passes its free allowance, and a suspended store answers **403 to every file** — the whole catalogue turned to grey tiles at once, with nothing the app could do. The database is storage the shop already has, so the media cannot be switched off separately from the products it belongs to.

`/api/media/[id]` is public and cached immutably (`max-age=31536000`), and ids are random and never reused, so a file is read out of Postgres roughly once and served from the CDN after that. Uploads are capped at **8 MB an image and 25 MB a clip** — the whole Neon free plan is 0.5 GB, shared with orders and the catalogue.

> **Note:** `/api/admin/upload` is deliberately excluded from the proxy matcher. When a proxy runs, Next buffers the request body to allow a second read and **silently truncates** anything past `experimental.proxyClientMaxBodySize` — a 21 MB clip arrived as a corrupt 10 MB one with no error. The route checks the admin session itself.

Every card degrades on its own when media cannot be fetched: a failed still falls back to a neutral tile, and a clip whose poster cannot load stops trusting it, loads the video far enough to report, and lands on the same tile. A store that cannot serve its files therefore looks empty rather than broken.

## Data

Tables are created on first use — there is no migration step to run. Schema changes are additive (`add column if not exists`), so an existing deployment keeps its rows.

| Table | Holds |
|---|---|
| `orders` | Placed orders, their lines, totals, address, waybill, and payment status |
| `admin_products` | Everything added through the admin panel |
| `media` | Product photos and clips, as bytes — served by `/api/media/[id]` |
| `hidden_builtins` | Built-in pieces the admin has retired — they live in code, so removal is recorded rather than deleted |
| `users` | Accounts: name, email, image, `emailVerified`, bcrypt `password` (null for a Google-only account), `created_at`, `updated_at` |
| `accounts` | Linked OAuth providers, one row per provider account — written by the Auth.js adapter |
| `sessions`, `verification_token` | Created for the adapter's sake; unused while sessions are JWTs |

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
│  ├─ login|signup   Auth.js sign-in and sign-up pages
│  └─ api/auth/[...nextauth]
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
├─ auth.ts           Auth.js instance: providers, adapter, password check
├─ auth.config.ts    The DB-free half, shared with the proxy
└─ proxy.ts          Route protection
```


Deploys to Vercel. Add every variable above to the project's environment (`vercel env add`), then:

```bash
vercel --prod
```

Razorpay test and live keys are separate — a `rzp_test_` key silently fails against live payments. Swap the keys and repoint the webhook URL when you go live.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Every uploaded photo is a placeholder tile | Media is served from `/api/media/[id]` now. Check `DATABASE_URL` is set and the `media` table has rows. Products added before the move still point at dead `*.blob.vercel-storage.com` URLs — re-upload their photos in the admin panel. |
| Payment succeeds but the order stays `pending` | The webhook never arrived. It cannot reach localhost; check the URL and `RAZORPAY_WEBHOOK_SECRET` on a deployed URL. |
| "Booking a parcel" fails with a 503 | `DELHIVERY_API_KEY` or `DELHIVERY_PICKUP_NAME` is unset, or the pickup name does not match one registered on the Delhivery account. |
| Admin pages 404 for the right person | The email on their account is not in `ADMIN_EMAILS` (nor in the fallback list in `src/lib/admin.ts`). |
| Google sign-in returns `?error=OAuthAccountNotLinked` | That email already has a password account. Sign in with the password — see **Accounts** below. |
| Google sign-in returns `redirect_uri_mismatch` | The callback URL for this environment is not on the OAuth client. Add `https://<host>/api/auth/callback/google`. |
