const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const migration=fs.readFileSync("supabase/migrations/20261105093000_quote_version_immutability.sql","utf8");
const postgresRegression=fs.readFileSync("tests/quote-version-guard-isolated.sql","utf8");

test("PR #18 version-lock carry-forward is scoped to a private trigger, not the live commercial RPC",()=>{
  assert.match(migration,/create or replace function private\.commercial_quote_version_append_only\(\)/i);
  assert.match(migration,/security invoker/i);
  assert.match(migration,/set search_path\s*=\s*''/i);
  assert.match(migration,/revoke all on function private\.commercial_quote_version_append_only\(\)[\s\S]*from public, anon, authenticated/i);
  assert.match(migration,/before update or delete on public\.customer_quote_versions/i);
  assert.match(migration,/QUOTE_VERSION_IMMUTABLE/);
  assert.doesNotMatch(migration,/create or replace function public\.commercial_action/i);
  assert.doesNotMatch(migration,/\b(update|delete|truncate)\s+public\.customer_quote_versions\b/i);
});

test("isolated PostgreSQL regression tests both roles, reapplication, insert, update, delete and rollback",()=>{
  assert.match(postgresRegression,/\bBEGIN;/);
  assert.match(postgresRegression,/\bROLLBACK;/);
  assert.equal((postgresRegression.match(/\\ir\s+\.\.\/supabase\/migrations\/20261105093000_quote_version_immutability.sql/g)||[]).length,2);
  for(const item of ["OWNER_UPDATE_WAS_ALLOWED","OWNER_DELETE_WAS_ALLOWED","AUTH_UPDATE_WAS_ALLOWED","AUTH_DELETE_WAS_ALLOWED","SNAPSHOT_HISTORY_CHANGED"])
    assert.ok(postgresRegression.includes(item),item);
});
