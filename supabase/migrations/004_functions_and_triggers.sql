-- ============================================================================
-- 004_functions_and_triggers.sql
-- Business logic that must hold true regardless of which client hits the
-- database, so it lives here rather than only in the frontend.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- generic updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','addresses','categories','products','product_variants',
    'carts','cart_items','orders','reviews'
  ]
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I;
       create trigger trg_set_updated_at
       before update on public.%I
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- auto-create a profile (and empty cart) when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.carts (user_id) values (new.id);

  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- maintain products.search_vector for full text search
-- ---------------------------------------------------------------------------
create or replace function public.products_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', unaccent(coalesce(new.name, ''))), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(new.description, ''))), 'B');
  return new;
end;
$$;

drop trigger if exists trg_products_search_vector on public.products;
create trigger trg_products_search_vector
  before insert or update of name, description on public.products
  for each row execute function public.products_search_vector_update();

-- ---------------------------------------------------------------------------
-- recompute products.avg_rating / review_count whenever reviews change
-- ---------------------------------------------------------------------------
create or replace function public.recalculate_product_rating()
returns trigger
language plpgsql
as $$
declare
  target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  update public.products p
  set avg_rating = coalesce((
        select round(avg(r.rating)::numeric, 2)
        from public.reviews r
        where r.product_id = target_product_id
      ), 0),
      review_count = (
        select count(*) from public.reviews r where r.product_id = target_product_id
      )
  where p.id = target_product_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reviews_rating_insert on public.reviews;
create trigger trg_reviews_rating_insert
  after insert or update or delete on public.reviews
  for each row execute function public.recalculate_product_rating();

-- ---------------------------------------------------------------------------
-- human-friendly, collision-safe order numbers, e.g. ORD-20260723-9K3F2A
-- ---------------------------------------------------------------------------
create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number :=
      'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_order_number on public.orders;
create trigger trg_generate_order_number
  before insert on public.orders
  for each row execute function public.generate_order_number();

-- ---------------------------------------------------------------------------
-- decrement stock atomically when an order_item is created; refuse if
-- insufficient inventory (protects against overselling under concurrency)
-- ---------------------------------------------------------------------------
create or replace function public.decrement_stock_on_order_item()
returns trigger
language plpgsql
as $$
declare
  available integer;
begin
  if new.variant_id is not null then
    select stock_quantity into available
    from public.product_variants
    where id = new.variant_id
    for update;

    if available is null or available < new.quantity then
      raise exception 'Insufficient stock for variant %', new.variant_id;
    end if;

    update public.product_variants
    set stock_quantity = stock_quantity - new.quantity
    where id = new.variant_id;
  else
    select stock_quantity into available
    from public.products
    where id = new.product_id
    for update;

    if available is null or available < new.quantity then
      raise exception 'Insufficient stock for product %', new.product_id;
    end if;

    update public.products
    set stock_quantity = stock_quantity - new.quantity
    where id = new.product_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_decrement_stock on public.order_items;
create trigger trg_decrement_stock
  before insert on public.order_items
  for each row execute function public.decrement_stock_on_order_item();

-- ---------------------------------------------------------------------------
-- record every order status transition automatically
-- ---------------------------------------------------------------------------
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, status, note)
    values (new.id, new.status, 'Order created');
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, note)
    values (new.id, new.status, null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_order_status_insert on public.orders;
create trigger trg_log_order_status_insert
  after insert on public.orders
  for each row execute function public.log_order_status_change();

drop trigger if exists trg_log_order_status_update on public.orders;
create trigger trg_log_order_status_update
  after update of status on public.orders
  for each row execute function public.log_order_status_change();

-- ---------------------------------------------------------------------------
-- RPC: place_order — the single entry point the frontend calls at checkout.
-- Wraps address snapshot, order + order_items creation, and stock
-- decrementing (via the trigger above) inside one transaction so a partial
-- failure never leaves an order half-written or stock half-decremented.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_payment_method text
)
returns public.orders
language plpgsql
security definer set search_path = public
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

  v_tax := round(v_subtotal * 0.08, 2);        -- flat 8% tax, replace with real tax service
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
           p.name as product_name, p.sku as base_sku,
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

  -- Simulated payment authorization. Swap this for a real PSP call
  -- (e.g. Stripe PaymentIntent confirmation) before going live.
  update public.orders
  set status = 'paid', payment_status = 'paid'
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;
