-- ============================================================================
-- 012_refunds.sql
-- Refunds are recorded here for audit/history. The actual Stripe refund
-- call happens in the admin-refund-order Edge Function (service-key-free —
-- it authenticates as the admin and relies on these RLS policies); this
-- table is just the durable record of what happened.
-- ============================================================================

create table if not exists public.refunds (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  stripe_refund_id    text,
  amount              numeric(12,2) not null check (amount > 0),
  reason              text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_refunds_order_id on public.refunds (order_id);

alter table public.refunds enable row level security;

create policy "refunds_owner_select" on public.refunds
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "refunds_admin_all" on public.refunds
  for all using (public.is_admin()) with check (public.is_admin());

-- A partially_refunded / refunded order should never be double-refunded
-- past its own total; this trigger is the last line of defense even if the
-- Edge Function's own math has a bug.
create or replace function public.guard_refund_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_total   numeric(12,2);
  v_already_refunded numeric(12,2);
begin
  select total into v_order_total from public.orders where id = new.order_id;

  select coalesce(sum(amount), 0) into v_already_refunded
  from public.refunds where order_id = new.order_id;

  if v_already_refunded + new.amount > v_order_total then
    raise exception 'Refund of % would exceed order total of % (already refunded %)',
      new.amount, v_order_total, v_already_refunded;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_refund_amount on public.refunds;
create trigger trg_guard_refund_amount
  before insert on public.refunds
  for each row execute function public.guard_refund_amount();

-- Keep orders.payment_status in sync whenever a refund is recorded.
create or replace function public.apply_refund_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_total       numeric(12,2);
  v_total_refunded    numeric(12,2);
begin
  select total into v_order_total from public.orders where id = new.order_id;

  select coalesce(sum(amount), 0) into v_total_refunded
  from public.refunds where order_id = new.order_id;

  update public.orders
  set payment_status = case
        when v_total_refunded >= v_order_total then 'refunded'
        else 'partially_refunded'
      end,
      status = case
        when v_total_refunded >= v_order_total then 'refunded'
        else status
      end
  where id = new.order_id;

  return new;
end;
$$;

drop trigger if exists trg_apply_refund_status on public.refunds;
create trigger trg_apply_refund_status
  after insert on public.refunds
  for each row execute function public.apply_refund_status();
