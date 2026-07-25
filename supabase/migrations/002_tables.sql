-- ============================================================================
-- 002_tables.sql
-- Core normalized schema. All primary keys are UUIDs so IDs are safe to
-- generate client-side and never collide across shards/regions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: 1:1 extension of auth.users. auth.users itself is managed by
-- Supabase Auth and must never be modified directly.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  phone        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Public-facing user profile data, 1:1 with auth.users.';

-- ---------------------------------------------------------------------------
-- addresses
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  label           text not null default 'Home',
  recipient_name  text not null,
  phone           text,
  line1           text not null,
  line2           text,
  city            text not null,
  state           text,
  postal_code     text not null,
  country         text not null default 'US',
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories (self-referencing tree, e.g. Electronics > Laptops)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid references public.categories(id) on delete set null,
  name          text not null,
  slug          text not null unique,
  description   text,
  image_url     text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid references public.categories(id) on delete set null,
  sku                text not null unique,
  name               text not null,
  slug               text not null unique,
  description        text,
  price              numeric(12,2) not null check (price >= 0),
  compare_at_price   numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  currency           text not null default 'USD',
  stock_quantity     integer not null default 0 check (stock_quantity >= 0),
  is_active          boolean not null default true,
  avg_rating         numeric(3,2) not null default 0,
  review_count       integer not null default 0,
  search_vector      tsvector,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  alt_text    text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- product_variants (e.g. size/color combinations). Optional per product.
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  sku            text not null unique,
  name           text not null,          -- e.g. "Medium / Black"
  attributes     jsonb not null default '{}'::jsonb,  -- {"size":"M","color":"Black"}
  price_offset   numeric(12,2) not null default 0,    -- added to product.price
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- carts + cart_items (server-persisted cart for authenticated users)
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete cascade,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(12,2) not null,  -- snapshot at time of add-to-cart
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cart_id, product_id, variant_id)
);

-- ---------------------------------------------------------------------------
-- orders + order_items + order_status_history
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number       text not null unique,
  user_id            uuid not null references public.profiles(id) on delete restrict,
  status             order_status not null default 'pending',
  payment_status     payment_status not null default 'unpaid',
  payment_method     text,
  subtotal           numeric(12,2) not null default 0,
  tax                numeric(12,2) not null default 0,
  shipping_fee       numeric(12,2) not null default 0,
  discount           numeric(12,2) not null default 0,
  total              numeric(12,2) not null default 0,
  currency           text not null default 'USD',
  shipping_address   jsonb not null,   -- denormalized snapshot at order time
  billing_address    jsonb,
  notes              text,
  placed_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,
  product_name  text not null,   -- snapshot, survives product edits/deletes
  sku           text not null,
  unit_price    numeric(12,2) not null,
  quantity      integer not null check (quantity > 0),
  subtotal      numeric(12,2) not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      order_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references public.products(id) on delete cascade,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  rating               smallint not null check (rating between 1 and 5),
  title                text,
  body                 text,
  is_verified_purchase boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (product_id, user_id)
);
