"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (path)=>fs.readFileSync(path,"utf8").replace(/^\\s*--.*$/gm,"");
const opt=read("supabase/rls-initplan-review.sql");
const rollback=read("supabase/rls-initplan-rollback.sql");
const candidate=read("supabase/index-candidates-review.sql");
const undoIndex=read("supabase/index-candidates-rollback.sql");
const policyNames=["care_workflow_read","care_workflow_events_read",
  "quotes_staff_read","quote_versions_staff_read","contracts_staff_read",
  "commercial_audit_read","staff_notification_read","staff_notification_mark_read"];
test("Eight RLS policies have a matching reversible rollback, without expanding access",()=>{
  for(const sql of [opt,rollback]){
    assert.equal((sql.match(/ALTER POLICY /g)||[]).length,8);
    for(const name of policyNames)assert.ok(sql.includes("ALTER POLICY "+name+" ON public."),"missing "+name);
    assert.match(sql,/\bBEGIN;/);
    assert.match(sql,/\bCOMMIT;/);
    assert.doesNotMatch(sql,/\b(?:GRANT|REVOKE|DISABLE ROW LEVEL SECURITY|DROP POLICY|CREATE POLICY|TRUNCATE)\b/i);
    assert.match(sql,/s\.active/);
    assert.match(sql,/sp\.active/);
    assert.match(sql,/app_metadata/);
    assert.doesNotMatch(sql,/user_metadata/);
    assert.match(sql,/WITH CHECK \(recipient_id=/);
  }
  assert.match(opt,/\(select auth\.uid\(\)\)/i);
  assert.match(opt,/\(select auth\.jwt\(\)\)/i);
  assert.doesNotMatch(rollback,/\(select auth\.(?:uid|jwt)\(\)\)/i);
});
test("Index candidates are non-deployed, distinct and exactly reversible",()=>{
  const re=/CREATE INDEX CONCURRENTLY IF NOT EXISTS\s+(\w+)/g;
  const names=[...candidate.matchAll(re)].map(m=>m[1]);
  assert.equal(names.length,3);
  assert.equal(new Set(names).size,3);
  for(const name of names)assert.ok(undoIndex.includes("DROP INDEX CONCURRENTLY IF EXISTS public."+name+";"));
  assert.equal((undoIndex.match(/DROP INDEX CONCURRENTLY IF EXISTS/g)||[]).length,3);
  for(const sql of [candidate,undoIndex]) {
    assert.doesNotMatch(sql,/\b(?:CREATE POLICY|ALTER POLICY|DELETE FROM|UPDATE\s+public\.|TRUNCATE|GRANT|REVOKE|DROP TABLE)\b/i);
    assert.doesNotMatch(sql,/^\s*(?:BEGIN|COMMIT);/mi);
  }
  assert.doesNotMatch(candidate,/\b(?:service_role|auth.users|auth.identities)\b/i);
});
test("CI runs only against an isolated fixture, never deploys the review SQL",()=>{
  const yaml=read(".github/workflows/validate.yml");
  assert.match(yaml,/CREATE DATABASE rls_perf_test/);
  assert.match(yaml,/tests\/rls-initplan-isolated\.sql/);
  assert.match(yaml,/tests\/rls-initplan-rollback-isolated\.sql/);
  assert.doesNotMatch(yaml,/\b(?:supabase db push|supabase migration up)\b/i);
  const isolation=read("tests/rls-initplan-rollback-isolated.sql");
  assert.match(isolation,/current_database\(\)<>'rls_perf_test'/);
});
