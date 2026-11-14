"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (p)=>fs.readFileSync(p,"utf8");
const strip = s=>s.replace(/^\s*--.*$/gm,"").replace(/^\s*(?:BEGIN|COMMIT);\s*$/gmi,"").trim();
test("production migration mirrors reviewed eight-policy optimization exactly",()=>{
 const fromRepo=strip(read("supabase/rls-initplan-review.sql"));
 const archived=strip(read("supabase/migrations/20261114084129_optimize_eight_rls_initplans_20261114.sql"));
 assert.equal(archived,fromRepo);
 assert.equal((archived.match(/ALTER POLICY /g)||[]).length,8);
 assert.doesNotMatch(archived,/\b(?:CREATE INDEX|DROP INDEX|GRANT|REVOKE|UPDATE\s|DELETE\s|INSERT\s|DISABLE ROW LEVEL SECURITY)\b/i);
 assert.match(archived,/\(select auth\.uid\(\)\)/);
 assert.match(archived,/\(select auth\.jwt\(\)\)/);
});
