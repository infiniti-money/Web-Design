-- Reversible 8-policy regression on isolated PostgreSQL 17 only.
-- Run AFTER tests/rls-initplan-isolated.sql in its existing rls_perf_test DB.
\set ON_ERROR_STOP on
DO $check$
BEGIN
 IF current_database()<>'rls_perf_test' OR to_regclass('auth.users') IS NOT NULL
 THEN RAISE EXCEPTION 'Only rls_perf_test synthetic database is allowed'; END IF;
END $check$;
\ir ../supabase/rls-initplan-rollback.sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000092","app_metadata":{"role":"manager"}}',false);
SELECT public._role_assert(6,1);
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000091","app_metadata":{"role":"admin"}}',false);
SELECT public._role_assert(6,0);
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000093","app_metadata":{"role":"employee"}}',false);
SELECT public._role_assert(0,1);
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000094","app_metadata":{"role":"manager"}}',false);
SELECT public._role_assert(0,0);
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000095","app_metadata":{"role":"manager"}}',false);
SELECT public._role_assert(0,0);
RESET ROLE;
-- Reapply optimization on fixture to verify rollback did not cause schema drift.
\ir ../supabase/rls-initplan-review.sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000093","app_metadata":{"role":"employee"}}',false);
SELECT public._role_assert(0,1);
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000092","app_metadata":{"role":"manager"}}',false);
SELECT public._role_assert(6,1);
RESET ROLE;
SELECT 'PASS: RLS eight-policy rollback and reapply retain five role profiles in isolated PostgreSQL 17' AS result;
