"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const script=fs.readFileSync("supabase/security-performance-audit-readonly.sql","utf8");

test("Supabase production audit is SELECT-only and cannot mutate data or roles",()=>{
  const statements=script.replace(/^--.*$/gm,"").split(";").map(s=>s.trim()).filter(Boolean);
  assert.equal(statements.length,6);
  for(const statement of statements){
    assert.match(statement,/^select\s/i);
    assert.doesNotMatch(statement,/\b(?:insert|delete|update|alter|create|drop|truncate|grant|revoke|execute|perform|call|set|copy)\b\s/i);
  }
});
test("Audit covers all four privileged RPCs, eight RLS policies and internal-table exposure",()=>{
  for(const name of ["care_advance","commercial_action","edit_inquiry_care_note","generate_task_due_notifications",
    "care_workflow_read","care_workflow_events_read","quotes_staff_read","quote_versions_staff_read",
    "contracts_staff_read","commercial_audit_read","staff_notification_read","staff_notification_mark_read",
    "inquiry_rate_limits","payos_pilot_policy"]){
    assert.ok(script.includes("'"+name+"'"),"missing "+name);
  }
  assert.match(script,/has_function_privilege\('anon'/);
  assert.match(script,/has_function_privilege\('authenticated'/);
  assert.match(script,/private\.current_staff_role/);
  assert.match(script,/user_metadata/);
  assert.match(script,/pg_stat_user_tables/);
});
