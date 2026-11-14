"use strict";
/* Admin-only UAT acceptance fixture: never uses a production login or backup. */
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require("playwright");
(async()=>{
 const base=process.env.SITE_URL||"http://127.0.0.1:4173/";
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900},acceptDownloads:true});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const mock=window.__uatFixture={role:"admin",profileRole:"admin",active:true,userId:"fixture-user",checks:0};
   const client={
    auth:{
     async getUser(){mock.checks++;return{data:{user:mock.role?{id:mock.userId,app_metadata:{role:mock.role}}:null}};},
     onAuthStateChange(fn){mock.onAuth=fn;return{data:{subscription:{unsubscribe(){}}}};}
    },
    from(table){
     if(table!=="staff_profiles")throw Error("Unexpected business read: "+table);
     const q={select(){return q;},eq(){return q;},async single(){
       return{data:{role:mock.profileRole,active:mock.active}};
     }};return q;
    }
   };
   window.__uatDb=client;
  });
  await page.route("**/*",route=>{
   const url=route.request().url();
   if(url.endsWith("/app-config.js"))return route.fulfill({status:200,contentType:"application/javascript",
      body:'window.ATELIER_CONFIG={supabaseUrl:"https://fixture.invalid",supabasePublishableKey:"sb_publishable_fixture"};'});
   if(url.endsWith("/assets/admin-workspace.js"))return route.fulfill({status:200,contentType:"application/javascript",body:"// admin-shell separately covered"});
   if(url.startsWith("https://cdn.jsdelivr.net/npm/@supabase/"))
     return route.fulfill({status:200,contentType:"application/javascript",
       body:"window.supabase={createClient:()=>window.__uatDb};"});
   if(!url.startsWith(base))return route.abort();
   return route.continue();
  });
  await page.goto(base+"uat.html",{waitUntil:"domcontentloaded"});
  await page.locator("#uat-panel:not([hidden])").waitFor();
  assert.equal(await page.locator(".uat-gate input").count(),8);
  assert.equal(await page.locator("#uat-status").textContent().then(x=>x.includes("phiên Admin")),true);
  await page.locator(".uat-gate input").first().check();
  assert.match(await page.locator("#uat-progress").textContent(),/1 \/ 8/);
  const downloadEvent=page.waitForEvent("download");
  await page.locator("#uat-export").click();
  const download=await downloadEvent;
  assert.equal(download.suggestedFilename(),"atelier-uat-self-report-NOT-VERIFIED.json");
  const evidence=JSON.parse(fs.readFileSync(await download.path(),"utf8"));
  assert.equal(evidence.verification,"OPERATOR_DECLARATION_ONLY");
  assert.equal(evidence.production_uat,"NOT_CERTIFIED");
  assert.equal(evidence.declared_count,1);
  assert.ok(!JSON.stringify(evidence).includes("fixture-user"));
  await page.evaluate(()=>{
   window.__uatFixture.role=null;
   window.__uatFixture.onAuth("SIGNED_OUT");
  });
  await page.waitForFunction(()=>document.querySelector("#uat-status").textContent.includes("Đã đăng xuất"));
  assert.equal(await page.locator("#uat-panel").isHidden(),true);
  assert.equal(await page.locator("#uat-export").isDisabled(),true);
  await page.evaluate(()=>{
   window.__uatFixture.role="manager";
   window.__uatFixture.profileRole="manager";
  });
  await page.locator("#uat-refresh").click();
  await page.waitForFunction(()=>document.querySelector("#uat-status").textContent.includes("Không đủ quyền"));
  assert.equal(await page.locator("#uat-panel").isHidden(),true);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  assert.deepEqual(errors,[],"no browser exceptions");
  console.log("PASS: Admin-only UAT, non-certifying local evidence, manager denial, logout wipe and mobile layout (fixtures only)");
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
