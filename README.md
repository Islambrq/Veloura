# Fernweh — Storefront

A production-quality e-commerce storefront: React + TypeScript + Vite + Tailwind CSS
on the frontend, Supabase (PostgreSQL, Auth, Storage) on the backend.

**Scope of this build (v1):** browsing/search/filtering, authentication, a
persistent cart (server-side for signed-in users, localStorage for guests,
merged automatically on login), and checkout that creates real orders in
Postgres with atomic stock decrementing. An admin dashboard and a real
payment gateway (Stripe, etc.) are intentionally out of scope for v1 — see
"Extending this" below for where to plug them in.

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, Supabase Storage)
- **No global state library** — auth and cart are plain React Context; product
  data is fetched with small typed hooks. This is deliberate: the app is not
  large enough yet to justify Redux/Zustand, and adding one prematurely is
  its own maintenance cost.

## Project structure

```
supabase/
  migrations/         # numbered, idempotent SQL migrations (run in order)
  seed/seed.sql        # demo catalog data for local development
src/
  lib/supabase.ts      # Supabase client singleton
  types/               # hand-written types mirroring the DB schema
  contexts/            # AuthContext, CartContext
  hooks/               # useProducts, useCategories, useOrders, ...
  components/
    layout/            # Header, Footer, Layout
    ui/                # Button/input/toast/etc. primitives
    product/           # ProductCard, ProductGrid, ProductFilters
  pages/               # one file per route
  routes/ProtectedRoute.tsx
```

## 1. Create the Supabase project

1. Create a project at https://supabase.com/dashboard.
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
3. Copy `.env.example` to `.env.local` and fill in both values:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 2. Apply the database schema

Using the Supabase CLI (recommended):

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push          # applies everything in supabase/migrations, in order
psql "$(supabase db remote-url)" -f supabase/seed/seed.sql   # optional demo data
```

Or, without the CLI: open the Supabase dashboard's **SQL Editor** and run each
file in `supabase/migrations/` in numeric order (001 → 005), then optionally
`supabase/seed/seed.sql`.

**What the migrations set up:**
- `001` — extensions (`pgcrypto`, `pg_trgm`, `unaccent`) and enum types
- `002` — all tables: profiles, addresses, categories, products, images,
  variants, carts, cart_items, orders, order_items, order_status_history, reviews
- `003` — indexes for FK joins, category/price filtering, and full-text +
  trigram product search
- `004` — trigger functions: `updated_at` maintenance, auto-profile-on-signup,
  search vector maintenance, product rating aggregation, order numbering,
  **atomic stock decrementing**, order status history logging, and the
  `place_order()` RPC the checkout flow calls
- `005` — Row Level Security policies for every table

### Why a `place_order()` RPC instead of client-side inserts?

The frontend never inserts directly into `orders`/`order_items`. Instead it
calls `supabase.rpc('place_order', ...)`, a `security definer` Postgres
function that: reads the caller's own cart, computes tax/shipping/total
server-side, writes the order and order items, decrements stock with a
row-level lock (so two concurrent buyers can't oversell the last unit), and
clears the cart — all inside one transaction. A client-side multi-step
insert could be interrupted between "order created" and "stock decremented,"
or a malicious client could submit arbitrary prices. Locking this business
logic in the database closes both problems regardless of which client calls it.

## 3. (Optional) Product images via Supabase Storage

The seed data uses hosted Unsplash URLs so the app works without any Storage
setup. To serve your own product images instead:

1. In the dashboard, go to **Storage** and create a public bucket named `product-images`.
2. Upload images, then use their public URLs (Storage → file → "Get URL") in
   `product_images.url` instead of external URLs.

## 4. Run the app

```bash
npm install
npm run dev
```

Visit http://localhost:5173. Create an account, browse `/products`, add
items to your cart, and check out — orders will appear in Postgres under
`orders` / `order_items`.

## Extending this

- **Product variants:** the schema already supports them (`product_variants`);
  the seed data just doesn't use any, so add rows there to see size/color
  pickers in the UI. The admin product form doesn't manage variants yet —
  add rows via SQL/dashboard for now, or extend `AdminProductFormPage`.
- **Type generation:** once your schema is stable, run
  `supabase gen types typescript --linked > src/types/database.generated.ts`
  for compiler-checked types instead of the hand-written ones in
  `database.types.ts`.

---

# v2 — Admin dashboard, Stripe payments, reviews, wishlist, order emails

v2 adds five things on top of v1: an admin dashboard, real Stripe payments,
a review write flow, wishlists, and order-status emails. New migrations
`006`–`010` build on `001`–`005` — apply them the same way (`supabase db
push`, or run each new file in order in the SQL Editor).

## Admin dashboard

**Granting admin access** is deliberately not possible from the app itself —
only from the SQL Editor or another trusted context using your project's
credentials, so a compromised frontend can never self-promote a user:

```sql
insert into public.user_roles (user_id, role)
values ('<the user''s auth.users.id>', 'admin');
```

Find the user's ID under **Authentication → Users** in the dashboard. Once
granted, they'll see an "Admin dashboard" link in the account menu and can
visit `/admin` to manage products, categories, and order status.

Admin writes to `products`/`categories`/`product_images`/`product_variants`
and updates to `orders.status` are gated by the `is_admin()` policies added
in migration `006` — the client-side `AdminRoute` guard is a UX nicety, not
the actual security boundary.

## Stripe payments

Checkout now creates a `pending` order in Postgres, then redirects to a real
Stripe Checkout Session. Stripe's webhook — not the browser redirect — is
what marks the order paid, so a user closing the tab mid-payment can never
fake a paid order.

1. **Deploy the two payment Edge Functions:**

   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

   (`--no-verify-jwt` on the webhook because Stripe calls it directly, not a
   logged-in Supabase user — the function verifies Stripe's own signature instead.)

2. **Set secrets:**

   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set SITE_URL=http://localhost:5173   # or your deployed URL
   ```

