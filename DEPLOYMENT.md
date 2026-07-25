# Deployment guide

This app is a static Vite build (frontend) + a Supabase project (database,
auth, storage, edge functions). Deploy each independently.

## 1. Deploy the frontend

### Option A: Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel: **New Project → Import** your repo.
3. Framework preset: **Vite**. Build command `npm run build`, output
   directory `dist` (Vercel usually detects both automatically).
4. Add environment variables (**Settings → Environment Variables**):
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```
5. Because this is a single-page app using React Router, add a rewrite so
   deep links (e.g. `/products/some-slug`) don't 404 on refresh. Create
   `vercel.json` at the repo root:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
6. Deploy. Set `SITE_URL` (the Supabase Edge Function secret used for Stripe
   redirects) to this Vercel URL — see step 3 below.

### Option B: Netlify

1. **New site from Git**, build command `npm run build`, publish directory `dist`.
2. Same env vars as above under **Site settings → Environment variables**.
3. Add `public/_redirects` (or `netlify.toml`) for SPA routing:
   ```
   /*  /index.html  200
   ```

## 2. Set up production Supabase

Use a **separate Supabase project** for production, not the one you
developed against — this keeps test orders, seed data, and test Stripe
charges from ever touching real customer data.

1. **Apply migrations:** `supabase link --project-ref <prod-ref> && supabase db push`
   (do **not** run `supabase/seed/seed.sql` against production unless you
   actually want the demo catalog live).
2. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy admin-refund-order
   supabase functions deploy send-order-email --no-verify-jwt
   ```
3. **Set production secrets** (`supabase secrets set KEY=value`):
   - `STRIPE_SECRET_KEY` — your **live** key (`sk_live_...`), not test
   - `STRIPE_WEBHOOK_SIGNING_SECRET` — from a webhook endpoint pointed at
     your production function URL, event `checkout.session.completed`
   - `SITE_URL` — your deployed frontend URL
   - `RESEND_API_KEY`, `EMAIL_FROM` — for order emails
   - `EDGE_FUNCTION_SECRET` — a fresh random value (`openssl rand -hex 32`)
4. **Point the notification trigger** at the deployed function (see
   README's "Order status emails" section) with `app_config` rows using the
   production function URL and the same `EDGE_FUNCTION_SECRET`.
5. **Grant yourself admin:**
   ```sql
   insert into public.user_roles (user_id, role) values ('<your-uuid>', 'admin');
   ```
6. **(Optional) schedule stale-order cleanup:** enable `pg_cron` and run
   ```sql
   select cron.schedule('cancel-stale-orders', '*/15 * * * *',
     $$select public.cancel_stale_pending_orders(30)$$);
   ```

## 3. Production checklist

- [ ] **Auth email templates & custom SMTP.** Supabase's default auth email
      sender has low rate limits and looks like a default template — set up
      custom SMTP (Settings → Auth → SMTP) before real users sign up at volume.
- [ ] **Custom domain** on both the frontend host and (optionally) Supabase.
- [ ] **CORS.** The Edge Functions in `_shared/cors.ts` allow `*` by default —
      tighten `Access-Control-Allow-Origin` to your actual frontend origin
      before going live.
- [ ] **Switch Stripe to live mode** — live secret key, live webhook, and
      confirm `SITE_URL` points at production so redirect URLs are correct.
- [ ] **RLS review.** Re-read migrations `005`, `006`, `007`, `011`, `012` —
      confirm every table you added later also has RLS enabled with the
      access pattern you intend (a new table defaults to *no* access once
      RLS is enabled, which is safe, but easy to forget to enable at all).
- [ ] **Backups.** Enable Point-in-Time Recovery (Settings → Database) on
      the production project if losing more than a day of orders would hurt.
- [ ] **Rate limiting / abuse.** Supabase Auth has built-in rate limits;
      consider adding one at the edge (Vercel/Cloudflare) for the checkout
      and coupon-validation endpoints specifically, since those are the
      most abuse-prone (coupon brute-forcing, checkout spam).
- [ ] **Monitoring.** Watch Edge Function logs (`supabase functions logs
      <name>`) after launch, especially `stripe-webhook` — a silent webhook
      failure means paid orders stay stuck in `pending`.
- [ ] **Secrets rotation plan.** Know how to rotate `STRIPE_SECRET_KEY`,
      `EDGE_FUNCTION_SECRET`, and the Supabase service role key without
      downtime (rotate, redeploy functions, then revoke the old value).
