-- ============================================================================
-- 015_shipping_and_tax.sql
-- Replaces the flat 8% tax / $8.99-or-free shipping placeholders from v1
-- with something closer to how a real store computes both — while being
-- explicit about where this still falls short of full compliance/accuracy.
--
-- TAX: a single sales-tax rate per US state is a reasonable MVP approach
-- (many small stores ship this), but it is NOT fully compliant: it ignores
-- county/city district taxes, origin-vs-destination sourcing rules, product
-- tax-exemption categories, and non-US jurisdictions entirely. For real
-- compliance, replace calculate_tax()'s body with a call out to a tax API
-- (TaxJar, Avalara) from an Edge Function instead — see the README.
--
-- SHIPPING: rate is a function of total order weight and a few flat tiers,
-- not a live carrier quote. For real-time carrier rates (USPS/UPS/FedEx),
-- replace calculate_shipping() the same way, via Shippo or EasyPost.
-- ============================================================================

alter table public.products
  add column if not exists weight_grams integer not null default 200
  check (weight_grams > 0);

comment on column public.products.weight_grams is
  'Shipping weight in grams. Defaults to 200g for existing rows — update real values via the admin product form or a bulk update before relying on shipping estimates.';

-- ---------------------------------------------------------------------------
-- US state sales tax (approximate combined state rates, no local district
-- add-ons). Illustrative and a reasonable MVP default — verify and refresh
-- against an authoritative source before relying on these for real filings.
-- ---------------------------------------------------------------------------
create table if not exists public.tax_rates (
  state_code  text primary key,          -- USPS 2-letter code, e.g. 'CA'
  state_name  text not null,
  rate        numeric(5,4) not null check (rate >= 0),  -- 0.0725 = 7.25%
  updated_at  timestamptz not null default now()
);

alter table public.tax_rates enable row level security;

create policy "tax_rates_public_read" on public.tax_rates
  for select using (true);

create policy "tax_rates_admin_write" on public.tax_rates
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.tax_rates (state_code, state_name, rate) values
  ('AL','Alabama',0.0400),('AK','Alaska',0.0000),('AZ','Arizona',0.0560),
  ('AR','Arkansas',0.0650),('CA','California',0.0725),('CO','Colorado',0.0290),
  ('CT','Connecticut',0.0635),('DE','Delaware',0.0000),('FL','Florida',0.0600),
  ('GA','Georgia',0.0400),('HI','Hawaii',0.0400),('ID','Idaho',0.0600),
  ('IL','Illinois',0.0625),('IN','Indiana',0.0700),('IA','Iowa',0.0600),
  ('KS','Kansas',0.0650),('KY','Kentucky',0.0600),('LA','Louisiana',0.0445),
  ('ME','Maine',0.0550),('MD','Maryland',0.0600),('MA','Massachusetts',0.0625),
  ('MI','Michigan',0.0600),('MN','Minnesota',0.0688),('MS','Mississippi',0.0700),
  ('MO','Missouri',0.0423),('MT','Montana',0.0000),('NE','Nebraska',0.0550),
  ('NV','Nevada',0.0685),('NH','New Hampshire',0.0000),('NJ','New Jersey',0.0663),
  ('NM','New Mexico',0.0513),('NY','New York',0.0400),('NC','North Carolina',0.0475),
  ('ND','North Dakota',0.0500),('OH','Ohio',0.0575),('OK','Oklahoma',0.0450),
  ('OR','Oregon',0.0000),('PA','Pennsylvania',0.0600),('RI','Rhode Island',0.0700),
  ('SC','South Carolina',0.0600),('SD','South Dakota',0.0420),('TN','Tennessee',0.0700),
  ('TX','Texas',0.0625),('UT','Utah',0.0485),('VT','Vermont',0.0600),
  ('VA','Virginia',0.0430),('WA','Washington',0.0650),('WV','West Virginia',0.0600),
  ('WI','Wisconsin',0.0500),('WY','Wyoming',0.0400),('DC','District of Columbia',0.0600)
on conflict (state_code) do nothing;

create or replace function public.calculate_tax(p_taxable_amount numeric, p_state_code text)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select round(
    p_taxable_amount * coalesce(
      (select rate from public.tax_rates where state_code = upper(trim(p_state_code))),
      0.05  -- fallback rate if state is missing/unrecognized (e.g. non-US address)
    ),
    2
  );
$$;

-- ---------------------------------------------------------------------------
-- Shipping: a base fee plus a per-500g increment, waived above a free-
-- shipping subtotal threshold — closer to real carrier pricing shape
-- (weight-driven) than a single flat fee, without needing a live API.
-- ---------------------------------------------------------------------------
create or replace function public.calculate_shipping(p_total_weight_grams integer, p_subtotal numeric)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_base    numeric(12,2) := 5.99;
  v_per_500g numeric(12,2) := 1.50;
  v_free_threshold numeric(12,2) := 75.00;
begin
  if p_subtotal >= v_free_threshold then
    return 0;
  end if;

  return round(v_base + ceil(greatest(p_total_weight_grams, 0) / 500.0) * v_per_500g, 2);
end;
$$;

-- ---------------------------------------------------------------------------
-- preview_order_totals(): lets the checkout page show accurate tax/shipping
-- as soon as an address is entered, without creating an order yet. Reuses
-- the exact same functions place_order() uses, so the preview can never
-- drift from what's actually charged.
-- ---------------------------------------------------------------------------
create or replace function public.preview_order_totals(
  p_state_code text,
  p_coupon_code text default null
)
returns table (subtotal numeric, discount numeric, tax numeric, shipping numeric, total numeric)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_cart_id  uuid;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_weight   integer := 0;
  v_tax      numeric(12,2);
  v_shipping numeric(12,2);
begin
  select id into v_cart_id from public.carts where user_id = auth.uid();
  if v_cart_id is null then
    return query select 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    return;
  end if;

  select coalesce(sum(ci.quantity * ci.unit_price), 0) into v_subtotal
  from public.cart_items ci where ci.cart_id = v_cart_id;

  select coalesce(sum(p.weight_grams * ci.quantity), 0) into v_weight
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    begin
      v_discount := public.validate_coupon(p_coupon_code, v_subtotal);
    exception when others then
      v_discount := 0;  -- preview should degrade gracefully on an invalid code, not error
    end;
  end if;

  v_tax := public.calculate_tax(v_subtotal - v_discount, p_state_code);
  v_shipping := public.calculate_shipping(v_weight, v_subtotal - v_discount);

  return query select v_subtotal, v_discount, v_tax, v_shipping,
    (v_subtotal - v_discount + v_tax + v_shipping);
end;
$$;

revoke execute on function public.preview_order_totals(text, text) from public, anon;
grant execute on function public.preview_order_totals(text, text) to authenticated;
