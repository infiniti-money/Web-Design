/* Post-deploy browser smoke. Supabase is entirely synthetic; no customer data or passwords. */
"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const home=(process.env.SITE_URL||"https://infiniti-money.github.io/Web-Design/").replace(/\/?$/,"/");
function installFixture(role,options){
  const observers=[],calls=[],currentUser={id:"ci-account",app_metadata:{role},email:"fixture@example.invalid"};
  window.__opsFixture={calls,signOut(){for(const notify of observers)notify("SIGNED_OUT",null);}};
  const client={
    auth:{
      getUser:async()=>({data:{user:currentUser},error:null}),
      onAuthStateChange(fn){observers.push(fn);return{data:{subscription:{unsubscribe(){}}}};}
    },
    from(table){
      const spec={table,filters:[],head:false};calls.push(spec);
      const query={
        select(_fields,opts){spec.head=!!opts?.head;return query;},
        eq(a,b){spec.filters.push(["eq",a,b]);return query;},
        in(a,b){spec.filters.push(["in",a,b]);return query;},
        lt(a,b){spec.filters.push(["lt",a,b]);return query;},
        gte(a,b){spec.filters.push(["gte",a,b]);return query;},
        single:async()=>({data:{role,active:true,full_name:"Tài khoản kiểm thử"},error:null}),
        then(resolve,reject){
          const fail=options?.partial&&table==="cms_posts";
          return Promise.resolve(fail?{count:null,error:{message:"intentional-denial"}}:{count:table==="inquiry_care_tasks"?4:table==="customer_quotes"?3:table==="cms_posts"?2:5,error:null}).then(resolve,reject);
        }
      };
      return query;
    }
  };
  window.supabase={createClient:()=>client};
}
async function view(browser,role,opts){
  const page=await browser.newPage({viewport:{width:opts?.mobile?390:1380,height:900}});
  await page.route("**/*.supabase.co/**",r=>r.abort("blockedbyclient"));
  await page.route("**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0",r=>
    r.fulfill({status:200,contentType:"application/javascript",body:"("+installFixture.toString()+")("+JSON.stringify(role)+","+JSON.stringify(opts||{})+");"}));
  const response=await page.goto(home+"operations.html",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  return page;
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:["--no-sandbox"]});
  try{
    const admin=await view(browser,"admin");
    await admin.locator("#ops-app").waitFor({state:"visible",timeout:10000});
    assert.equal(await admin.locator("#ops-quotes-review").innerText(),"3");
    assert.equal(await admin.locator("#ops-posts-review").innerText(),"2");
    assert.equal(await admin.locator("#ops-staff-card").isVisible(),true);
    await admin.locator("#ops-refresh").click();
    assert.equal(await admin.locator("#ops-quotes-review").innerText(),"3");
    await admin.evaluate(()=>window.__opsFixture.signOut());
    await admin.locator("#ops-app").waitFor({state:"hidden"});
    assert.match(await admin.locator("#ops-status").innerText(),/Đã đăng xuất/);
    await admin.close();
    const manager=await view(browser,"manager",{mobile:true,partial:true});
    await manager.locator("#ops-app").waitFor({state:"visible",timeout:10000});
    assert.equal(await manager.locator("#ops-staff-card").isVisible(),false);
    assert.equal(await manager.locator("#ops-posts-review").innerText(),"–");
    assert.match(await manager.locator("#ops-status").innerText(),/chưa tải được/);
    assert.equal(await manager.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await manager.close();
    const employee=await view(browser,"employee");
    await employee.waitForFunction(()=>document.querySelector("#ops-status")?.textContent.includes("Không có quyền"));
    assert.equal(await employee.locator("#ops-app").isVisible(),false);
    assert.equal(await employee.evaluate(()=>window.__opsFixture.calls.filter(c=>c.head).length),0);
    await employee.close();
    console.log("OPERATIONS PASS: Admin, Manager, Employee RBAC, RLS counters, partial failure, signout, mobile.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
