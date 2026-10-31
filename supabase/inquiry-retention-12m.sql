-- ATELIER HOME (Tân Design) retention: 12 calendar months from last recorded contact.
-- If nobody contacted the customer, count from inquiry creation.
-- Legal holds are only set by an authorized administrator for a legitimate obligation.
-- Applied 2026-10-31 to Supabase project mswiegltusllzvuavjdh.
alter table public.inquiries
  add column if not exists last_contacted_at timestamptz;
alter table public.inquiries
  add column if not exists legal_hold_until timestamptz;
create index if not exists idx_inquiries_contacted_at
  on public.inquiries(last_contacted_at);

create schema if not exists private;
revoke all on schema private from PUBLIC, anon, authenticated;

create or replace function private.purge_expired_inquiries()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare removed integer;
begin
  delete from public.inquiries
  where (coalesce(last_contacted_at, created_at) + interval '12 months') <= now()
    and (legal_hold_until is null or legal_hold_until <= now());
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function private.purge_expired_inquiries() from PUBLIC, anon, authenticated;
grant execute on function private.purge_expired_inquiries() to postgres;

-- Automatic cleanup at 02:35 UTC (09:35 Asia/Bangkok / Vietnam) every day.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('atelier-inquiry-retention-12m', '35 2 * * *',
  'select private.purge_expired_inquiries();');

-- Check status without executing or deleting any records:
-- select jobid, jobname, schedule, active from cron.job
-- where jobname='atelier-inquiry-retention-12m';
-- Never log customer PII in Cron job output.
