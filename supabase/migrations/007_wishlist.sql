-- ============================================================================
-- 007_wishlist.sql
-- ============================================================================

create table if not exists public.wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_wishlist_items_user_id on public.wishlist_items (user_id);
create index if not exists idx_wishlist_items_product_id on public.wishlist_items (product_id);

alter table public.wishlist_items enable row level security;

create policy "wishlist_owner_select" on public.wishlist_items
  for select using (auth.uid() = user_id);

create policy "wishlist_owner_insert" on public.wishlist_items
  for insert with check (auth.uid() = user_id);

create policy "wishlist_owner_delete" on public.wishlist_items
  for delete using (auth.uid() = user_id);
