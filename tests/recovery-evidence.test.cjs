"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const tool=require("../scripts/verify-recovery-evidence.cjs");
const counts={
 "auth.users":2,"auth.identities":3,"storage.buckets":0,"storage.objects":0,
 "public.staff_profiles":2,"public.projects":6,"public.inquiries":2,
 "public.customer_quotes":1,"public.customer_quote_versions":1
};
function fixture(){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),"atelier-recovery-test-"));
 const data=path.join(folder,"isolated.fixture.dump");
 fs.writeFileSync(data,Buffer.from("SYNTHETIC-ONLY-NOT-A-REAL-BACKUP"));
 const sha=crypto.createHash("sha256").update(fs.readFileSync(data)).digest("hex");
 const manifest={
  kind:tool.KIND,backup_file:"isolated.fixture.dump",backup_sha256:sha,
  captured_utc:"2026-11-14T08:00:00Z",
  source_counts:{...counts},restored_counts:{...counts},
  isolated_restore:true,auth_service_verified:true,storage_objects_verified:true,
  rto_seconds:9,rpo_seconds:0
 };
 const file=path.join(folder,"local-evidence.json");
 const persist=()=>fs.writeFileSync(file,JSON.stringify(manifest));
 persist();return{folder,data,file,manifest,persist};
}
test("Valid local backup hash and counts still require independent production signoff",async()=>{
 const f=fixture();
 try{
  const result=await tool.verify(f.file);
  assert.equal(result.backup_sha256_matched,true);
  assert.equal(result.row_counts_matched,true);
  assert.equal(result.tables_compared,Object.keys(counts).length);
  assert.equal(result.outcome,"REVIEW_REQUIRED");
  assert.equal(result.certification,"NOT_PRODUCTION_UAT_PASS");
  assert.equal(JSON.stringify(result).includes(f.folder),false,"never expose paths");
 }finally{fs.rmSync(f.folder,{recursive:true,force:true});}
});
test("A changed backup, missing or mismatched rows and manual gates remain blocked",async()=>{
 const f=fixture();
 try{
  fs.appendFileSync(f.data,"tampered");
  assert.equal((await tool.verify(f.file)).outcome,"BLOCKED");
  assert.equal((await tool.verify(f.file)).backup_sha256_matched,false);
  f.manifest.backup_sha256=crypto.createHash("sha256").update(fs.readFileSync(f.data)).digest("hex");
  f.manifest.restored_counts["auth.identities"]=2;f.persist();
  let result=await tool.verify(f.file);
  assert.equal(result.row_counts_matched,false);
  assert.deepEqual(result.mismatched_tables,["auth.identities"]);
  f.manifest.restored_counts["auth.identities"]=3;
  f.manifest.auth_service_verified=false;f.persist();
  result=await tool.verify(f.file);assert.equal(result.outcome,"BLOCKED");
 }finally{fs.rmSync(f.folder,{recursive:true,force:true});}
});
test("Manifest disallows secrets and ambiguous or missing recovery evidence",()=>{
 const f=fixture();
 try{
  const fail=(mutation,pattern)=>{
   const m=JSON.parse(JSON.stringify(f.manifest));mutation(m);
   assert.throws(()=>tool.parseManifest(JSON.stringify(m)),pattern);
  };
  fail(m=>m.password="secret",/MANIFEST_FIELD_NOT_ALLOWED/);
  fail(m=>m.service_role="secret",/MANIFEST_FIELD_NOT_ALLOWED/);
  fail(m=>m.captured_utc="garbage",/BACKUP_DATE_INVALID/);
  fail(m=>{delete m.restored_counts["auth.users"];},/MISSING_REQUIRED_TABLE/);
  fail(m=>{m.restored_counts["public.projects"]=-1;},/COUNT_INVALID/);
  fail(m=>{m.source_counts["private.email_data"]=0;},/NAMES_INVALID/);
  fail(m=>{m.isolated_restore="yes";},/MANUAL_ATTESTATION_INVALID/);
  fail(m=>{m.rto_seconds=-2;},/RECOVERY_METRICS_INVALID/);
  assert.throws(()=>tool.parseManifest("x".repeat(70000)),/TOO_LARGE/);
 }finally{fs.rmSync(f.folder,{recursive:true,force:true});}
});
test("Operator manifest equality is a count-only comparison, not row-content assurance",()=>{
 assert.deepEqual(tool.compareCounts({"auth.users":1},{"auth.users":1}),
   {equal:true,tablesCompared:1,mismatchedTables:[]});
 assert.deepEqual(tool.compareCounts({"auth.users":1},{"auth.users":2}),
   {equal:false,tablesCompared:1,mismatchedTables:["auth.users"]});
});
