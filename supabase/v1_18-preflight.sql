-- Tân Design v1.18 preflight, READ ONLY. Run against existing project only.
-- Confirm project ref mswiegltusllzvuavjdh in Supabase dashboard before running.
select current_database() as database_name,current_user as database_role,now() as checked_at;
select
 (select count(*) from public.inquiries) as inquiries,
 (select count(*) from public.inquiry_care_tasks) as care_tasks,
 (select count(*) from public.customer_quotes) as quotes,
 (select count(*) from public.customer_quote_versions) as quote_versions,
 (select count(*) from public.customer_contracts) as contracts,
 (select count(*) from public.commercial_audit) as audit_events;
select
 (select count(*) from public.customer_contracts c where c.quote_id is null or c.quote_version_id is null) as contracts_missing_quote,
 (select count(*) from public.customer_contracts c left join public.customer_quotes q on q.id=c.quote_id where q.id is null or q.inquiry_id<>c.inquiry_id) as contracts_wrong_customer,
 (select count(*) from public.customer_contracts c left join public.customer_quotes q on q.id=c.quote_id where q.approved_version_id is distinct from c.quote_version_id) as contracts_wrong_approved_version,
 (select count(*) from public.customer_quote_versions v left join public.customer_quotes q on q.id=v.quote_id where q.id is null) as orphan_quote_versions;
select n.nspname as schema_name,p.proname as function_name,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as auth_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('commercial_action','commercial_quote_totals','commercial_quote_version_append_only')
order by p.proname;
-- STOP if any mismatch counts above are nonzero.
-- This script is not a backup: arrange an independently restorable PostgreSQL dump first.
