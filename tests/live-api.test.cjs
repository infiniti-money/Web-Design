const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync("app-config.js","utf8"), sandbox, {filename:"app-config.js"});
const {supabaseUrl, supabasePublishableKey} = sandbox.window.ATELIER_CONFIG;

function headers() {
  return {apikey:supabasePublishableKey,Accept:"application/json"};
}

test("Anonymous public Catalog projection works without accessing staff tables",async()=>{
  const url=new URL(supabaseUrl+"/rest/v1/catalog_items");
  url.searchParams.set("select","id,name,category,style,description,image_url,sort_order,published");
  url.searchParams.set("published","eq.true");url.searchParams.set("limit","100");
  const response=await fetch(url,{headers:headers(),signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,"Public Catalog must not fail on staff_profiles permissions");
  const rows=await response.json();assert.ok(Array.isArray(rows));assert.ok(rows.every(row=>row.published===true));
});

test("Catalog public access does not grant anonymous staff directory access",async()=>{
  const response=await fetch(supabaseUrl+"/rest/v1/staff_profiles?select=user_id&limit=1",{headers:headers(),signal:AbortSignal.timeout(20000)});
  assert.ok([401,403].includes(response.status),"Staff profiles must remain private");
});
test("Live Supabase API is reachable and returns published projects", async () => {
  assert.match(supabaseUrl, /^https:\/\/[a-z0-9-]+\.supabase\.co$/);
  assert.match(supabasePublishableKey,/^sb_publishable_[a-zA-Z0-9_-]+$/);
  const res=await fetch(supabaseUrl+"/rest/v1/projects?select=slug,title,published&published=eq.true&limit=25",
    {headers:headers(),signal:AbortSignal.timeout(20000)});
  const body=await res.text();
  assert.equal(res.status,200,"Public project request HTTP "+res.status+": "+body.slice(0,240));
  const rows=JSON.parse(body);
  assert.ok(Array.isArray(rows),"Expected JSON array");
  assert.ok(rows.length>=6,"Expected at least 6 published example projects");
  assert.ok(rows.every(r=>r.published===true),"Public result must only contain published rows");
  console.log("Public projects HTTP 200:",rows.length,"published entries");
});

test("Anonymous users cannot read customer inquiries", async () => {
  const res=await fetch(supabaseUrl+"/rest/v1/inquiries?select=id&limit=1",{
    headers:headers(),signal:AbortSignal.timeout(20000)
  });
  assert.ok([401,403].includes(res.status),
    "Anonymous inquiries SELECT should be denied; got HTTP "+res.status);
  console.log("Private inquiries SELECT rejected as expected: HTTP",res.status);
});
