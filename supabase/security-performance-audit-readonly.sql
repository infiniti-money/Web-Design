-- ATELIER HOME / Supabase security and performance snapshot.
-- SELECT-only, no business rows or personal identifiers are returned.
-- Run using an authorized SQL client against the intended environment.
-- Never use these aggregates as a substitute for API-role UAT.
-- Scope: 2026-11-14, follow-up to issue #29.

-- 1. Health baseline. This intentionally does not modify the session.
select current_database() as database_name, current_timestamp as checked_at,
       current_setting('server_version') as postgres_version;

-- 2. Verify effective privileges and hardened role guards for every reviewed RPC.
-- authenticated EXECUTE may be necessary for legitimate Admin/Manager workflows.
select p.oid::regprocedure::text as function_signature,
       p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as owner_name,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as signed_in_can_execute,
       coalesce(array_to_string(p.proconfig,','),'') like '%search_path=%' as pins_search_path,
       position('private.current_staff_role()' in pg_get_functiondef(p.oid))>0
         as checks_authoritative_staff_role
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('care_advance','commercial_action',
                    'edit_inquiry_care_note','generate_task_due_notifications')
order by function_signature;

-- 3. Inspect 8 precisely scoped RLS policy signatures before any optimization.
-- A false result for app_metadata or an unexpected role requires manual review.
select tablename,policyname,cmd,roles,
       position('auth.uid()' in coalesce(qual,'')||coalesce(with_check,''))>0
         as uses_auth_uid,
       position('app_metadata' in coalesce(qual,'')||coalesce(with_check,''))>0
         as checks_app_metadata,
       position('user_metadata' in coalesce(qual,'')||coalesce(with_check,''))>0
         as unsafe_user_metadata_reference
from pg_policies
where schemaname='public'
  and policyname in ('care_workflow_read','care_workflow_events_read',
    'quotes_staff_read','quote_versions_staff_read','contracts_staff_read',
    'commercial_audit_read','staff_notification_read','staff_notification_mark_read')
order by tablename,policyname;

-- 4. Private internal tables must remain inaccessible to public API roles.
select c.oid::regclass::text as internal_table,
       has_table_privilege('anon',c.oid,'SELECT') as anon_can_read,
       has_table_privilege('authenticated',c.oid,'SELECT') as signed_in_can_read
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='private' and c.relname in ('inquiry_rate_limits','payos_pilot_policy')
  and c.relkind in ('r','p')
order by internal_table;

-- 5. Non-identifying activity and storage estimates, not a mandate for indexes.
select relname as table_name,n_live_tup as estimated_live_rows,
       n_dead_tup as estimated_dead_rows,seq_scan,idx_scan,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size
from pg_stat_user_tables
where schemaname='public' and relname in (
  'care_workflow_events','commercial_audit','customer_contracts',
  'customer_quote_versions','customer_quotes','delivery_catalog_links',
  'delivery_workspaces','inquiry_care_note_revisions','inquiry_care_task_events',
  'payos_receipts','staff_notifications')
order by table_name;

-- 6. Aggregate Auth role readiness only; never return emails or user IDs.
select coalesce(raw_app_meta_data->>'role','(no app role)') as app_role,
       count(*) as user_count
from auth.users
group by 1
order by 1;
