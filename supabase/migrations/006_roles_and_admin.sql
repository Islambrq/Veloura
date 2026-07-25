-- ============================================================================
-- 006_roles_and_admin.sql
-- Adds an explicit roles table (rather than a boolean flag on profiles) so
-- roles can grow later (e.g. 'support', 'inventory_manager') without a
-- schema migration each time. Admins get write access to catalog data and
-- can update order status; everything else stays owner-scoped.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin');
  end if;
end$$;

create table if not exists public.user_roles (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        app_role not null,
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

-- Users can see their own roles (so the frontend can show/hide admin nav);
-- nobody can grant themselves a role from the client — that requires the
-- service_role key (i.e. done by a trusted operator, not the app).
create policy "user_roles_self_select" on public.user_roles
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- is_admin(): a small helper so every admin policy below reads the same way.
-- security definer + a fixed search_path so it can be called from RLS
-- policies (which run as the querying user) while still reading user_roles.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Catalog write access for admins (categories/products/images/variants).
-- Public read policies from 005 remain unchanged and additive.
-- ---------------------------------------------------------------------------
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "product_images_admin_write" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy "product_variants_admin_write" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admins can read and update all orders (to progress status: paid ->
-- processing -> shipped -> delivered, or cancel/refund). They still cannot
-- insert orders directly — order creation stays exclusive to place_order()
-- and the Stripe webhook flow introduced in migration 009.
-- ---------------------------------------------------------------------------
create policy "orders_admin_select" on public.orders
  for select using (public.is_admin());

create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

create policy "order_items_admin_select" on public.order_items
  for select using (public.is_admin());

create policy "order_status_history_admin_select" on public.order_status_history
  for select using (public.is_admin());

create policy "order_status_history_admin_insert" on public.order_status_history
  for insert with check (public.is_admin());

comment on function public.is_admin is
  'To grant an admin: insert into public.user_roles (user_id, role) values (''<uuid>'', ''admin'') using the service_role key (SQL editor or a trusted backend), never from the client app.';
