const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = { window:{} };
vm.runInNewContext(fs.readFileSync("app-config.js","utf8"),context);
const config=context.window.ATELIER_CONFIG;
const url=config.supabaseUrl + "/functions/v1/submit-inquiry";
const origin="https://infiniti-money.github.io";
const authHeaders={ "Origin":origin, "apikey":config.supabasePublishableKey };
const timeout=()=>AbortSignal.timeout(15000);

test("Inquiry API denies unauthorized web origins",async()=>{
  const res=await fetch(url,{method:"POST",headers:{"Origin":"https://untrusted.example","Content-Type":"application/json"},body:"{}",signal:timeout()});
  assert.equal(res.status,403);
});
test("Inquiry API allows CORS preflight",async()=>{
  const res=await fetch(url,{method:"OPTIONS",headers:{"Origin":origin},signal:timeout()});
  assert.equal(res.status,204);
  assert.equal(res.headers.get("access-control-allow-origin"),origin);
});
test("Inquiry API rejects malformed JSON, method, and honeypot",async()=>{
  let res=await fetch(url,{method:"GET",headers:authHeaders,signal:timeout()});
  assert.equal(res.status,405);
  res=await fetch(url,{method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},body:"{",signal:timeout()});
  assert.equal(res.status,400);
  res=await fetch(url,{method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},body:JSON.stringify({website:"spam",full_name:"Testing",phone:"0912345000"}),signal:timeout()});
  assert.equal(res.status,400);
});
test("Inquiry API requires affirmative privacy consent",async()=>{
  const res=await fetch(url,{method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},
    body:JSON.stringify({full_name:"CI CONSENT REJECTION",phone:"0912345000",
      service:"Thiết kế nội thất",space:"Căn hộ",details:"NOT_SAVED_BY_TEST",website:""}),
    signal:timeout()});
  const body=await res.json();
  assert.equal(res.status,400);
  assert.equal(body.code,"privacy_consent_required");
});
test("Inquiry API rejects a fake Turnstile challenge",async()=>{
  const res=await fetch(url,{method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},
    body:JSON.stringify({full_name:"CI CHALLENGE REJECTION",phone:"0912345000",
      service:"Thiết kế nội thất",space:"Căn hộ",details:"NOT_SAVED_BY_TEST",
      website:"",privacy_consent:true,turnstile_token:"INVALID_FAKE_CHALLENGE"}),
    signal:timeout()});
  assert.ok([403,503].includes(res.status),"Fake challenge must not create a lead");
});
test("Inquiry API accepts exactly one clearly marked synthetic lead",
  {skip:process.env.RUN_LIVE_WRITE_TEST!=="1"},async()=>{
  const run=process.env.GITHUB_RUN_ID || "local";
  const res=await fetch(url,{method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},
    body:JSON.stringify({full_name:"ATELIER TEST ENTRY",phone:"0912345000",
      service:"Thiết kế nội thất",space:"Căn hộ",
      details:"ATELIER_AUTOTEST_ENTRY_DO_NOT_CONTACT run "+run,website:"",privacy_consent:true}),
    signal:timeout()});
  const data=await res.json();
  assert.equal(res.status,201,JSON.stringify({http:res.status,code:data.code}));
  assert.deepEqual(data,{ok:true});
  console.log("Synthetic test lead saved; cleanup marker ATELIER_AUTOTEST_ENTRY_DO_NOT_CONTACT run "+run);
});
