const {chromium}=require("playwright");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const target=path.join(process.cwd(),"preview-v1-17");fs.mkdirSync(target,{recursive:true});
const demo={
 inquiries:[{id:"a",full_name:"Khách hàng mẫu - Căn hộ"},{id:"b",full_name:"Khách hàng mẫu - Nhà phố"}],
 customer_quotes:[{id:"q1",title:"Thiết kế căn hộ 90 m²",status:"draft",inquiry_id:"a"},{id:"q2",title:"Thi công nội thất nhà phố",status:"submitted",inquiry_id:"b"},{id:"q3",title:"Cải tạo phòng khách",status:"approved",inquiry_id:"a"},{id:"q4",title:"Thiết kế bếp Japandi",status:"accepted",inquiry_id:"b"}],
 customer_contracts:[{id:"c1",contract_number:"HD-DEMO-001",status:"review",inquiry_id:"b"},{id:"c2",contract_number:"HD-DEMO-002",status:"signed",inquiry_id:"a"}],
 commercial_audit:[{action:"approve",entity_kind:"quote",actor_id:"u1",created_at:"2026-11-02T04:00:00Z",details:{}},{action:"reject",entity_kind:"quote",actor_id:"u1",created_at:"2026-11-01T10:10:00Z",details:{reason:"Cần bổ sung thông tin vật liệu"}},{action:"accept",entity_kind:"quote",actor_id:"u1",created_at:"2026-11-01T08:20:00Z",details:{method:"email",evidence:"Khách xác nhận qua email - mẫu"}}],
 customer_quote_versions:[{quote_id:"q1",version_no:1,total_amount:30000000},{quote_id:"q2",version_no:2,total_amount:85000000},{quote_id:"q3",version_no:1,total_amount:19000000},{quote_id:"q4",version_no:3,total_amount:42000000}],
 staff_profiles:[{user_id:"u1",full_name:"Admin mẫu"}]
};
async function setup(page,role){
 await page.addInitScript(({demo,role})=>{
   window.__mockDB={
     auth:{getUser:async()=>({data:{user:{id:"u1",app_metadata:{role}}},error:null})},
     from(table){
       const filters={};
       const api={select(){return api;},eq(k,v){filters[k]=v;return api;},order(){return api;},
         async single(){if(table==="staff_profiles")return{data:{role,active:true},error:null};return{data:(demo[table]||[]).find(x=>Object.entries(filters).every(([k,v])=>x[k]===v)),error:null};},
         async limit(){return{data:demo[table]||[],error:null};}
       };return api;
     },
     rpc:async()=>({error:{message:"Bản demo không ghi dữ liệu"}})
   };
 },{demo,role});
 await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0",route=>route.fulfill({status:200,contentType:"application/javascript",body:"window.supabase={createClient:function(){return window.__mockDB}};"}));
}
async function render(browser,name,width,height,role){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:"vi-VN",isMobile:width<600,hasTouch:width<600});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await setup(page,role);
 await page.goto("http://127.0.0.1:8765/commercial.html",{waitUntil:"networkidle"});
 await page.locator("#status").waitFor({state:"visible"});
 if(role!=="employee")await page.locator("#quotes .item").first().waitFor({state:"visible"});
 await page.evaluate(()=>{
   const el=document.createElement("div");
   el.textContent="BẢN XEM TRƯỚC V1.17 · DỮ LIỆU MÔ PHỎNG · KHÔNG GHI SUPABASE";
   el.style.cssText="position:sticky;top:0;z-index:1000;background:#f9e7ae;color:#4a3911;font:700 12px/1.5 system-ui;text-align:center;padding:10px;box-shadow:0 1px 8px #0002";
   document.body.prepend(el);
 });
 assert.deepEqual(errors,[],"JavaScript console errors");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
 assert.equal(overflow,false,name+" horizontal overflow");
 const visible=await page.locator("#app").isVisible();
 assert.equal(visible,role!=="employee","Role access incorrect");
 if(role!=="employee")assert.equal(await page.locator("#quotes .item").count(),4);
 await page.screenshot({path:path.join(target,name+".png"),fullPage:true,animations:"disabled"});
 const result={name,viewport:width+"x"+height,role,appVisible:visible,overflow:false,screenshot:name+".png"};
 await context.close();return result;
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const result=[];
  for(const [name,w,h,role] of [["desktop-admin-1440",1440,900,"admin"],["mobile-admin-390",390,844,"admin"],["desktop-manager-1280",1280,800,"manager"],["mobile-employee-denied-390",390,844,"employee"]])result.push(await render(browser,name,w,h,role));
  fs.writeFileSync(path.join(target,"report.json"),JSON.stringify({previewOnly:true,productionWrites:false,results:result},null,2));
  fs.writeFileSync(path.join(target,"README.md"),"# Tân Design v1.17 - bản xem trước\n\nẢnh chụp Chromium với dữ liệu mô phỏng. Không đăng nhập thực và không ghi Supabase.\n\n"+result.map(x=>"- "+x.name+": "+x.screenshot).join("\n")+"\n");
  console.log(result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
