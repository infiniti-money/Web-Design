/* Synthetic browser-only writes; every production Supabase request is blocked. */
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
function fixture(role){
  const rows=[{id:"project-a",slug:"cong-trinh-a",title:"Công trình kiểm thử A",category:"apartment",area:"80 m²",style:"Hiện đại",image_url:"https://example.invalid/a.jpg",summary:"Dữ liệu giả lập",sort_order:1,published:false},{id:"project-b",slug:"cong-trinh-b",title:"Công trình kiểm thử B",category:"house",area:"",style:"",image_url:"https://example.invalid/b.jpg",summary:"",sort_order:2,published:true}];
  const state=window.__projectsFixture={rows,writes:[],reads:[],mode:"success",delay:0,readError:false,readQueue:[],failAfterWrite:false};
  const clone=value=>JSON.parse(JSON.stringify(value));
  function from(table){
    let mode="read",payload,filters=[],head=false;
    const query={
      select(_fields,options){head=!!options?.head;return query;},
      eq(key,value){filters.push([key,value]);return query;},
      insert(value){mode="insert";payload=value;return query;},update(value){mode="update";payload=value;return query;},delete(){mode="delete";return query;},
      async single(){return execute(true);},then(resolve,reject){return execute(false).then(resolve,reject);}
    };
    for(const method of ["order","range","limit","in","neq","or","gte","lte","lt","gt","is","not"])query[method]=()=>query;
    async function execute(single){
      if(table==="staff_profiles")return{data:single?{role,active:true,full_name:"Tài khoản giả lập"}:[],error:null,count:0};
      if(table!=="projects")return{data:head?null:[],error:null,count:0};
      if(mode==="read"){
        state.reads.push(table);const queued=state.readQueue.shift();
        if(queued){await new Promise(resolve=>setTimeout(resolve,queued.delay||0));return{data:queued.data||[],error:queued.error||null};}
        return state.readError?{data:null,error:{message:"Fixture read unavailable"}}:{data:clone(rows),error:null};
      }
      state.writes.push({mode,filters:clone(filters),payload:payload?clone(payload):null});
      await new Promise(resolve=>setTimeout(resolve,state.delay));
      if(state.mode==="error")throw Error("Fixture connection interrupted");
      if(state.mode==="zero")return{data:null,error:null};
      if(state.mode==="wrong")return{data:{id:"wrong-project"},error:null};
      let row;
      if(mode==="insert"){row={id:"project-new",...payload};rows.push(row);}
      else{row=rows.find(item=>filters.every(([key,value])=>item[key]===value));if(row&&mode==="update")Object.assign(row,payload);if(row&&mode==="delete")rows.splice(rows.indexOf(row),1);}
      if(state.failAfterWrite)state.readError=true;
      return{data:row?{id:row.id}:null,error:null};
    }
    return query;
  }
  const user={id:"fixture-project-user",app_metadata:{role},email:"fixture@example.invalid"};
  window.supabase={createClient:()=>({from,rpc:async()=>({data:[],error:null}),auth:{getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session:{access_token:"SYNTHETIC"}},error:null}),signOut:async()=>({error:null})}})};
}
(async()=>{
  const base=process.env.SITE_URL||"https://infiniti-money.github.io/Web-Design/",browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});fs.mkdirSync("screenshots",{recursive:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/*.supabase.co/**",route=>route.abort());
    await page.route("https://example.invalid/**",route=>route.abort());
    await page.route("**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0",route=>route.fulfill({status:200,contentType:"application/javascript",body:`(${fixture.toString()})("admin");`}));
    await page.goto(new URL("admin.html#projects",base).href);await page.locator("#projects-table button").first().waitFor();
    const row=page.locator("#projects-table tr").filter({hasText:"Công trình kiểm thử A"});
    await row.getByRole("button",{name:"Sửa",exact:true}).click();await page.locator("#p-title").fill("Công trình chưa lưu");assert.match(await page.locator("#project-edit-state").innerText(),/chưa được xác nhận lưu/);
    const dialogs=[];let accept=false;page.on("dialog",dialog=>{dialogs.push(dialog.message());return accept?dialog.accept():dialog.dismiss();});
    await page.locator("#project-cancel").click();assert.equal(await page.locator("#p-title").inputValue(),"Công trình chưa lưu");
    await page.locator("#tab-overview").click();assert.equal(await page.locator("#panel-projects").isVisible(),true);assert.ok(dialogs.length>=2);
    await page.evaluate(()=>window.__projectsFixture.mode="zero");await page.locator("#project-save").click();await page.getByText(/Chưa xác nhận lưu công trình:/).waitFor();assert.equal(await page.locator("#p-title").inputValue(),"Công trình chưa lưu");assert.equal(await page.locator("#project-save").isDisabled(),false);
    await page.evaluate(()=>window.__projectsFixture.mode="wrong");await page.locator("#project-save").click();await page.waitForFunction(()=>window.__projectsFixture.writes.length===2&&!document.querySelector("#project-save").disabled);assert.match(await page.locator("#dash-status").innerText(),/Chưa xác nhận lưu công trình:/);assert.equal(await page.locator("#p-title").inputValue(),"Công trình chưa lưu");
    await page.evaluate(()=>{window.__projectsFixture.mode="success";window.__projectsFixture.delay=700;});accept=true;await page.locator("#project-save").click();assert.equal(await page.locator("#p-title").isDisabled(),true);assert.equal(await page.locator("#project-cancel").isDisabled(),true);await page.evaluate(()=>document.querySelector("#project-form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));await page.getByText(/^Đã xác nhận lưu công trình\./).waitFor();assert.equal(await page.evaluate(()=>window.__projectsFixture.writes.filter(write=>write.mode==="update").length),3);assert.equal(await page.locator("#p-title").inputValue(),"");
    await page.locator("#projects-table tr").filter({hasText:"Công trình chưa lưu"}).getByRole("button",{name:"Sửa",exact:true}).click();await page.locator("#p-title").fill("Nội dung giữ khi mạng lỗi");await page.evaluate(()=>window.__projectsFixture.mode="error");await page.locator("#project-save").click();await page.getByText(/Chưa xác nhận lưu công trình:/).waitFor();assert.equal(await page.locator("#p-title").inputValue(),"Nội dung giữ khi mạng lỗi");
    await page.locator("#project-cancel").click();await page.evaluate(()=>{window.__projectsFixture.mode="zero";window.__projectsFixture.delay=0;});await page.locator("#projects-table tr").first().getByRole("button",{name:"Xóa",exact:true}).click();await page.getByText(/Chưa xác nhận xóa công trình:/).waitFor();assert.equal(await page.locator("#projects-table tr").count(),2);
    await page.evaluate(()=>{window.__projectsFixture.mode="success";window.__projectsFixture.readError=true;});await page.locator("#reload-projects").click();await page.getByText(/Chưa tải được danh sách công trình\./).waitFor();assert.equal(await page.locator("#projects-table button").count(),0);assert.equal(await page.locator("#metric-projects").innerText(),"—");assert.match(await page.locator("#project-match-count").innerText(),/Chưa xác nhận/);
    await page.evaluate(()=>window.__projectsFixture.readError=false);await page.locator("#reload-projects").click();await page.locator("#projects-table button").first().waitFor();
    await page.evaluate(()=>{const s=window.__projectsFixture;s.readQueue=[{delay:600,data:[{...s.rows[0],title:"Kết quả cũ bị trễ"}]},{delay:10,data:s.rows.map(row=>({...row,title:"Kết quả mới "+row.id}))}];document.querySelector("#reload-projects").click();document.querySelector("#reload-projects").click();});await page.locator("#projects-table").getByText("Kết quả mới project-a",{exact:true}).waitFor();await page.waitForTimeout(750);assert.doesNotMatch(await page.locator("#projects-table").innerText(),/Kết quả cũ/);
    await page.locator("#projects-table tr").first().getByRole("button",{name:"Sửa",exact:true}).click();await page.locator("#p-title").fill("Đã ghi nhưng tải lại lỗi");await page.evaluate(()=>window.__projectsFixture.failAfterWrite=true);await page.locator("#project-save").click();await page.getByText(/Đã xác nhận lưu công trình, nhưng danh sách chưa tải lại được/).waitFor();assert.equal(await page.locator("#p-title").inputValue(),"");assert.equal(await page.locator("#metric-projects").innerText(),"—");
    await page.evaluate(()=>{window.__projectsFixture.failAfterWrite=false;window.__projectsFixture.readError=false;});await page.locator("#reload-projects").click();await page.locator("#projects-table button").first().waitFor();await page.locator("#projects-table tr").first().getByRole("button",{name:"Xóa",exact:true}).click();await page.getByText(/^Đã xác nhận xóa công trình\./).waitFor();assert.equal(await page.locator("#projects-table tr").count(),1);
    await page.locator("#p-title").fill("Công trình thêm mới");await page.locator("#p-image").fill("https://example.invalid/new.jpg");await page.locator("#project-save").click();await page.getByText(/^Đã xác nhận lưu công trình\./).waitFor();assert.equal(await page.locator("#projects-table tr").count(),2);assert.equal(await page.locator("#p-title").inputValue(),"");
    await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));await page.waitForFunction(()=>scrollY===0);await page.screenshot({path:"screenshots/projects-admin-desktop.png",fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector(".workspace-sidebar").getBoundingClientRect().right<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:"screenshots/projects-admin-mobile.png",fullPage:true});assert.deepEqual(errors,[]);
    await page.close();console.log("Projects Admin: dirty/tab guard, zero-row save/delete, pending lock/dedup, network preservation, read failure/unknown metrics, response ordering, acknowledged writes with failed refresh and mobile passed. No live writes.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
