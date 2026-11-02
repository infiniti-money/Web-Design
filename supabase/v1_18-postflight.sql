-- Tân Design v1.18 postflight, READ ONLY.
-- Compare counts to a verified preflight snapshot before approving GitHub Pages release.
select (select count(*) from public.inquiries) inquiries,
       (select count(*) from public.inquiry_care_tasks) care_tasks,
       (select count(*) from public.customer_quotes) quotes,
       (select count(*) from public.customer_quote_versions) quote_versions,
       (select count(*) from public.customer_contracts) contracts,
       (select count(*) from public.commercial_audit) audit_events;
select
 to_regprocedure('public.commercial_quote_totals(jsonb)') is not null as server_totals_installed,
 to_regprocedure('public.commercial_quote_version_append_only()') is not null as append_only_guard_installed,
 has_function_privilege('anon','public.commercial_quote_totals(jsonb)','EXECUTE') as anon_totals_execute,
 has_function_privilege('authenticated','public.commercial_quote_totals(jsonb)','EXECUTE') as authenticated_totals_execute,
 has_function_privilege('authenticated','public.commercial_action(text,text,uuid,uuid,text,numeric,jsonb)','EXECUTE') as authenticated_commercial_execute,
 exists(select 1 from pg_trigger t where t.tgrelid='public.customer_quote_versions'::regclass
 and t.tgname='commercial_quote_version_append_only' and t.tgenabled='O') as immutable_version_trigger_enabled;
select
 (select count(*) from public.customer_contracts c join public.customer_quotes q on q.id=c.quote_id
  where q.approved_version_id is distinct from c.quote_version_id) as contracts_wrong_approved_version,
 (select count(*) from public.customer_contracts where quote_id is null or quote_version_id is null) as contracts_without_quote;
-- Expected: both functions + trigger installed; anon/auth EXECUTE on totals false;
-- authenticated commercial RPC true; zero inconsistent contract counts.
