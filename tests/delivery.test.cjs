"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const {summarize,authorize}=require("../assets/delivery.js");
test("Deadlines exclude completed and paused work, and next seven-day window is bounded",()=>{
 const now=Date.parse("2026-11-05T07:00:00Z"),start=now-3600000,end=now+6*86400000;
 const result=summarize([
   {stage:"planning",due_at:new Date(start).toISOString()},
   {stage:"design",due_at:new Date(end).toISOString()},
   {stage:"construction",due_at:null},
   {stage:"done",due_at:new Date(start).toISOString()},
   {stage:"paused",due_at:new Date(start).toISOString()},
   {stage:"handover",due_at:new Date(now+8*86400000).toISOString()}
 ],now);
 assert.deepEqual(result,{total:6,progress:3,overdue:1,week:1});
});
test("Read-only preflight requires real user, role and active staff profile",async()=>{
 const fake=({role="admin",profileRole=role,active=true,authError=false}={})=>{
   const db={auth:{getUser:async()=>authError?{error:{message:"offline"}}:{data:{user:{id:"actor",app_metadata:{role}}}}},
      from(){return{select(){return this;},eq(){return this;},single:async()=>({data:{role:profileRole,active},error:null})};}};
   return db;
 };
 assert.equal((await authorize(fake({role:"admin"}))).role,"admin");
 assert.equal((await authorize(fake({role:"manager"}))).role,"manager");
 for(const opts of [{role:"employee"},{role:"manager",profileRole:"admin"},{active:false},{authError:true}]){
   assert.equal(await authorize(fake(opts)),null,JSON.stringify(opts));
 }
});
test("Private delivery is a separate noindex route, packaged for web and desktop",()=>{
 const html=fs.readFileSync("delivery.html","utf8");
 assert.match(html,/noindex,nofollow/);
 for(const id of ["delivery-app","delivery-form","delivery-inquiry","delivery-owner","delivery-catalog-add","delivery-task-add","delivery-overdue"])
   assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/assets\/delivery.js/);
 for(const path of ["scripts/build-pages.cjs","desktop/security.cjs","desktop/prepare-ui.cjs","assets/admin-workspace.js"])
   assert.match(fs.readFileSync(path,"utf8"),/delivery\.html/,path);
 const {trustedPage}=require("../desktop/security.cjs");
 assert.equal(trustedPage("atelier://app/delivery.html"),true);
 assert.equal(trustedPage("https://evil.example/delivery.html"),false);
});
test("Proposed schema is RLS gated, respects CRM retention and enforces same-customer task links",()=>{
 const sql=fs.readFileSync("supabase/delivery-workspaces-staging.sql","utf8");
 for(const table of ["delivery_workspaces","delivery_catalog_links","delivery_task_links"]){
   assert.match(sql,new RegExp("ALTER TABLE public\\."+table+" ENABLE ROW LEVEL SECURITY","i"));
   assert.match(sql,new RegExp("REVOKE ALL ON[\\s\\S]*"+table,"i"));
 }
 assert.match(sql,/private\.current_staff_role\(\)/);
 assert.match(sql,/ON DELETE CASCADE, -- honor existing 12-month CRM retention/);
 assert.match(sql,/JOIN public\.inquiry_care_tasks t ON t\.inquiry_id=w\.inquiry_id/);
 assert.match(sql,/delivery_workspace_version_guard/);
 assert.doesNotMatch(sql,/SERVICE_ROLE|sb_secret_/i);
});
