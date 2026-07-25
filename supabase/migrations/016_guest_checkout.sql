-- ============================================================================
-- 015_guest_checkout.sql
-- Guest checkout is implemented on top of Supabase's anonymous auth, not as
-- a parallel order path: a guest gets a real (anonymous) auth.users row via
-- supabase.auth.signInAnonymously() on the client, which means every RLS
-- policy, trigger, and the whole cart/order schema already works for them
-- unchanged — auth.uid() is a real uuid either way. The only gap is that
-- anonymous users have no email on auth.users, so we capture one explicitly
-- at checkout for order confirmation / status emails.
-- ============================================================================

alter table public.orders
  add column if not exists guest_email text;

-- ---------------------------------------------------------------------------
-- place_order(): now accepts p_email. For a real logged-in user this is
-- just a receipt-email override (defaults to their account email if omitted
-- on the frontend); for an anonymous user it's the only email on file.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_payment_method text,
  p_coupon_code text default null,
  p_email text default null
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
  v_discount    numeric(12,2) := 0;
  v_coupon_id   uuid;
  v_state       text;
  v_weight      integer := 0;
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

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    v_discount := public.validate_coupon(p_coupon_code, v_subtotal);
    select id into v_coupon_id from public.coupons where lower(code) = lower(p_coupon_code);
  end if;

  select coalesce(sum(p.weight_grams * ci.quantity), 0)
    into v_weight
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id;

  v_state := upper(trim(p_shipping_address->>'state'));
  v_tax := public.calculate_tax(v_subtotal - v_discount, v_state);
  v_shipping := public.calculate_shipping(v_weight, v_subtotal - v_discount);

  insert into public.orders (
    user_id, shipping_address, billing_address, payment_method, guest_email,
    subtotal, tax, shipping_fee, discount, total, status, payment_status
  ) values (
    auth.uid(), p_shipping_address, coalesce(p_billing_address, p_shipping_address),
    p_payment_method, p_email,
    v_subtotal, v_tax, v_shipping, v_discount,
    v_subtotal + v_tax + v_shipping - v_discount, 'pending', 'unpaid'
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

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id, amount)
    values (v_coupon_id, auth.uid(), v_order.id, v_discount);
  end if;

  delete from public.cart_items where cart_id = v_cart_id;

  return v_order;
end;
$$;
