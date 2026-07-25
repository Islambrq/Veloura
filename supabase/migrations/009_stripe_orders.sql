-- ============================================================================
-- 009_stripe_orders.sql
-- Replaces the v1 "simulated payment" step with a real Stripe flow:
--   1. place_order() creates the order as pending/unpaid and reserves stock
--      (unchanged behavior from v1, minus the fake auto-paid step).
--   2. The frontend calls the create-checkout-session Edge Function, which
--      creates a Stripe Checkout Session tagged with the order id and
--      redirects the browser to Stripe.
--   3. Stripe calls the stripe-webhook Edge Function on completion, which
--      uses the service_role key to call mark_order_paid(). This is the
--      only path that can mark an order paid — the client never can.
--   4. cancel_stale_pending_orders() restocks and cancels abandoned orders
--      (intended to run on a schedule via pg_cron or an external scheduler).
-- ============================================================================

alter table public.orders
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

create index if not exists idx_orders_stripe_session
  on public.orders (stripe_checkout_session_id);

-- ---------------------------------------------------------------------------
-- place_order(): same as v1 except it no longer fakes a paid status.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_payment_method text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id     uuid;
  v_order       public.orders;
  v_subtotal    numeric(12,2) := 0;
  v_tax         numeric(12,2) := 0;
  v_shipping    numeric(12,2) := 0;
  v_item        record;
begin
  select id into v_cart_id from public.carts where user_id = auth.uid();

  if v_cart_id is null then
    raise exception 'No cart found for current user';
  end if;

  select coalesce(sum(ci.quantity * ci.unit_price), 0)
    into v_subtotal
  from public.cart_items ci
  where ci.cart_id = v_cart_id;

  if v_subtotal <= 0 then
    raise exception 'Cannot place an order with an empty cart';
  end if;

  v_tax := round(v_subtotal * 0.08, 2);
  v_shipping := case when v_subtotal >= 75 then 0 else 8.99 end;

  insert into public.orders (
    user_id, shipping_address, billing_address, payment_method,
    subtotal, tax, shipping_fee, total, status, payment_status
  ) values (
    auth.uid(), p_shipping_address, coalesce(p_billing_address, p_shipping_address),
    p_payment_method, v_subtotal, v_tax, v_shipping,
    v_subtotal + v_tax + v_shipping, 'pending', 'unpaid'
  )
  returning * into v_order;

  for v_item in
    select ci.product_id, ci.variant_id, ci.quantity, ci.unit_price,
           p.name as product_name,
           coalesce(pv.sku, p.sku) as sku
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    left join public.product_variants pv on pv.id = ci.variant_id
    where ci.cart_id = v_cart_id
  loop
    insert into public.order_items (
      order_id, product_id, variant_id, product_name, sku, unit_price, quantity, subtotal
    ) values (
      v_order.id, v_item.product_id, v_item.variant_id, v_item.product_name, v_item.sku,
      v_item.unit_price, v_item.quantity, v_item.unit_price * v_item.quantity
    );
  end loop;

  delete from public.cart_items where cart_id = v_cart_id;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- attach_stripe_session(): called by the create-checkout-session Edge
-- Function (with the *user's* auth context, via RLS) right after creating
-- the Stripe session, so we can find the order again from the webhook.
-- ---------------------------------------------------------------------------
create or replace function public.attach_stripe_session(
  p_order_id uuid,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set stripe_checkout_session_id = p_session_id
  where id = p_order_id and user_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_order_paid(): the ONLY way an order becomes 'paid'. Callable only by
-- service_role (the Stripe webhook function), never by end users.
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_session_id text,
  p_payment_intent_id text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  update public.orders
  set payment_status = 'paid',
      status = 'paid',
      stripe_payment_intent_id = p_payment_intent_id
  where stripe_checkout_session_id = p_session_id
  returning * into v_order;

  if v_order.id is null then
    raise exception 'No order found for Stripe session %', p_session_id;
  end if;

  return v_order;
end;
$$;

revoke execute on function public.mark_order_paid(text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- cancel_stale_pending_orders(): restocks and cancels orders left unpaid
-- past p_older_than_minutes (Stripe Checkout Sessions expire after 24h by
-- default, but 30 minutes is a reasonable abandoned-cart window). Run this
-- on a schedule with pg_cron, e.g.:
--   select cron.schedule('cancel-stale-orders', '*/15 * * * *',
--     $$select public.cancel_stale_pending_orders(30)$$);
-- ---------------------------------------------------------------------------
create or replace function public.cancel_stale_pending_orders(p_older_than_minutes integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count integer := 0;
begin
  for v_order in
    select id from public.orders
    where status = 'pending'
      and payment_status = 'unpaid'
      and created_at < now() - (p_older_than_minutes || ' minutes')::interval
  loop
    update public.product_variants pv
    set stock_quantity = stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = v_order.id and oi.variant_id = pv.id;

    update public.products p
    set stock_quantity = stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = v_order.id and oi.product_id = p.id and oi.variant_id is null;

    update public.orders set status = 'cancelled' where id = v_order.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.cancel_stale_pending_orders(integer) from public, anon, authenticated;
grant execute on function public.cancel_stale_pending_orders(integer) to service_role;
