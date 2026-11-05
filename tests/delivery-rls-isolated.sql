-- Isolated PostgreSQL 17 fixture. NEVER run against the production database.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TABLE public.staff_profiles(user_id uuid PRIMARY KEY,role text NOT NULL,active boolean NOT NULL);
CREATE TABLE public.inquiries(id uuid PRIMARY KEY);
CREATE TABLE public.projects(id uuid PRIMARY KEY);
CREATE TABLE public.catalog_items(id uuid PRIMARY KEY,published boolean NOT NULL);
CREATE TABLE public.inquiry_care_tasks(id uuid PRIMARY KEY,inquiry_id uuid NOT NULL REFERENCES public.inquiries(id));
CREATE FUNCTION private.current_staff_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT sp.role FROM public.staff_profiles sp WHERE sp.user_id=(SELECT auth.uid()) AND sp.active
$$;
REVOKE ALL ON FUNCTION private.current_staff_role() FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private,auth TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_staff_role(),auth.uid() TO authenticated;
GRANT SELECT ON public.staff_profiles,public.inquiries,public.projects,public.catalog_items,public.inquiry_care_tasks TO authenticated;
INSERT INTO public.staff_profiles VALUES
 ('11111111-1111-4111-8111-111111111111','admin',true),
 ('22222222-2222-4222-8222-222222222222','manager',true),
 ('33333333-3333-4333-8333-333333333333','employee',true);
INSERT INTO public.inquiries VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO public.projects VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.catalog_items VALUES
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',true),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',false);
INSERT INTO public.inquiry_care_tasks VALUES
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('99999999-9999-4999-8999-999999999999','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
\ir ../supabase/delivery-workspaces-staging.sql

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.delivery_workspaces(id,inquiry_id,title,stage,owner_user_id,created_by)
VALUES ('88888888-8888-4888-8888-888888888888','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'Công trình test tách biệt','planning','33333333-3333-4333-8333-333333333333',
 '11111111-1111-4111-8111-111111111111');
INSERT INTO public.delivery_catalog_links(workspace_id,catalog_item_id,quantity)
VALUES ('88888888-8888-4888-8888-888888888888','dddddddd-dddd-4ddd-8ddd-dddddddddddd',2);
INSERT INTO public.delivery_task_links(workspace_id,task_id)
VALUES ('88888888-8888-4888-8888-888888888888','ffffffff-ffff-4fff-8fff-ffffffffffff');
DO $verify$
DECLARE rejected_draft boolean:=false; rejected_wrong_task boolean:=false; rejected_customer_change boolean:=false;
BEGIN
 BEGIN
   INSERT INTO public.delivery_catalog_links(workspace_id,catalog_item_id)
     VALUES ('88888888-8888-4888-8888-888888888888','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
 EXCEPTION WHEN insufficient_privilege THEN rejected_draft:=true;
 END;
 BEGIN
   INSERT INTO public.delivery_task_links(workspace_id,task_id)
     VALUES ('88888888-8888-4888-8888-888888888888','99999999-9999-4999-8999-999999999999');
 EXCEPTION WHEN insufficient_privilege THEN rejected_wrong_task:=true;
 END;
 BEGIN
   UPDATE public.delivery_workspaces SET inquiry_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
     WHERE id='88888888-8888-4888-8888-888888888888';
 EXCEPTION WHEN check_violation THEN rejected_customer_change:=true;
 END;
 IF NOT rejected_draft OR NOT rejected_wrong_task OR NOT rejected_customer_change THEN
   RAISE EXCEPTION 'DELIVERY_SCOPE_GUARD_FAILED';
 END IF;
END $verify$;
UPDATE public.delivery_workspaces SET stage='design' WHERE id='88888888-8888-4888-8888-888888888888';
DO $verify$ BEGIN
 IF (SELECT version FROM public.delivery_workspaces WHERE id='88888888-8888-4888-8888-888888888888')<>2
 THEN RAISE EXCEPTION 'VERSION_NOT_INCREMENTED'; END IF;
END $verify$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $verify$ BEGIN
 IF (SELECT count(*) FROM public.delivery_workspaces)<>1 THEN RAISE EXCEPTION 'MANAGER_CANNOT_READ'; END IF;
END $verify$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
DO $verify$
DECLARE denied boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.delivery_workspaces)<>0 THEN RAISE EXCEPTION 'EMPLOYEE_READ_EXPOSED'; END IF;
 BEGIN
 INSERT INTO public.delivery_workspaces(inquiry_id,title)
 VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Test employee must fail');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'EMPLOYEE_WRITE_ALLOWED'; END IF;
END $verify$;
RESET ROLE;
UPDATE public.staff_profiles SET active=false WHERE user_id='22222222-2222-4222-8222-222222222222';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $verify$ BEGIN
 IF (SELECT count(*) FROM public.delivery_workspaces)<>0 THEN RAISE EXCEPTION 'REVOKED_MANAGER_READ_ALLOWED'; END IF;
END $verify$;
RESET ROLE;
SELECT 'PASS: scoped Admin/Manager, Employee denied, role revoked, catalog publish, CRM task links, version' AS result;