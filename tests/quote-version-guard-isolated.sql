-- Run only in a NEW, ISOLATED PostgreSQL 17 CI database.
-- All fixture data and schema changes are rolled back at the end.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA private;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE public.customer_quote_versions (
  id integer PRIMARY KEY,
  quote_id integer NOT NULL,
  version_no integer NOT NULL,
  content jsonb NOT NULL,
  approved boolean NOT NULL DEFAULT false
);
INSERT INTO public.customer_quote_versions(id,quote_id,version_no,content,approved) VALUES
  (1,10,1,'{"total":1000}'::jsonb,false),
  (2,10,2,'{"total":2000}'::jsonb,true);

-- The same migration can be safely applied twice without duplicate triggers.
\ir ../supabase/migrations/20261105093000_quote_version_immutability.sql
\ir ../supabase/migrations/20261105093000_quote_version_immutability.sql

DO $assert$
BEGIN
  IF (SELECT count(*) FROM pg_trigger
      WHERE tgrelid='public.customer_quote_versions'::regclass
        AND tgname='commercial_quote_version_append_only'
        AND tgenabled='O' AND NOT tgisinternal) <> 1 THEN
    RAISE EXCEPTION 'IMMUTABILITY_TRIGGER_NOT_ENABLED_ONCE';
  END IF;
  IF has_function_privilege('anon','private.commercial_quote_version_append_only()','EXECUTE')
    OR has_function_privilege('authenticated','private.commercial_quote_version_append_only()','EXECUTE') THEN
    RAISE EXCEPTION 'GUARD_FUNCTION_EXPOSED_TO_BROWSER_ROLES';
  END IF;
END;
$assert$;

-- Inserting a new version remains permitted.
INSERT INTO public.customer_quote_versions(id,quote_id,version_no,content)
VALUES (3,10,3,'{"total":3000}'::jsonb);

-- Both older and approved snapshots are immutable, even for table owner.
DO $owner_test$
DECLARE v_id integer;
BEGIN
  FOR v_id IN SELECT id FROM public.customer_quote_versions ORDER BY id LOOP
    BEGIN
      UPDATE public.customer_quote_versions SET content='{"tamper":true}' WHERE id=v_id;
      RAISE EXCEPTION 'OWNER_UPDATE_WAS_ALLOWED';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM <> 'QUOTE_VERSION_IMMUTABLE' THEN RAISE; END IF;
    END;
    BEGIN
      DELETE FROM public.customer_quote_versions WHERE id=v_id;
      RAISE EXCEPTION 'OWNER_DELETE_WAS_ALLOWED';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM <> 'QUOTE_VERSION_IMMUTABLE' THEN RAISE; END IF;
    END;
  END LOOP;
END;
$owner_test$;

-- A role with explicit table-write privileges is still blocked by the trigger.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.customer_quote_versions TO authenticated;
SET ROLE authenticated;
DO $auth_test$
BEGIN
  BEGIN
    UPDATE public.customer_quote_versions SET content='{"tamper":true}' WHERE id=2;
    RAISE EXCEPTION 'AUTH_UPDATE_WAS_ALLOWED';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'QUOTE_VERSION_IMMUTABLE' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM public.customer_quote_versions WHERE id=1;
    RAISE EXCEPTION 'AUTH_DELETE_WAS_ALLOWED';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'QUOTE_VERSION_IMMUTABLE' THEN RAISE; END IF;
  END;
END;
$auth_test$;
RESET ROLE;

DO $result$
BEGIN
  IF (SELECT count(*) FROM public.customer_quote_versions) <> 3
     OR (SELECT content->>'total' FROM public.customer_quote_versions WHERE id=1) <> '1000'
     OR (SELECT content->>'total' FROM public.customer_quote_versions WHERE id=2) <> '2000'
     OR (SELECT content->>'total' FROM public.customer_quote_versions WHERE id=3) <> '3000' THEN
    RAISE EXCEPTION 'SNAPSHOT_HISTORY_CHANGED';
  END IF;
END;
$result$;
SELECT 'PASS: immutable historical, approved, and new quote snapshots; INSERT works' AS result;
ROLLBACK;
