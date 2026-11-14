"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const shell=fs.readFileSync("assets/admin-workspace.js","utf8");
const style=fs.readFileSync("assets/admin-workspace.css","utf8");
const reports=fs.readFileSync("reports-advanced.html","utf8");
const prepared=fs.readFileSync("desktop/prepare-ui.cjs","utf8");
const sql=fs.readFileSync("supabase/rls-initplan-review.sql","utf8");
test("Web and packaged Windows share one role-aware workspace and persistent appearance",()=>{
 assert.match(prepared,/fs\.cpSync\(path\.join\(root,"assets"\)/);
 for(const k of ["workspace-modules","workspace-module","workspace-theme-dark","workspace-theme-select","workspace-refresh","reports-advanced.html"]){
   assert.ok(shell.includes(k)||style.includes(k),"missing "+k);
 }
 assert.match(shell,/level\[profile\.role\]<level\[required\]/);
 assert.match(shell,/document\.querySelector\("\.workspace-modules"\)\?\.remove\(\)/);
 assert.match(shell,/preferences\.write\("theme",theme\.value\)/);
 assert.match(shell,/prefers-color-scheme: dark/);
 assert.match(style,/@media\(max-width:760px\)/);
 assert.match(style, /prefers-reduced-motion:reduce/);
});
test("Advanced manager report no longer renders employee-only view",()=>{
 assert.match(reports,/!\["admin","manager"\]\.includes\(sp\.role\)/);
 assert.match(reports,/sp\.role!==user\.app_metadata\?\.role/);
});
test("Staged RLS initplan optimization cannot grant roles, disable RLS or mutate rows",()=>{
 assert.equal((sql.match(/ALTER POLICY /g)||[]).length,8);
 assert.match(sql,/BEGIN;/);assert.match(sql,/COMMIT;/);
 for(const table of ["care_workflow","care_workflow_events","customer_quotes","customer_quote_versions","customer_contracts","commercial_audit","staff_notifications"]){
   assert.ok(sql.includes("public."+table),table);
 }
 assert.match(sql,/\(select auth\.uid\(\)\)/);
 assert.match(sql,/\(select auth\.jwt\(\)\)/);
 assert.doesNotMatch(sql,/\b(?:GRANT|REVOKE|DISABLE ROW LEVEL SECURITY|DROP POLICY|TRUNCATE|DELETE FROM|INSERT INTO|UPDATE public)\b/i);
});
