-- ============================================================================
-- 010_order_notifications.sql
-- Postgres triggers can't read environment variables or call arbitrary APIs
-- on their own, so this uses the pg_net extension (async HTTP from SQL) to
-- call the send-order-email Edge Function whenever an order's status
-- changes. The Edge Function URL and its shared secret are stored in
-- app_config rather than hardcoded, so they can be set post-deploy without
-- another migration.
-- ============================================================================

create extension if not exists pg_net;

create table if not exists public.app_config (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

alter table public.app_config enable row level security;
-- No policies are defined, so this table is readable/writable only via the
-- service_role key (dashboard SQL editor or a trusted script) — never from
-- the client app. Set it once after deploying the Edge Function:
--
--   insert into public.app_config (key, value) values
--     ('send_order_email_url', 'https://<project-ref>.functions.supabase.co/send-order-email'),
--     ('edge_function_secret', '<a long random string, also set as a secret on the function>')
--   on conflict (key) do update set value = excluded.value;

create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url    from public.app_config where key = 'send_order_email_url';
  select value into v_secret from public.app_config where key = 'edge_function_secret';

  -- If notifications haven't been configured yet, do nothing rather than error.
  if v_url is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_secret, '')
    ),
    body := jsonb_build_object(
      'order_id', new.order_id,
      'status', new.status,
      'note', new.note
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_order_status_change on public.order_status_history;
create trigger trg_notify_order_status_change
  after insert on public.order_status_history
  for each row execute function public.notify_order_status_change();
