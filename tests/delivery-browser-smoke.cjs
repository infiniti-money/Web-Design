"use strict";
/* Isolated delivery UI regression. Real Supabase endpoints are blocked: no user/customer writes. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const root=(process.env.SITE_URL||"http://127.0.0.1:4173/").replace(/\/?$/,"/");
function fixture(role){
  const workspace=[];
  const events=[];
  const current={id:"ci-actor",app_metadata:{role}};
  const staff=[{user_id:"ci-actor",role,active:true,full_name:"Nhân sự kiểm thử"}];
  const records={
    delivery_workspaces:workspace,
    inquiries:[{id:"ci-inquiry",full_name:"Hồ sơ tổng hợp"}],
    staff_profiles:staff,
    projects:[{id:"ci-project",title:"Công trình minh họa"}],
    catalog_items:[{id:"ci-material",name:"Vật tư đã công khai",published:true}],
    inquiry_care_tasks:[{id:"ci-task",inquiry_id:"ci-inquiry",title:"Việc tổng hợp",assignee_name:"Nhân sự kiểm thử"}],
    delivery_catalog_links:[],
    delivery_task_links:[]
  };
  const db={
    auth:{getUser:async()=>({data:{user:current},error:null}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
    from(table){
      events.push(table);
      let action="read",payload=null;
      const filters=[];
      const query={
        select(){return query;},
        eq(field,value){filters.push([field,value]);return query;},
        order(){return query;},
        limit(){return query;},
        range(start,end){
          const data=(records[table]||[]).filter(row=>filters.every(([f,v])=>row[f]===v));
          return Promise.resolve({data:data.slice(start,end+1),count:data.length,error:null});
        },
        insert(value){action="insert";payload=value;return query;},
        update(value){action="update";payload=value;return query;},
        async single(){
          if(table==="staff_profiles")return{data:staff[0],error:null};
          if(action==="insert"&&table==="delivery_workspaces"){
            const data={id:"ci-workspace",version:1,created_at:new Date().toISOString(),
              created_by:current.id,...payload};
            workspace.push(data);return{data,error:null};
          }
          return{data:null,error:{message:"Unknown test operation"}};
        },
        async maybeSingle(){
          if(action==="update"){
            const record=workspace.find(row=>filters.every(([f,v])=>row[f]===v));
            if(!record)return{data:null,error:null};
            Object.assign(record,payload,{version:record.version+1});
            return{data:record,error:null};
          }
          return{data:null,error:null};
        },
        then(resolve,reject){
          const data=(records[table]||[]).filter(row=>filters.every(([f,v])=>row[f]===v));
          return Promise.resolve({data,error:null}).then(resolve,reject);
        }
      };
      return query;
    }
  };
  window.supabase={createClient:()=>db};
  window.__deliveryFixture={events,workspace};
}
async function open(browser,role,mobile=false){
 const page=await browser.newPage({viewport:{width:mobile?390:1280,height:840}});
 await page.route("**/*.supabase.co/**",route=>route.abort("blockedbyclient"));
 await page.route("**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0",route=>
   route.fulfill({status:200,contentType:"application/javascript",
     body:"("+fixture.toString()+")("+JSON.stringify(role)+");"}));
 const res=await page.goto(root+"delivery.html",{waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(res?.status(),200);
 return page;
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{
    const employee=await open(browser,"employee");
    await employee.waitForFunction(()=>document.querySelector("#delivery-status")?.textContent.includes("Không có quyền"));
    assert.equal(await employee.locator("#delivery-app").isVisible(),false);
    assert.equal((await employee.evaluate(()=>window.__deliveryFixture.events)).includes("delivery_workspaces"),false);
    await employee.close();

    const manager=await open(browser,"manager",true);
    await manager.locator("#delivery-app").waitFor({state:"visible",timeout:12000});
    assert.equal(await manager.locator("#delivery-total").innerText(),"0");
    assert.equal(await manager.locator("#delivery-list .delivery-item").count(),0);
    assert.equal(await manager.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
    await manager.close();

    const admin=await open(browser,"admin");
    await admin.locator("#delivery-app").waitFor({state:"visible",timeout:12000});
    await admin.locator("#delivery-title").fill("Công trình UAT tổng hợp");
    await admin.locator("#delivery-inquiry").selectOption("ci-inquiry");
    await admin.locator("#delivery-stage").selectOption("design");
    await admin.locator("#delivery-form button[type=submit]").click();
    await admin.locator("#delivery-list .delivery-item").waitFor({timeout:12000});
    assert.match(await admin.locator("#delivery-list .delivery-item").innerText(),/Công trình UAT tổng hợp/);
    assert.equal(await admin.evaluate(()=>window.__deliveryFixture.workspace.length),1);
    assert.equal(await admin.locator("#delivery-total").innerText(),"1");
    assert.ok((await admin.evaluate(()=>window.__deliveryFixture.events))
      .includes("delivery_workspaces"));
    await admin.close();
    console.log("DELIVERY PASS: employee denied, manager allowed mobile, Admin synthetic create, RLS reads, no production API.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
