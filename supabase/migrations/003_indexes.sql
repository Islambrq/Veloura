-- ============================================================================
-- 003_indexes.sql
-- Indexes chosen for the query patterns the storefront actually uses:
-- category browsing, search, cart/order lookups by user, FK joins.
-- ============================================================================

-- Foreign key lookups
create index if not exists idx_addresses_user_id        on public.addresses (user_id);
create index if not exists idx_categories_parent_id      on public.categories (parent_id);
create index if not exists idx_products_category_id      on public.products (category_id);
create index if not exists idx_product_images_product_id on public.product_images (product_id);
create index if not exists idx_variants_product_id       on public.product_variants (product_id);
create index if not exists idx_cart_items_cart_id        on public.cart_items (cart_id);
create index if not exists idx_cart_items_product_id     on public.cart_items (product_id);
create index if not exists idx_orders_user_id            on public.orders (user_id);
create index if not exists idx_order_items_order_id      on public.order_items (order_id);
create index if not exists idx_order_status_history_oid  on public.order_status_history (order_id);
create index if not exists idx_reviews_product_id        on public.reviews (product_id);
create index if not exists idx_reviews_user_id            on public.reviews (user_id);

-- Common filters
create index if not exists idx_products_is_active   on public.products (is_active) where is_active = true;
create index if not exists idx_products_price       on public.products (price);
create index if not exists idx_orders_status         on public.orders (status);
create index if not exists idx_orders_placed_at      on public.orders (placed_at desc);

-- Trigram indexes for fast partial/fuzzy name search (ILIKE '%term%')
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);

-- Full text search (weighted: name > description)
create index if not exists idx_products_search_vector on public.products using gin (search_vector);

-- Slug lookups (unique constraint already creates an index, listed here for clarity)
-- create unique index idx_products_slug on public.products (slug);
-- create unique index idx_categories_slug on public.categories (slug);
