-- ATELIER HOME / Production performance acceptance baseline (2026-11-14).
-- Query-only audit: no DDL, DML, role changes, RPC invocation or test fixtures.
-- EXPLAIN ANALYZE below executes SELECT only. Its times are single-run DB timings,
-- not HTTP latencies or proof of RLS behavior under a real signed-in user.
-- Do not run plans against write statements or substitute this for staging load tests.

-- Database footprint; aggregate counts only, no PII.
SELECT current_database() AS db_name,
       pg_size_pretty(pg_database_size(current_database())) AS db_size,
       (SELECT count(*) FROM pg_stat_user_tables WHERE schemaname='public') AS public_tables;

-- Backup acceptance fingerprints; compare against a separately restored database.
-- Counts alone do not prove backup integrity, Auth credentials or Storage binaries.
SELECT 'auth.users' AS object_name,count(*) AS row_count FROM auth.users
UNION ALL SELECT 'auth.identities',count(*) FROM auth.identities
UNION ALL SELECT 'storage.buckets',count(*) FROM storage.buckets
UNION ALL SELECT 'storage.objects',count(*) FROM storage.objects
UNION ALL SELECT 'public.projects',count(*) FROM public.projects
UNION ALL SELECT 'public.inquiries',count(*) FROM public.inquiries
UNION ALL SELECT 'public.customer_quotes',count(*) FROM public.customer_quotes
UNION ALL SELECT 'public.customer_quote_versions',count(*) FROM public.customer_quote_versions
UNION ALL SELECT 'public.customer_contracts',count(*) FROM public.customer_contracts
UNION ALL SELECT 'public.staff_profiles',count(*) FROM public.staff_profiles
ORDER BY object_name;

-- Table access trends since the most recent statistics reset.
SELECT relname,n_live_tup,n_dead_tup,seq_scan,idx_scan,
       pg_total_relation_size(relid) AS total_bytes
FROM pg_stat_user_tables
WHERE schemaname='public' AND relname IN
  ('customer_quotes','customer_contracts','inquiry_care_task_events',
   'delivery_workspaces','staff_notifications')
ORDER BY relname;

-- Current authenticated account types: aggregate-only, no accounts exposed.
SELECT coalesce(raw_app_meta_data->>'role','(no app role)') AS app_role,
       count(*) AS user_count FROM auth.users GROUP BY 1 ORDER BY 1;

-- Safe representative read paths; never expose row identifiers or PII.
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) FROM public.customer_quotes q
WHERE q.inquiry_id IN (SELECT id FROM public.inquiries ORDER BY id LIMIT 1);

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) FROM public.customer_contracts c
WHERE c.quote_id IN (SELECT id FROM public.customer_quotes ORDER BY id LIMIT 1);

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) FROM public.inquiry_care_task_events e
WHERE e.inquiry_id IN (SELECT id FROM public.inquiries ORDER BY id LIMIT 1);

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) FROM public.delivery_workspaces d
WHERE d.portfolio_project_id IN (SELECT id FROM public.projects ORDER BY id LIMIT 1);

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) FROM public.staff_notifications n
WHERE n.recipient_id IN (SELECT user_id FROM public.staff_profiles ORDER BY user_id LIMIT 1);
