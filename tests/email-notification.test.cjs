const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("supabase/functions/submit-inquiry/index.ts","utf8");
const start = source.indexOf("async function notifyAdminAboutInquiry(");
const end = source.indexOf("\nDeno.serve(",start);
assert.ok(start>=0 && end>start,"Email helper must exist in deployed Edge Function");
const helper = source.slice(start,end)
  .replace("inquiryId: unknown, service: string): Promise<void>","inquiryId, service)");

function setup(env,fetchMock) {
  const calls=[], errors=[];
  const ctx={Deno:{env:{get:key=>env[key]}},AbortSignal,fetch:async(url,init)=>{
    calls.push({url,init});return fetchMock ? fetchMock(url,init) : {ok:true,status:200};
  },console:{error:(...items)=>errors.push(items)}};
  vm.runInNewContext(helper+"\nthis.notification = notifyAdminAboutInquiry;",ctx);
  return {notify:ctx.notification,calls,errors};
}
const id="11111111-2222-4333-8444-555555555555";
test("Unconfigured mail provider does not send or log personal data",async()=>{
  const x=setup({},{});
  await x.notify(id,"Thiết kế nội thất");
  assert.equal(x.calls.length,0);
  assert.deepEqual(x.errors,[]);
});
test("Configured provider sends privacy-minimized idempotent notification",async()=>{
  const x=setup({RESEND_API_KEY:"re_TEST_NOT_REAL",NOTIFY_FROM_EMAIL:"Tân Design <notify@example.test>"});
  await x.notify(id,"Thiết kế nội thất");
  assert.equal(x.calls.length,1);
  assert.equal(x.calls[0].url,"https://api.resend.com/emails");
  assert.equal(x.calls[0].init.method,"POST");
  assert.equal(x.calls[0].init.headers["Idempotency-Key"],"tan-design-lead-"+id);
  const body=JSON.parse(x.calls[0].init.body);
  assert.equal(body.to[0],"infinitimoney@icloud.com");
  assert.match(body.text,/admin\.html/);
  assert.match(body.subject,/yêu cầu tư vấn mới/i);
  assert.ok(!("full_name" in body) && !("phone" in body) && !("details" in body));
  assert.equal(x.errors.length,0);
});
test("Provider errors do not cause a fake failed submission or leak secrets",async()=>{
  const x=setup({RESEND_API_KEY:"re_SECRET_TEST",NOTIFY_FROM_EMAIL:"notify@example.test"},
    async()=>({ok:false,status:429}));
  await assert.doesNotReject(()=>x.notify(id,"Thiết kế nội thất"));
  assert.equal(x.calls.length,1);
  assert.equal(x.errors.length,1);
  assert.equal(x.errors[0][0],"consultation_notification_failed");
  assert.ok(!JSON.stringify(x.errors).includes("re_SECRET_TEST"));
});
test("Invalid sender configuration never calls mail service",async()=>{
  const x=setup({RESEND_API_KEY:"re_SECRET_TEST",NOTIFY_FROM_EMAIL:"<invalid-sender>"});
  await x.notify(id,"Thiết kế nội thất");
  assert.equal(x.calls.length,0);
});
