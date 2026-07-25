-- ============================================================================
-- 008_reviews_verified_purchase.sql
-- is_verified_purchase is derived, not client-supplied — a client could
-- otherwise just send true. We stamp it server-side from actual order
-- history whenever a review is inserted or its rating/body is edited.
-- ============================================================================

create or replace function public.set_review_verified_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_verified_purchase := exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = new.user_id
      and oi.product_id = new.product_id
      and o.payment_status = 'paid'
  );
  return new;
end;
$$;

drop trigger if exists trg_review_verified_purchase on public.reviews;
create trigger trg_review_verified_purchase
  before insert or update of rating, title, body on public.reviews
  for each row execute function public.set_review_verified_purchase();
