"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const app=require("../assets/uat-readiness.js");
function fake({role="admin",profileRole=role,active=true}={}){
 const state={role,profileRole,active,userId:"fixture-u1",calls:[],revoked:false};
 const db={
  auth:{async getUser(){state.calls.push("auth");return{data:{user:state.role?
    {id:state.userId,app_metadata:{role:state.role}}:null}};}},
  from(table){state.calls.push(table);assert.equal(table,"staff_profiles");
   const q={select(fields){assert.equal(fields,"role,active");return q;},
    eq(k,id){assert.equal(k,"user_id");assert.equal(id,state.userId);return q;},
    async single(){return{data:{role:state.profileRole,active:state.active}};}};
   return q;}
 };
 return{state,db};
}
test("Real Auth + app_metadata and live active staff profile gate admin only",async()=>{
 const f=fake();assert.deepEqual(await app.authorize(f.db),{id:"fixture-u1",role:"admin"});
 assert.deepEqual(f.state.calls,["auth","staff_profiles"]);
 for(const opt of [{role:"employee"},{role:"manager"},{role:null},
   {role:"admin",profileRole:"manager"},{role:"admin",active:false}]){
   const s=fake(opt);await assert.rejects(()=>app.authorize(s.db),/UAT_FORBIDDEN/);
   if(opt.role!=="admin")assert.equal(s.state.calls.includes("staff_profiles"),false);
 }
});
test("Evidence export can never certify real production UAT",()=>{
 const selected=app.GATES.map(g=>g.id);
 const result=app.makeEvidence(selected,new Date("2026-11-14T09:00:00.000Z"));
 assert.equal(result.declared_count,8);
 assert.equal(result.production_uat,"NOT_CERTIFIED");
 assert.equal(result.verification,"OPERATOR_DECLARATION_ONLY");
 assert.deepEqual(result.declared_gates,[...selected].sort());
 assert.deepEqual(app.makeEvidence(["employee","employee","invalid"]).declared_gates,["employee"]);
 assert.throws(()=>app.makeEvidence([], "not-a-date"),/UAT_DATE_INVALID/);
});
test("UAT HTML is private, Windows packaged and advertised only to admin",()=>{
 const html=fs.readFileSync("uat.html","utf8");
 const admin=fs.readFileSync("assets/admin-workspace.js","utf8");
 const appSrc=fs.readFileSync("assets/uat-readiness.js","utf8");
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/id="uat-panel" hidden/);
 assert.match(html,/assets\/uat-readiness\.js/);
 assert.match(html,/khai báo thủ công, chưa được xác minh/);
 assert.match(admin,/\["uat.html","Trung tâm nghiệm thu","admin"\]/);
 assert.match(fs.readFileSync("desktop/security.cjs","utf8"),/"uat.html"/);
 assert.match(fs.readFileSync("desktop/prepare-ui.cjs","utf8"),/"uat.html"/);
 assert.match(fs.readFileSync("scripts/build-pages.cjs","utf8"),/"uat.html"/);
 for(const x of ["SIGNED_OUT","TOKEN_REFRESHED","USER_UPDATED","offline","visibilitychange"])
   assert.ok(appSrc.includes(x),"missing secure invalidation "+x);
 assert.doesNotMatch(appSrc,/\b(?:client|db)\.rpc\(/);
 assert.doesNotMatch(appSrc,/\b(?:client|db)\.from\([^)]*\)\s*\.\s*(?:insert|update|delete|upsert)\(/);
 assert.doesNotMatch(appSrc,/localStorage/);
});
