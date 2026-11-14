"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const sql = fs.readFileSync("supabase/production-performance-baseline-readonly.sql","utf8");
const cleaned = sql.replace(/^\s*--.*$/gm,"");
const statements = cleaned.split(";").map(x=>x.trim()).filter(Boolean);

test("production baseline permits only SELECT and EXPLAIN SELECT",()=>{
  assert.equal(statements.length,9,"expected four aggregates and five SELECT plans");
  let explainCount=0;
  for(const statement of statements){
    assert.match(statement,/^(?:SELECT\s|EXPLAIN\s*\(ANALYZE,\s*BUFFERS,\s*FORMAT JSON\)\s*SELECT\s)/i);
    if(/^EXPLAIN/i.test(statement))explainCount++;
    assert.doesNotMatch(statement,/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COPY|CALL|PERFORM|EXECUTE|VACUUM|SET\s+ROLE|pg_sleep)\b/i);
  }
  assert.equal(explainCount,5);
});
test("backup comparison includes Auth identities and Storage metadata without raw records",()=>{
  for(const table of ["auth.users","auth.identities","storage.buckets","storage.objects",
    "public.projects","public.inquiries","public.customer_quotes",
    "public.customer_quote_versions","public.customer_contracts","public.staff_profiles"]){
    assert.ok(cleaned.includes(table),"missing "+table);
  }
  assert.doesNotMatch(cleaned,/\b(?:email|phone|encrypted_password|access_token|refresh_token)\b/i);
});
