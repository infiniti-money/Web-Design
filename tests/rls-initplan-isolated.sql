-- Isolated PostgreSQL 17 only; NEVER execute in Supabase production.
\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database()<>'rls_perf_test' OR to_regclass('auth.users') IS NOT NULL
 THEN RAISE EXCEPTION 'Requires a new rls_perf_test database'; END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claims',true),'')::jsonb
$$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon,authenticated;
CREATE TABLE public.staff_profiles(user_id uuid PRIMARY KEY,role text NOT NULL,active boolean NOT NULL);
GRANT SELECT ON public.staff_profiles TO authenticated;
INSERT INTO public.staff_profiles(user_id,role,active) VALUES
 ('d0a00000-0000-4000-8000-000000000091','admin',true),
 ('d0a00000-0000-4000-8000-000000000092','manager',true),
 ('d0a00000-0000-4000-8000-000000000093','employee',true),
 ('d0a00000-0000-4000-8000-000000000094','manager',false),
 ('d0a00000-0000-4000-8000-000000000095','employee',true);
CREATE TABLE public.care_workflow(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.care_workflow ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.care_workflow TO authenticated;
INSERT INTO public.care_workflow DEFAULT VALUES;
CREATE TABLE public.care_workflow_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.care_workflow_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.care_workflow_events TO authenticated;
INSERT INTO public.care_workflow_events DEFAULT VALUES;
CREATE TABLE public.customer_quotes(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.customer_quotes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.customer_quotes TO authenticated;
INSERT INTO public.customer_quotes DEFAULT VALUES;
CREATE TABLE public.customer_quote_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.customer_quote_versions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.customer_quote_versions TO authenticated;
INSERT INTO public.customer_quote_versions DEFAULT VALUES;
CREATE TABLE public.customer_contracts(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.customer_contracts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.customer_contracts TO authenticated;
INSERT INTO public.customer_contracts DEFAULT VALUES;
CREATE TABLE public.commercial_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.commercial_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.commercial_audit TO authenticated;
INSERT INTO public.commercial_audit DEFAULT VALUES;
CREATE POLICY care_workflow_read ON public.care_workflow FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active AND s.role IN ('admin','manager')
 AND s.role=(auth.jwt()->'app_metadata'->>'role')));
CREATE POLICY care_workflow_events_read ON public.care_workflow_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active AND s.role IN ('admin','manager')
 AND s.role=(auth.jwt()->'app_metadata'->>'role')));
CREATE POLICY quotes_staff_read ON public.customer_quotes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active AND s.role IN ('admin','manager')
 AND s.role=(auth.jwt()->'app_metadata'->>'role')));
CREATE POLICY quote_versions_staff_read ON public.customer_quote_versions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active AND s.role IN ('admin','manager')
 AND s.role=(auth.jwt()->'app_metadata'->>'role')));
CREATE POLICY contracts_staff_read ON public.customer_contracts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active AND s.role IN ('admin','manager')
 AND s.role=(auth.jwt()->'app_metadata'->>'role')));
CREATE POLICY commercial_audit_read ON public.commercial_audit FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active AND s.role IN ('admin','manager')
 AND s.role=(auth.jwt()->'app_metadata'->>'role')));
CREATE TABLE public.staff_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recipient_id uuid NOT NULL,read_at timestamptz);
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE(read_at) ON public.staff_notifications TO authenticated;
CREATE POLICY staff_notification_read ON public.staff_notifications FOR SELECT TO authenticated USING (recipient_id=auth.uid() AND EXISTS (
 SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=auth.uid()
 AND sp.active AND sp.role=(auth.jwt()->'app_metadata'->>'role')));
CREATE POLICY staff_notification_mark_read ON public.staff_notifications FOR UPDATE TO authenticated
 USING (recipient_id=auth.uid() AND EXISTS (
 SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=auth.uid()
 AND sp.active AND sp.role=(auth.jwt()->'app_metadata'->>'role'))) WITH CHECK (recipient_id=auth.uid());
INSERT INTO public.staff_notifications(recipient_id) VALUES ('d0a00000-0000-4000-8000-000000000093'),('d0a00000-0000-4000-8000-000000000092');
CREATE OR REPLACE FUNCTION public._role_assert(p_expected_business integer,p_expected_notifications integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE n integer; all_rows integer;
BEGIN
 SELECT count(*) INTO all_rows FROM (
  SELECT id FROM public.care_workflow UNION ALL
  SELECT id FROM public.care_workflow_events UNION ALL
  SELECT id FROM public.customer_quotes UNION ALL
  SELECT id FROM public.customer_quote_versions UNION ALL
  SELECT id FROM public.customer_contracts UNION ALL
  SELECT id FROM public.commercial_audit
 ) x;
 SELECT count(*) INTO n FROM public.staff_notifications;
 IF all_rows<>p_expected_business OR n<>p_expected_notifications THEN
   RAISE EXCEPTION 'RLS mismatch: business %, notifications %, expected business %, notifications %',
     all_rows,n,p_expected_business,p_expected_notifications;
 END IF;
END $$;
GRANT EXECUTE ON FUNCTION public._role_assert(integer,integer) TO authenticated;
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
\ir ../supabase/rls-initplan-review.sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000092","app_metadata":{"role":"manager"}}',false);
SELECT public._role_assert(6,1);
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000091","app_metadata":{"role":"admin"}}',false);
SELECT public._role_assert(6,0);
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000093","app_metadata":{"role":"employee"}}',false);
SELECT public._role_assert(0,1);
-- A user cannot change notification ownership, and profile state must control access.
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000094","app_metadata":{"role":"manager"}}',false);
SELECT public._role_assert(0,0);
SELECT set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000095","app_metadata":{"role":"manager"}}',false);
SELECT public._role_assert(0,0);
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM pg_policies
     WHERE schemaname='public'
       AND policyname IN ('care_workflow_read','care_workflow_events_read','quotes_staff_read','quote_versions_staff_read','contracts_staff_read','commercial_audit_read','staff_notification_read','staff_notification_mark_read'))<>8
 THEN RAISE EXCEPTION 'Expected eight retained RLS policies';END IF;
END $$;
SELECT 'PASS: eight RLS initplan changes retain Admin/Manager/Employee, inactive and role-mismatch behavior in isolated DB' AS result;
