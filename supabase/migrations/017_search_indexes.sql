-- ============================================================================
-- 017_search_indexes.sql
-- Supports the new rating filter/sort in the product list.
-- ============================================================================

create index if not exists idx_products_avg_rating on public.products (avg_rating);
