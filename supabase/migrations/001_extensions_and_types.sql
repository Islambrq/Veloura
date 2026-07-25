-- ============================================================================
-- 001_extensions_and_types.sql
-- Extensions, custom enum types used across the schema.
-- ============================================================================

create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "pg_trgm";         -- fuzzy / partial text search
create extension if not exists "unaccent";        -- accent-insensitive search

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'pending',      -- created, awaiting payment confirmation
      'paid',         -- payment confirmed
      'processing',   -- being prepared for shipment
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum (
      'unpaid',
      'authorized',
      'paid',
      'failed',
      'refunded',
      'partially_refunded'
    );
  end if;
end$$;
