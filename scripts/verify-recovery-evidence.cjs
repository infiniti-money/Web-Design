"use strict";
/**
 * LOCAL-ONLY verification of an operator's backup SHA-256 and row-count manifest.
 * No database connections, subprocesses, secret values, cloud uploads or file mutation.
 * This tool NEVER certifies a live Supabase Auth/Storage restore or real role UAT.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const KIND="atelier-recovery-evidence-v1";
const allowed=new Set(["kind","backup_file","backup_sha256","captured_utc",
  "source_counts","restored_counts","isolated_restore","auth_service_verified",
  "storage_objects_verified","rto_seconds","rpo_seconds"]);
const tablePattern=/^(?:auth|storage|public|private|supabase_migrations)\.[a-z_][a-z0-9_]*$/;
const required=["auth.users","auth.identities","storage.buckets","storage.objects",
  "public.staff_profiles","public.projects","public.inquiries",
  "public.customer_quotes","public.customer_quote_versions"];
const forbiddenKeys=/(?:password|secret|token|email|phone|full_name|authorization|connection_string|jwt|apikey|service_role)/i;
function counts(value,label){
  if(!value||typeof value!=="object"||Array.isArray(value))throw Error(label+"_INVALID");
  const keys=Object.keys(value);
  if(keys.length>150||keys.some(key=>!tablePattern.test(key)||forbiddenKeys.test(key)))
    throw Error(label+"_NAMES_INVALID");
  for(const key of required)if(!Object.hasOwn(value,key))throw Error(label+"_MISSING_REQUIRED_TABLE");
  for(const key of keys){
    if(!Number.isSafeInteger(value[key])||value[key]<0)throw Error(label+"_COUNT_INVALID");
  }
  return value;
}
function parseManifest(raw){
  if(typeof raw!=="string"||Buffer.byteLength(raw,"utf8")>65536)throw Error("MANIFEST_TOO_LARGE");
  let manifest;try{manifest=JSON.parse(raw);}catch{throw Error("MANIFEST_INVALID_JSON");}
  if(!manifest||typeof manifest!=="object"||Array.isArray(manifest))
    throw Error("MANIFEST_INVALID");
  for(const key of Object.keys(manifest))
    if(!allowed.has(key)||forbiddenKeys.test(key))throw Error("MANIFEST_FIELD_NOT_ALLOWED");
  if(manifest.kind!==KIND)throw Error("MANIFEST_WRONG_KIND");
  if(typeof manifest.backup_file!=="string"||!manifest.backup_file.trim()||
      manifest.backup_file.length>4096)throw Error("BACKUP_FILE_INVALID");
  if(!/^[a-f0-9]{64}$/i.test(manifest.backup_sha256||""))
    throw Error("BACKUP_SHA256_INVALID");
  if(typeof manifest.captured_utc!=="string"||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(manifest.captured_utc)||
      !Number.isFinite(Date.parse(manifest.captured_utc))||
      Date.parse(manifest.captured_utc)>Date.now()+300000)
    throw Error("BACKUP_DATE_INVALID");
  counts(manifest.source_counts,"SOURCE");
  counts(manifest.restored_counts,"RESTORED");
  for(const name of ["isolated_restore","auth_service_verified","storage_objects_verified"])
    if(typeof manifest[name]!=="boolean")throw Error("MANUAL_ATTESTATION_INVALID");
  for(const name of ["rto_seconds","rpo_seconds"])
    if(!Number.isSafeInteger(manifest[name])||manifest[name]<0)
      throw Error("RECOVERY_METRICS_INVALID");
  return manifest;
}
function compareCounts(a,b){
  const all=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
  return {equal:all.every(k=>Object.hasOwn(a,k)&&Object.hasOwn(b,k)&&a[k]===b[k]),
    tablesCompared:all.length,
    mismatchedTables:all.filter(k=>!Object.hasOwn(a,k)||!Object.hasOwn(b,k)||a[k]!==b[k])};
}
async function sha256File(filename){
  const stat=fs.lstatSync(filename);
  if(!stat.isFile()||stat.isSymbolicLink())throw Error("BACKUP_NOT_REGULAR_FILE");
  const hash=crypto.createHash("sha256");
  await new Promise((resolve,reject)=>{
    const stream=fs.createReadStream(filename);
    stream.on("data",chunk=>hash.update(chunk));
    stream.on("error",reject);stream.on("end",resolve);
  });
  return hash.digest("hex");
}
async function verify(manifestPath){
  if(typeof manifestPath!=="string")throw Error("MANIFEST_PATH_REQUIRED");
  const data=fs.readFileSync(manifestPath,"utf8");
  const manifest=parseManifest(data);
  const file=path.resolve(path.dirname(path.resolve(manifestPath)),manifest.backup_file);
  const digest=await sha256File(file);
  const matched=digest.toLowerCase()===manifest.backup_sha256.toLowerCase();
  const rows=compareCounts(manifest.source_counts,manifest.restored_counts);
  const attestations={
    isolated_restore:manifest.isolated_restore,
    auth_service_verified:manifest.auth_service_verified,
    storage_objects_verified:manifest.storage_objects_verified
  };
  const allManual=Object.values(attestations).every(Boolean);
  return {
    scope:"local-file-check-only",
    backup_sha256_matched:matched,
    row_counts_matched:rows.equal,
    tables_compared:rows.tablesCompared,
    mismatched_tables:rows.mismatchedTables,
    manual_attestations:attestations,
    rto_seconds:manifest.rto_seconds,
    rpo_seconds:manifest.rpo_seconds,
    outcome:matched&&rows.equal&&allManual?"REVIEW_REQUIRED":"BLOCKED",
    certification:"NOT_PRODUCTION_UAT_PASS",
    caveat:"Row counts and Auth/Storage attestations are operator-supplied; an independent reviewer must verify the isolated restore and real-user sessions."
  };
}
if(require.main===module)(async()=>{
  try{
    if(process.argv.length!==3)throw Error("USAGE: node scripts/verify-recovery-evidence.cjs <local-manifest.json>");
    const result=await verify(process.argv[2]);
    process.stdout.write(JSON.stringify(result,null,2)+"\n");
    if(result.outcome==="BLOCKED")process.exitCode=2;
  }catch(error){
    process.stderr.write("Recovery verification blocked: "+error.message+"\n");
    process.exitCode=2;
  }
})();
module.exports={KIND,parseManifest,compareCounts,sha256File,verify,required};
