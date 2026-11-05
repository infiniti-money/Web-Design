#!/usr/bin/env bash
# In CI only. NEVER supply a production URL or credentials to this script.
set -euo pipefail
: "${PGHOST:?requires isolated Postgres}"
: "${PGUSER:?requires isolated Postgres}"
if [[ "$PGHOST" != "127.0.0.1" || "$PGUSER" != "ci" ]]; then
  echo "This rehearsal must run against the isolated CI service" >&2
  exit 1
fi
source_db="rehearsal_source"
target_db="rehearsal_restored"
dump="$(mktemp -t atelier-synthetic-rehearsal-XXXXXX.dump)"
trap 'rm -f "$dump"' EXIT

psql -d "$source_db" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA private;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE public.customer_quote_versions (
  id integer PRIMARY KEY,
  quote_id integer NOT NULL,
  content jsonb NOT NULL
);
INSERT INTO public.customer_quote_versions(id,quote_id,content) VALUES
(1,11,'{"total":105000,"status":"approved"}'),
(2,11,'{"total":118000,"status":"draft"}');
SQL

# Separate logical databases; no production credentials, no sensitive uploads.
pg_dump -d "$source_db" --format=custom --no-owner --no-acl --file="$dump"
createdb "$target_db"
pg_restore -d "$target_db" --exit-on-error --no-owner --no-acl "$dump"

sql="SELECT count(*) || ':' || md5(string_agg(id::text || ':' || content::text, '|' ORDER BY id)) FROM public.customer_quote_versions;"
before="$(psql -d "$source_db" -At -c "$sql")"
after="$(psql -d "$target_db" -At -c "$sql")"
[[ "$before" == "$after" ]] || { echo "Restore integrity mismatch" >&2; exit 1; }
[[ "$after" == 2:* ]] || { echo "Expected two restored fixture rows" >&2; exit 1; }
psql -d "$target_db" -v ON_ERROR_STOP=1 -f supabase/migrations/20261105093000_quote_version_immutability.sql
psql -d "$target_db" -v ON_ERROR_STOP=1 <<'SQL'
DO $test$
DECLARE blocked_update boolean := false; blocked_delete boolean := false;
BEGIN
  BEGIN
    UPDATE public.customer_quote_versions SET content='{"tampered":true}' WHERE id=1;
  EXCEPTION WHEN check_violation THEN blocked_update := true;
  END;
  BEGIN
    DELETE FROM public.customer_quote_versions WHERE id=2;
  EXCEPTION WHEN check_violation THEN blocked_delete := true;
  END;
  IF NOT blocked_update OR NOT blocked_delete THEN
    RAISE EXCEPTION 'QUOTE_IMMUTABILITY_NOT_ENFORCED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.customer_quote_versions'::regclass
      AND tgname='commercial_quote_version_append_only' AND tgenabled='O'
  ) THEN
    RAISE EXCEPTION 'QUOTE_TRIGGER_NOT_ACTIVE';
  END IF;
END;
$test$;
INSERT INTO public.customer_quote_versions(id,quote_id,content)
VALUES (3,11,'{"total":125000,"status":"draft"}');
SQL
test "$(psql -d "$target_db" -At -c 'select count(*) from public.customer_quote_versions')" = "3"
echo "PASS: synthetic dump/restore integrity, isolated quote guard, append allowed, update/delete rejected."
echo "NOTE: This does NOT verify production backup, Auth or Storage restore."
