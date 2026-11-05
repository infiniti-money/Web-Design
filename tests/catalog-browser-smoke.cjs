"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const home=(process.env.SITE_URL||"http://127.0.0.1:4173/").replace(/\/?$/,"/");
function fixture(role){
  const items=[
    {id:"a",name:"Đèn trần",category:"Thiết bị",style:"Hiện đại",description:"Ánh sáng",image_url:"",sort_order:1,published:true},
    {id:"b",name:"Bàn gỗ",category:"Mẫu nội thất",style:"Japandi",description:"Gỗ tự nhiên",image_url:"",sort_order:2,published:false}
  ];
  const current={id:"ci-admin",app_metadata:{role}};
  window.supabase={createClient:()=>({
    auth:{getUser:async()=>({data:{user:current},error:null})},
    from(table){
      let mode="read",payload,selected;
      const q={
        select(){return q},eq(key,value){selected={key,value};return q},order(){return q},
        limit:async()=>({data:items.map(x=>({...x})),error:null}),
        insert(value){mode="insert";payload=value;return q},
        update(value){mode="update";payload=value;return q},
        delete(){mode="delete";return q},
        async single(){
          if(table==="staff_profiles")return{data:{role,active:true,full_name:"Admin thử nghiệm"},error:null};
          let row;
          if(mode==="insert"){row={id:"item-"+(items.length+1),...payload};items.push(row);}
          else{row=items.find(x=>x[selected?.key]===selected?.value);
            if(row&&mode==="update")Object.assign(row,payload);
            if(row&&mode==="delete")items.splice(items.indexOf(row),1);
          }
          return{data:row?{id:row.id}:null,error:row?null:{message:"No row"}};
        }
      };return q;
    }
  })};
  window.__catalogFixture={items};
}
async function open(browser,role){
  const page=await browser.newPage({viewport:{width:430,height:900}});
  await page.route("**/*.supabase.co/**",r=>r.abort("blockedbyclient"));
  await page.route("**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0",r=>
    r.fulfill({status:200,contentType:"application/javascript",body:"("+fixture.toString()+")("+JSON.stringify(role)+");"}));
  const response=await page.goto(home+"admin-catalog.html",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  return page;
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{
    const page=await open(browser,"admin");
    await page.locator("#workspace:not(.hide)").waitFor();
    await page.locator("#visibility").selectOption("draft");
    assert.equal(await page.locator("#items article").count(),1);
    await page.locator("#search").fill("ban go");
    assert.equal(await page.locator("#items article").count(),1);
    assert.match(await page.locator("#items article").innerText(),/Bàn gỗ/);
    await page.locator('#items button:has-text("Sửa")').click();
    await page.locator("#name").fill("Bàn gỗ kiểm thử");
    const listener=async dialog=>dialog.dismiss();
    page.once("dialog",listener);
    await page.locator("#reset").click();
    assert.equal(await page.locator("#name").inputValue(),"Bàn gỗ kiểm thử");
    page.once("dialog",async dialog=>dialog.accept());
    await page.locator("#reset").click();
    assert.equal(await page.locator("#name").inputValue(),"");
    await page.locator("#search").fill("");
    await page.locator('#items button:has-text("Sửa")').click();
    await page.locator("#published").check();
    page.once("dialog",async dialog=>dialog.accept());
    await page.locator("#save").click();
    await page.locator("#status").getByText("Đã lưu mục Catalog.").waitFor();
    await page.locator("#visibility").selectOption("published");
    assert.equal(await page.locator("#items article").count(),2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.close();
    const employee=await open(browser,"employee");
    await employee.locator("#status").getByText(/cần đăng nhập bằng tài khoản Admin/).waitFor();
    assert.equal(await employee.locator("#workspace").isVisible(),false);
    await employee.close();
    console.log("CATALOG PASS: role gate, accent search, draft/published, unsaved warning, publish confirmation, confirmed save, mobile.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
