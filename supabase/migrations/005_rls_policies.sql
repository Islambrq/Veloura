-- ============================================================================
-- 005_rls_policies.sql
-- Row Level Security. Principle: public catalog data is world-readable;
-- everything user-owned is scoped to auth.uid(); writes to catalog data
-- require the service_role key (i.e. an admin/back-office context), which
-- bypasses RLS entirely and therefore needs no explicit policy here.
-- ============================================================================

alter table public.profiles              enable row level security;
alter table public.addresses             enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_images        enable row level security;
alter table public.product_variants      enable row level security;
alter table public.carts                 enable row level security;
alter table public.cart_items            enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.reviews               enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- addresses
-- ---------------------------------------------------------------------------
create policy "addresses_owner_select" on public.addresses
  for select using (auth.uid() = user_id);

create policy "addresses_owner_insert" on public.addresses
  for insert with check (auth.uid() = user_id);

create policy "addresses_owner_update" on public.addresses
  for update using (auth.uid() = user_id);

create policy "addresses_owner_delete" on public.addresses
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- categories / products / product_images / product_variants
-- Public, read-only storefront data. No insert/update/delete policy is
-- defined for anon/authenticated roles, so those actions are only possible
-- with the service_role key from a trusted backend/admin context.
-- ---------------------------------------------------------------------------
create policy "categories_public_read" on public.categories
  for select using (is_active = true);

create policy "products_public_read" on public.products
  for select using (is_active = true);

create policy "product_images_public_read" on public.product_images
  for select using (true);

create policy "product_variants_public_read" on public.product_variants
  for select using (is_active = true);

-- ---------------------------------------------------------------------------
-- carts / cart_items
-- ---------------------------------------------------------------------------
create policy "carts_owner_all" on public.carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cart_items_owner_select" on public.cart_items
  for select using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

create policy "cart_items_owner_insert" on public.cart_items
  for insert with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

create policy "cart_items_owner_update" on public.cart_items
  for update using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

create policy "cart_items_owner_delete" on public.cart_items
  for delete using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- orders / order_items / order_status_history
-- Users may read their own orders. Orders are created exclusively via the
-- place_order() RPC (security definer), so no insert policy is granted
-- directly on the table — this prevents a client from fabricating an order
-- or bypassing stock/pricing logic.
-- ---------------------------------------------------------------------------
create policy "orders_owner_select" on public.orders
  for select using (auth.uid() = user_id);

create policy "order_items_owner_select" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "order_status_history_owner_select" on public.order_status_history
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create policy "reviews_public_read" on public.reviews
  for select using (true);

create policy "reviews_owner_insert" on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "reviews_owner_update" on public.reviews
  for update using (auth.uid() = user_id);

create policy "reviews_owner_delete" on public.reviews
  for delete using (auth.uid() = user_id);
