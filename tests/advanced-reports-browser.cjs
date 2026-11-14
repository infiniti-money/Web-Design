"use strict";
/* Isolated browser fixture: NEVER authenticate or call a production Supabase API. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");

(async()=>{
  const base=process.env.SITE_URL||"http://127.0.0.1:4173/";
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{
    const page=await browser.newPage({viewport:{width:1220,height:850}});
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>{
      const now=new Date().toISOString();
      const model=window.__reportsFixture={
        role:"admin",profileRole:"admin",active:true,userId:"fixture-user",
        hold:false,release:null,readCount:0,
        rows:[
          {id:"t1",title:"Thi công nội thất",status:"todo",due_at:"2020-01-01T00:00:00Z",created_at:now},
          {id:"t2",title:"Lắp đặt đèn",status:"completed",completed_at:now,due_at:now,created_at:now}
        ]
      };
      const db={
        auth:{
          async getUser(){return{data:{user:model.role?{id:model.userId,app_metadata:{role:model.role}}:null}};},
          onAuthStateChange(fn){model.notify=fn;return{data:{subscription:{unsubscribe(){}}}};}
        },
        from(table){
          if(table==="staff_profiles"){
            const q={select(){return q;},eq(){return q;},
              async single(){return{data:{role:model.profileRole,active:model.active}};}};
            return q;
          }
          if(table!=="inquiry_care_tasks")throw Error("Unexpected table "+table);
          const q={
            select(){return q;},gte(){return q;},order(){return q;},abortSignal(signal){model.signal=signal;return q;},
            limit(n){
              if(n!==500)throw Error("Unexpected row limit");
              model.readCount++;
              if(model.hold)return new Promise(resolve=>{model.release=()=>resolve({data:model.rows,error:null});});
              return Promise.resolve({data:model.rows,error:null});
            }
          };
          return q;
        }
      };
      window.__reportsDb=db;
    });
    await page.route("**/*",route=>{
      const url=route.request().url();
      const path=new URL(url).pathname;
      if(path.endsWith("/app-config.js"))
        return route.fulfill({status:200,contentType:"application/javascript",
          body:'window.ATELIER_CONFIG={supabaseUrl:"https://fixture.example.invalid",supabasePublishableKey:"sb_publishable_fixture"};'});
      if(path.endsWith("/assets/admin-workspace.js"))
        return route.fulfill({status:200,contentType:"application/javascript",body:"// Navigation tested elsewhere."});
      if(url.startsWith("https://cdn.jsdelivr.net/npm/@supabase/"))
        return route.fulfill({status:200,contentType:"application/javascript",
          body:"window.supabase={createClient:()=>window.__reportsDb};"});
      if(!url.startsWith(base))return route.abort();
      return route.continue();
    });
    await page.goto(base+"reports-advanced.html",{waitUntil:"domcontentloaded"});
    await page.locator("#report:not([hidden])").waitFor();
    assert.equal(await page.locator("#total").textContent(),"2");
    assert.equal(await page.locator("#late").textContent(),"1");
    await page.locator("#report-search").fill("noi that");
    assert.equal(await page.locator("#total").textContent(),"1");
    assert.equal(await page.locator("#rows tr").count(),1);
    await page.locator("#report-search").fill("");
    await page.locator("#report-status").selectOption("completed");
    assert.equal(await page.locator("#total").textContent(),"1");
    await page.locator("#report-status").selectOption("all");
    assert.equal(await page.locator("#export").isEnabled(),true);

    await page.evaluate(()=>{window.__reportsFixture.hold=true;});
    await page.locator("#report-refresh").click();
    assert.equal(await page.locator("#report").isHidden(),true,"must hide stale results while refreshing");
    await page.evaluate(()=>{
      window.__reportsFixture.role=null;
      window.__reportsFixture.notify("SIGNED_OUT");
      window.__reportsFixture.release?.();
    });
    await page.waitForTimeout(75);
    assert.equal(await page.locator("#report").isHidden(),true);
    assert.equal(await page.locator("#export").isDisabled(),true);
    assert.match(await page.locator("#notice").textContent(),/Đã đăng xuất/);

    await page.evaluate(()=>{
      const m=window.__reportsFixture;
      m.hold=false;m.role="employee";m.profileRole="employee";
    });
    await page.locator("#report-refresh").click();
    await page.waitForFunction(()=>document.querySelector("#notice").textContent.includes("không được phép"));
    assert.equal(await page.locator("#report").isHidden(),true,"Employee cannot view reports");
    const reads=await page.evaluate(()=>window.__reportsFixture.readCount);
    assert.equal(reads,2,"denied Employee must not fetch business rows");

    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"Mobile report must not overflow");
    assert.deepEqual(errors,[],"No page errors in secured-report browser test");
    console.log("PASS: advanced report filters, role denial, abort stale responses, logout cleanup, export gating, mobile layout (fixtures only).");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
