-- ============================================================================
-- 014_admin_analytics.sql
-- PostgREST (what supabase-js talks to) can't express GROUP BY / aggregate
-- queries directly, so analytics live behind small, admin-only RPCs instead.
-- ============================================================================

create or replace function public.admin_revenue_by_day(p_days integer default 30)
returns table (day date, revenue numeric, order_count integer)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    date_trunc('day', o.placed_at)::date as day,
    coalesce(sum(o.total), 0) as revenue,
    count(*)::integer as order_count
  from public.orders o
  where o.payment_status = 'paid'
    and o.placed_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1;
end;
$$;

revoke execute on function public.admin_revenue_by_day(integer) from public, anon;
grant execute on function public.admin_revenue_by_day(integer) to authenticated;

create or replace function public.admin_top_products(p_days integer default 30, p_limit integer default 10)
returns table (product_id uuid, product_name text, units_sold bigint, revenue numeric)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    oi.product_id,
    oi.product_name,
    sum(oi.quantity)::bigint as units_sold,
    sum(oi.subtotal) as revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.payment_status = 'paid'
    and o.placed_at >= now() - (p_days || ' days')::interval
  group by oi.product_id, oi.product_name
  order by revenue desc
  limit p_limit;
end;
$$;

revoke execute on function public.admin_top_products(integer, integer) from public, anon;
grant execute on function public.admin_top_products(integer, integer) to authenticated;