3. **Create the webhook in Stripe:** Dashboard → Developers → Webhooks → Add
   endpoint → URL `https://<project-ref>.functions.supabase.co/stripe-webhook`,
   event `checkout.session.completed`. Copy the signing secret it gives you:

   ```bash
   supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
   ```

4. **Test it** with Stripe test cards (e.g. `4242 4242 4242 4242`, any future
   expiry/CVC) against the checkout flow end to end.

**Abandoned checkouts:** orders sit as `pending`/`unpaid` (with stock already
reserved) until paid. `cancel_stale_pending_orders(30)` restocks and cancels
anything older than 30 minutes — wire it to a schedule with `pg_cron`:

```sql
select cron.schedule('cancel-stale-orders', '*/15 * * * *',
  $$select public.cancel_stale_pending_orders(30)$$);
```

(Requires the `pg_cron` extension, enabled under Database → Extensions.)

## Reviews (write flow)

Signed-in users can now post/edit/delete one review per product from the
product detail page. `is_verified_purchase` is computed server-side by a
trigger from real order history — the client can't set it directly.

## Wishlist

A heart toggle appears on product cards and the product detail page for
signed-in users; saved items live at `/wishlist`. Backed by a simple
`wishlist_items` table, owner-scoped by RLS.

## Order status emails

Every order status change (pending → paid → processing → shipped →
delivered, or cancelled/refunded) can trigger an email via a Postgres
trigger → Edge Function chain:

```
order_status_history INSERT
  → notify_order_status_change() trigger (pg_net)
    → send-order-email Edge Function
      → Resend API → customer's email
```

**Setup:**

1. Enable the `pg_net` extension (Database → Extensions) if migration `010`
   didn't already enable it.
2. Deploy the function: `supabase functions deploy send-order-email --no-verify-jwt`
   (it authorizes via a shared secret instead of a user JWT, since Postgres
   calls it, not a browser).
