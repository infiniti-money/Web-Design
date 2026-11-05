-- PR #18 carry-forward for the current v1.20 schema.
-- Preserve the original data and current commercial_action RPC.
-- Apply only after a verified, restorable backup and an independent staging test.
-- A revised quote must always INSERT a new version, never overwrite history.
CREATE OR REPLACE FUNCTION private.commercial_quote_version_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $guard$
BEGIN
  RAISE EXCEPTION 'QUOTE_VERSION_IMMUTABLE'
    USING ERRCODE = '23514',
          HINT = 'Create a new quote version via commercial_action instead of editing history';
END;
$guard$;

REVOKE ALL ON FUNCTION private.commercial_quote_version_append_only()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS commercial_quote_version_append_only
  ON public.customer_quote_versions;
CREATE TRIGGER commercial_quote_version_append_only
  BEFORE UPDATE OR DELETE ON public.customer_quote_versions
  FOR EACH ROW EXECUTE FUNCTION private.commercial_quote_version_append_only();
