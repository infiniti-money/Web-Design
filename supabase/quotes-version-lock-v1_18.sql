-- v1.18.0 — Invariant: quote versions are append-only snapshots.
-- Revision means inserting a new version via commercial_action, not editing history.
-- Applies to new and historical versions, including the one approved by Admin.
-- No existing data is updated or deleted.
create or replace function public.commercial_quote_version_append_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $guard$
begin
  raise exception 'QUOTE_VERSION_IMMUTABLE'
    using errcode = '23514',
          hint = 'Create a new quote version instead of changing an existing snapshot';
end;
$guard$;
revoke all on function public.commercial_quote_version_append_only() from public, anon, authenticated;
drop trigger if exists commercial_quote_version_append_only on public.customer_quote_versions;
create trigger commercial_quote_version_append_only
before update or delete on public.customer_quote_versions
for each row execute function public.commercial_quote_version_append_only();