3. Set secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=re_...
   supabase secrets set EMAIL_FROM="Fernweh <orders@yourdomain.com>"
   supabase secrets set EDGE_FUNCTION_SECRET=$(openssl rand -hex 32)
   ```
4. Point the trigger at the deployed function with the **same** secret from
   step 3, via SQL:
   ```sql
   insert into public.app_config (key, value) values
     ('send_order_email_url', 'https://<project-ref>.functions.supabase.co/send-order-email'),
     ('edge_function_secret', '<same value as EDGE_FUNCTION_SECRET above>')
   on conflict (key) do update set value = excluded.value;
   ```

Until `app_config.send_order_email_url` is set, the trigger silently no-ops
(no errors, no emails) — so v2 works fine without email configured, you just
won't get notifications. Without `RESEND_API_KEY` set, the function logs the
would-be email instead of sending it, which is useful for testing the
trigger chain before wiring up a real provider.

---

# v3 — Storage uploads, variant admin UI, coupons, refunds, analytics, tests

Migrations `011`–`014` add coupons, refunds, and analytics RPCs; apply them
the same way as before. This version also adds a real test suite and a
deployment guide (`DEPLOYMENT.md`).

## Image uploads to Storage

Migration `013` creates a public `product-images` Storage bucket (admin-only
write, via `is_admin()` policies on `storage.objects`). The admin product
form now has an **Upload** button next to each image row, alongside the
existing "paste a URL" option — both write to the same `product_images`
table, so use whichever is convenient per image.

## Product variant admin UI

The admin product form now has a **Variants** section: add rows with a
name, SKU, simple `key:value, key2:value2` attributes (e.g. `size:M,
color:Black`), a price offset, and stock. Existing variants are updated in
place; new rows are inserted. Variants are never hard-deleted from this UI —
use the **Active** checkbox instead, since a variant may be referenced by
past `order_items` and deleting it would corrupt order history.

## Coupons

Create codes at `/admin/coupons` (percentage or fixed-amount, with optional
minimum subtotal, redemption limits, and expiry). At checkout, a coupon code
is validated live via `validate_coupon()` for preview — but the actual
discount charged is **always** recomputed and re-validated a second time,
server-side, inside `place_order()`. This closes the gap where a client
could apply a discount preview and then tamper with the request before
submitting the order; the number that ends up on the Stripe charge can never
be higher than what the database itself just validated.

## Refunds

From an order's admin detail page, **Refund remaining balance** calls the
`admin-refund-order` Edge Function, which:
1. Verifies the caller is an admin via their own JWT + `is_admin()` — no
   service-role key involved, so a non-admin token is rejected by Postgres
   itself even if the function had a bug.
2. Calls Stripe's refund API for the payment intent on file.
3. Records the refund in the `refunds` table, which triggers
   `apply_refund_status()` to flip `orders.payment_status` to `refunded` or
   `partially_refunded` automatically.

A database trigger (`guard_refund_amount`) independently blocks refunding
more than an order's total, even if the Edge Function's own math were wrong.

Deploy it like the others: `supabase functions deploy admin-refund-order`.

## Analytics

`/admin/analytics` shows revenue over time and top products by revenue,
backed by two admin-only Postgres RPCs (`admin_revenue_by_day`,
`admin_top_products`) — necessary because PostgREST (what `supabase-js`
talks to) can't express `GROUP BY` queries directly, so the aggregation
happens in the database instead of being pulled row-by-row into the browser.

## Testing

```bash
npm run test        # Vitest: unit + component tests (utils, UI primitives)
npm run test:watch  # same, in watch mode
npm run test:e2e    # Playwright: real browser, real dev server
```

Unit/component tests (`src/**/__tests__/`) cover pure logic (formatting,
validation, slugify) and presentational components (`PriceTag`,
`StarRating`) — the parts that are cheap to test in isolation and where
regressions are otherwise easy to miss silently.

E2E tests (`e2e/`) run against a real Supabase backend by design (no mocking
layer), so they also catch schema/RLS problems a mocked test would hide.
They need real env vars to run meaningfully — see `e2e/README.md` for setup,
including how to enable the authenticated-flow tests. Stripe and email
flows aren't covered by these (they need webhook delivery that a local run
can't receive) — test those manually against Stripe's test mode.

This is a starting scaffold, not exhaustive coverage: there's no test yet
for the cart merge-on-login logic, the coupon edge cases, or the refund
flow — worth adding before treating this as fully regression-proof.

## Deploying

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for Vercel/Netlify setup and a
production Supabase checklist (custom SMTP, RLS review, backups, Stripe live
mode, secrets rotation).

---

# v4 — Guest checkout, real tax/shipping, search & discovery, CI

Migrations `015`–`017` add shipping/tax calculation, guest checkout support,
and a search index. Apply them the same way as before.

## Guest checkout

Implemented on top of Supabase's **anonymous auth** rather than as a
separate order path — a guest gets a real (anonymous) `auth.users` row via
`signInAnonymously()`, so every existing RLS policy, cart, and order flow
works completely unchanged; there's no parallel "guest order" schema to
keep in sync.

**Setup:** enable "Allow anonymous sign-ins" under Authentication → Settings
in the Supabase dashboard (off by default). Without it, the "Continue as
guest" button on the login page will surface a clear error instead of
silently failing.

**How it works:** checkout still requires *a* session (`ProtectedRoute`
redirects to `/login?next=/checkout`), but the login page now offers
"Continue as guest" alongside signing in, which calls
`signInAnonymously()` and proceeds straight to checkout. Guests enter an
email at checkout (stored as `orders.guest_email`) since anonymous accounts
have none — that's what order confirmation and status emails use as a
fallback. From `/account`, a guest can later add an email + password to
convert their anonymous session into a permanent account **with the same
user id** — their order history and wishlist carry over automatically,
nothing to migrate.

## Real tax and shipping

Replaces the flat 8% tax / $8.99-or-free-over-$75 stand-ins from v1:

- **Tax:** `calculate_tax()` looks up a per-US-state sales tax rate from
  the new `tax_rates` table (seeded with approximate combined state rates).
  This is a reasonable MVP approach but **is not fully compliant** — it
  ignores county/city district taxes, sourcing rules, and product
  exemptions, and only covers the US. For real compliance, swap this
  function's body for a call to TaxJar or Avalara from an Edge Function.
- **Shipping:** `calculate_shipping()` charges a base fee plus a per-500g
  increment (products now have a `weight_grams` column, defaulting to 200g
  — update real weights via the admin product form), waived above $75.
  This is weight-aware but still not a live carrier quote; swap it for
  Shippo or EasyPost the same way for real-time rates.
- Both are called from **one place** (`place_order()`) and exposed for
  preview via `preview_order_totals()`, so the checkout page's live
  tax/shipping display can never drift from what's actually charged —
  it's calling the exact same functions, just before the order exists.

## Search & discovery

- **Advanced filters** on `/products`: price range, minimum rating, and
  in-stock-only, all reflected in the URL (shareable/bookmarkable) and
  combined with existing search/category/sort.
- **Autocomplete**: the header search box now suggests up to 5 matching
  products as you type (debounced), with keyboard navigation (arrow
  keys + Enter) and click-through.
- **Related products**: product detail pages show up to 4 other products
  from the same category under "You might also like."

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`:
lint → typecheck → unit tests → build. This job needs no secrets (build
env vars are placeholders — real ones are injected by Vercel/Netlify at
deploy time, not at CI time).

A second, optional `e2e` job runs the full Playwright suite against a real
Supabase project. It's skipped by default; to enable it, set the repo
variable `RUN_E2E=true` (Settings → Secrets and variables → Actions →
Variables) and add these repo secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` — pointing at a dedicated test
Supabase project, not production.

Dependabot (`.github/dependabot.yml`) is configured for weekly npm and
GitHub Actions dependency update PRs.



