-- ============================================================================
-- 011_coupons.sql
-- Coupons are validated AND applied entirely server-side. The client can
-- call validate_coupon() to preview a discount before checkout, but the
-- actual discount charged always comes from a second, authoritative
-- evaluation inside place_order() — a client can't fabricate or reuse a
-- discount amount by tampering with what it sends.
-- ============================================================================

create table if not exists public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  description         text,
  discount_type       text not null check (discount_type in ('percentage', 'fixed_amount')),
  discount_value      numeric(12,2) not null check (discount_value > 0),
  min_subtotal        numeric(12,2) not null default 0,
  max_redemptions     integer,                     -- null = unlimited
  max_redemptions_per_user integer not null default 1,
  starts_at           timestamptz not null default now(),
  expires_at          timestamptz,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  amount      numeric(12,2) not null,
  created_at  timestamptz not null default now(),
  unique (order_id)  -- a given order can only redeem a coupon once
);

create index if not exists idx_coupon_redemptions_coupon_id on public.coupon_redemptions (coupon_id);
create index if not exists idx_coupon_redemptions_user_id on public.coupon_redemptions (user_id);

drop trigger if exists trg_set_updated_at on public.coupons;
create trigger trg_set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

-- No public read policy: codes are looked up through validate_coupon()
-- (security definer) rather than by selecting the table directly, so an
-- unauthenticated client can't enumerate all active codes.
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

create policy "coupon_redemptions_owner_select" on public.coupon_redemptions
  for select using (auth.uid() = user_id);

create policy "coupon_redemptions_admin_select" on public.coupon_redemptions
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- validate_coupon(): read-only preview. Returns the discount that WOULD be
-- applied, or raises a descriptive exception if the code can't be used.
-- Safe to call from the client while a user is still on the cart/checkout
-- page, before an order exists.
-- ---------------------------------------------------------------------------
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon        public.coupons;
  v_redeemed      integer;
  v_user_redeemed integer;
  v_discount      numeric(12,2);
begin
  select * into v_coupon from public.coupons
  where lower(code) = lower(p_code) and is_active = true;

  if v_coupon.id is null then
    raise exception 'Coupon code not found';
  end if;

  if now() < v_coupon.starts_at then
    raise exception 'This coupon is not active yet';
  end if;
  if v_coupon.expires_at is not null and now() > v_coupon.expires_at then
    raise exception 'This coupon has expired';
  end if;
  if p_subtotal < v_coupon.min_subtotal then
    raise exception 'This coupon requires a minimum subtotal of %', v_coupon.min_subtotal;
  end if;

  if v_coupon.max_redemptions is not null then
    select count(*) into v_redeemed from public.coupon_redemptions where coupon_id = v_coupon.id;
    if v_redeemed >= v_coupon.max_redemptions then
      raise exception 'This coupon has reached its redemption limit';
    end if;
  end if;

  select count(*) into v_user_redeemed
  from public.coupon_redemptions
  where coupon_id = v_coupon.id and user_id = auth.uid();
  if v_user_redeemed >= v_coupon.max_redemptions_per_user then
    raise exception 'You have already used this coupon';
  end if;

  if v_coupon.discount_type = 'percentage' then
    v_discount := round(p_subtotal * (v_coupon.discount_value / 100), 2);
  else
    v_discount := v_coupon.discount_value;
  end if;

  return least(v_discount, p_subtotal);
end;
$$;

revoke execute on function public.validate_coupon(text, numeric) from public, anon;
grant execute on function public.validate_coupon(text, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- place_order(): now accepts an optional coupon code and re-validates +
-- applies it atomically as part of order creation (so a race between two
-- concurrent redemptions of a one-per-user coupon can't both succeed).
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_payment_method text,
  p_coupon_code text default null
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
    v_discount := public.validate_coupon(p_coupon_code, v_subtotal);  -- raises on failure
    select id into v_coupon_id from public.coupons where lower(code) = lower(p_coupon_code);
  end if;

  v_tax := round((v_subtotal - v_discount) * 0.08, 2);
  v_shipping := case when v_subtotal >= 75 then 0 else 8.99 end;

  insert into public.orders (
    user_id, shipping_address, billing_address, payment_method,
    subtotal, tax, shipping_fee, discount, total, status, payment_status
  ) values (
    auth.uid(), p_shipping_address, coalesce(p_billing_address, p_shipping_address),
    p_payment_method, v_subtotal, v_tax, v_shipping, v_discount,
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
