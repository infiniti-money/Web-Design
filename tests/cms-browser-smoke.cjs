/* Browser integration tests. All Supabase calls are replaced with in-memory fixtures.
 * NODE_PATH=desktop/node_modules SITE_URL=http://127.0.0.1:4173/ node tests/cms-browser-smoke.cjs
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const origin=(process.env.SITE_URL||"http://127.0.0.1:4173/").replace(/\/+$/,"/");
const output=process.env.CMS_SCREENSHOT_DIR||path.resolve("desktop/test-artifacts");
fs.mkdirSync(output,{recursive:true});

function installFixture(role,seed){
  const id="d0a00000-0000-4000-8000-000000000101";
  const now=()=>new Date().toISOString();
  const profile={user_id:id,role,active:true,full_name:"Tài khoản kiểm thử",email:"fixture@example.invalid"};
  const user={id,email:profile.email,app_metadata:{role}};
  const state=window.__cmsFixture={role,user,writes:[],conflict:false,writeDelay:0,readDelays:{},readCompleted:[],sequence:0,rows:{cms_posts:seed||[],cms_post_revisions:[],staff_profiles:[profile],inquiries:[{id:"client-1",full_name:"KHÁCH GIẢ LẬP"}],customer_quotes:[{id:"quote-1",title:"Báo giá kiểm thử giao diện",status:"draft",inquiry_id:"client-1",approved_version_id:null}],customer_quote_versions:[],customer_contracts:[],commercial_audit:[]}};
  function query(table){
    let mode="read",payload,filters=[],from=0,to=Infinity,count=false,single=false,ordering=null;
    const q={
      select(_fields,options){count=!!options?.count;return q;},
      eq(key,value){filters.push([key,"eq",value]);return q;},
      in(key,value){filters.push([key,"in",value]);return q;},
      ilike(key,value){filters.push([key,"ilike",value]);return q;},
      order(key,options){ordering=[key,options?.ascending!==false];return q;},
      range(start,end){from=start;to=end;return q;},limit(limit){to=limit-1;return q;},
      insert(value){mode="insert";payload=value;return q;},
      update(value){mode="update";payload=value;return q;},
      single(){single=true;return execute();},maybeSingle(){single=true;return execute();},
      then(resolve,reject){return execute().then(resolve,reject);}
    };
    async function execute(){
      let rows=state.rows[table]||[];
      const matches=row=>filters.every(([key,op,value])=>op==="eq"?row[key]===value:op==="in"?value.includes(row[key]):String(row[key]||"").toLowerCase().includes(value.replace(/[%\\]/g,"").toLowerCase()));
      if(mode!=="read"){
        if(state.writeDelay)await new Promise(resolve=>setTimeout(resolve,state.writeDelay));
        state.writes.push({mode,table,payload:JSON.parse(JSON.stringify(payload)),filters:JSON.parse(JSON.stringify(filters))});
        if(mode==="update"&&state.conflict)return{data:null,error:null};
        let row;
        if(mode==="insert"){
          row={...payload,id:"post-"+(++state.sequence),author_id:id,version:1,created_at:now(),updated_at:now(),published_at:payload.status==="published"?(payload.published_at||now()):null};
          state.rows[table].push(row);
        }else{
          row=rows.find(matches);if(!row)return{data:null,error:null};
          Object.assign(row,payload,{version:row.version+1,updated_at:now()});
          if(row.status==="published"&&!row.published_at)row.published_at=now();
        }
        if(table==="cms_posts")state.rows.cms_post_revisions.push({post_id:row.id,version:row.version,created_at:now(),snapshot:JSON.parse(JSON.stringify(row))});
        return{data:JSON.parse(JSON.stringify(row)),error:null};
      }
      const requestedId=table==="cms_posts"&&single?filters.find(([key,op])=>key==="id"&&op==="eq")?.[2]:null;
      if(requestedId){if(state.readDelays[requestedId])await new Promise(resolve=>setTimeout(resolve,state.readDelays[requestedId]));state.readCompleted.push(requestedId);}
      if(table==="staff_profiles"&&single)return{data:{...profile},error:null};
      rows=rows.filter(matches);
      if(ordering)rows=[...rows].sort((a,b)=>String(a[ordering[0]]??"").localeCompare(String(b[ordering[0]]??""))*(ordering[1]?1:-1));
      const total=rows.length;rows=rows.slice(from,Number.isFinite(to)?to+1:undefined);
      return{data:single?(rows[0]?JSON.parse(JSON.stringify(rows[0])):null):JSON.parse(JSON.stringify(rows)),error:null,...(count?{count:total}:{})};
    }
    return q;
  }
  const db={auth:{getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session:{access_token:"TEST_NOT_REAL"}},error:null}),signOut:async()=>({error:null})},from:query,
    rpc:async(name,args)=>{
      state.writes.push({mode:"rpc",name,args:JSON.parse(JSON.stringify(args))});
      if(name==="commercial_action"&&args.p_action==="revise")state.rows.customer_quote_versions.unshift({id:"version-"+(++state.sequence),quote_id:args.p_id,version_no:state.rows.customer_quote_versions.length+1,total_amount:args.p_amount,content:args.p_content});
      return{data:args.p_id||"new-quote",error:null};
    }};
  window.supabase={createClient:()=>db};
}

async function pageWithFixture(browser,role="admin",seed=[]){
  const page=await browser.newPage({viewport:{width:1440,height:980},locale:"vi-VN"});
  page.fixtureErrors=[];page.on("pageerror",error=>page.fixtureErrors.push(error.message));
  page.on("dialog",dialog=>dialog.accept());
  await page.route("**/*.supabase.co/**",route=>route.abort("blockedbyclient"));
  await page.route("**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0",route=>route.fulfill({status:200,contentType:"application/javascript",body:`(${installFixture.toString()})(${JSON.stringify(role)},${JSON.stringify(seed)});`}));
  await page.route("https://example.test/**",route=>route.abort("blockedbyclient"));
  return page;
}

async function cms(browser){
  const page=await pageWithFixture(browser);
  await page.goto(new URL("admin-posts.html",origin).href,{waitUntil:"domcontentloaded"});
  await page.locator("#cms-app:not(.hide)").waitFor();
  await page.locator(".workspace-sidebar").waitFor();
  await page.locator("#post-title").fill("Hướng dẫn kiểm thử bản nháp");
  assert.equal(await page.locator("#post-slug").inputValue(),"huong-dan-kiem-thu-ban-nhap");
  await page.locator("#post-excerpt").fill("Bản mô tả giả lập đủ dài để kiểm thử luồng xuất bản bài viết, không phải nội dung thực tế.");
  const malicious='# Tiêu đề thử nghiệm\n\nNội dung kiểm thử chức năng soạn thảo và lưu bản nháp. Nội dung này chỉ được giữ trong bộ giả lập.\n\n<img src="https://example.test/image.webp" onerror="window.__cmsXss=1"><script>window.__cmsXss=2</script>\n\n[Không hợp lệ](javascript:window.__cmsXss=3)';
  await page.locator("#post-body").fill(malicious);
  await page.locator("#post-preview-tab").click();
  assert.equal(await page.locator("#post-preview script, #post-preview [onerror], #post-preview a[href^='javascript:'], #post-preview h1").count(),0);
  assert.equal(await page.evaluate(()=>window.__cmsXss),undefined);
  await page.locator("#post-edit-tab").click();
  await page.locator("#post-body").fill("## Chuẩn bị cho không gian sống\n\nNội dung giả lập để kiểm thử quy trình viết bài, lưu phiên bản và duyệt xuất bản. Bản này không được gửi đến cơ sở dữ liệu thật.\n\n- Làm rõ nhu cầu sử dụng\n- Chuẩn bị mặt bằng và hình ảnh tham khảo\n- Xác định các ưu tiên trước khi triển khai");
  await page.evaluate(()=>window.__cmsFixture.writeDelay=1200);
  await page.locator("#post-save").click();
  assert.equal(await page.locator("#post-save").isDisabled(),true);
  assert.equal(await page.locator("#post-title").isDisabled(),true);
  assert.equal(await page.locator("#post-new").isDisabled(),true);
  await page.evaluate(()=>document.querySelector("#post-form").dispatchEvent(new Event("submit",{cancelable:true,bubbles:true})));
  await page.locator(".workspace-logo").click();
  assert.ok(page.url().includes("/admin-posts.html"),"Navigation must stay on the editor while a save is pending");
  await page.locator("#post-save-state").getByText("Đã lưu · phiên bản 1",{exact:true}).waitFor();
  await page.evaluate(()=>window.__cmsFixture.writeDelay=0);
  assert.equal(await page.locator("#post-title").isDisabled(),false);
  let writes=await page.evaluate(()=>window.__cmsFixture.writes);
  assert.equal(writes.length,1);assert.equal(writes[0].mode,"insert");assert.equal(writes[0].payload.status,"draft");
  const preserved="Nội dung cần giữ lại khi có xung đột phiên bản. ".repeat(5);
  await page.locator("#post-body").fill(preserved);
  await page.evaluate(()=>window.__cmsFixture.conflict=true);
  await page.locator("#post-save").click();
  await page.locator("#cms-status").getByText("Bài viết đã được người khác thay đổi.",{exact:false}).waitFor();
  assert.equal(await page.locator("#post-body").inputValue(),preserved);
  assert.equal(await page.locator("#post-save-state").innerText(),"Có thay đổi chưa lưu");
  writes=await page.evaluate(()=>window.__cmsFixture.writes);
  assert.ok(writes.at(-1).filters.some(([key,,value])=>key==="version"&&value===1));
  await page.evaluate(()=>window.__cmsFixture.conflict=false);
  await page.locator("#post-save").click();
  await page.locator("#post-save-state").getByText("Đã lưu · phiên bản 2",{exact:true}).waitFor();
  await page.locator("#post-history-load").click();
  await page.locator("#post-history button").filter({hasText:"phiên bản 1"}).click();
  assert.equal(await page.locator("#post-status").inputValue(),"draft");
  await page.locator("#post-save").click();
  await page.locator("#post-save-state").getByText("Đã lưu · phiên bản 3",{exact:true}).waitFor();
  writes=await page.evaluate(()=>window.__cmsFixture.writes);
  assert.ok(writes.at(-1).filters.some(([key,,value])=>key==="version"&&value===2));
  await page.locator("#post-status").selectOption("published");
  await page.locator("#post-form details").evaluate(element=>element.open=true);
  await page.locator("#post-cover").fill("https://example.test/cover.webp");
  const writesBefore=await page.evaluate(()=>window.__cmsFixture.writes.length);
  await page.locator("#post-save").click();
  await page.locator("#cms-status").getByText("Hãy bổ sung mô tả ảnh",{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>window.__cmsFixture.writes.length),writesBefore);
  await page.locator("#post-alt").fill("Ảnh chỉ dùng kiểm thử");
  await page.locator("#post-image-rights").check();
  await page.locator("#post-save").click();
  await page.locator("#post-save-state").getByText("Đã lưu · phiên bản 4",{exact:true}).waitFor();
  assert.equal(await page.locator("#post-view-live").isVisible(),true);
  await page.locator("#post-preview-tab").click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(output,"cms.png")});
  await page.locator("#post-status").selectOption("archived");
  await page.locator("#post-save").click();
  await page.locator("#post-save-state").getByText("Đã lưu · phiên bản 5",{exact:true}).waitFor();
  assert.equal(await page.locator("#post-view-live").isVisible(),false);
  assert.deepEqual(page.fixtureErrors,[]);
  await page.close();
  console.log("CMS: draft create/edit, optimistic conflict preservation, revisions, Markdown sanitization, image permission gate, publish/archive passed with in-memory fixtures.");
}

async function roles(browser){
  const seed=[{id:"own-draft",author_id:"d0a00000-0000-4000-8000-000000000101",title:"Bản nháp của quản lý",slug:"ban-nhap-quan-ly",excerpt:"",body_markdown:"",category:"Kinh nghiệm",status:"draft",version:1,created_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-01T00:00:00Z"},{id:"other-draft",author_id:"other-user",title:"Bài của người khác",status:"draft",version:1}];
  const manager=await pageWithFixture(browser,"manager",seed);
  await manager.goto(new URL("admin-posts.html",origin).href,{waitUntil:"domcontentloaded"});await manager.locator("#cms-app:not(.hide)").waitFor();
  assert.equal(await manager.locator('#post-status option[value="published"],#post-status option[value="archived"]').count(),0);
  assert.equal(await manager.locator("#post-schedule-field").isVisible(),false);
  await manager.locator("#post-list .cms-post").waitFor();assert.equal(await manager.locator("#post-list .cms-post").count(),1);
  assert.equal(await manager.locator('.workspace-sidebar a[href="./admin.html#staff"]').count(),0);
  await manager.locator("#post-list .cms-post").click();await manager.locator("#post-status").selectOption("review");await manager.locator("#post-save").click();await manager.locator("#post-save-state").getByText("Đã lưu · phiên bản 2",{exact:true}).waitFor();
  const payload=await manager.evaluate(()=>window.__cmsFixture.writes.at(-1).payload);assert.equal(payload.status,"review");assert.equal(Object.hasOwn(payload,"published_at"),false);
  await manager.setViewportSize({width:390,height:844});
  assert.equal(await manager.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+3),false);
  await manager.locator(".workspace-menu").press("Enter");
  assert.equal(await manager.locator(".workspace-sidebar").evaluate(element=>element.inert),false);
  await manager.keyboard.press("Escape");assert.equal(await manager.locator(".workspace-sidebar").evaluate(element=>element.inert),true);
  await manager.evaluate(()=>window.scrollTo(0,0));await manager.screenshot({path:path.join(output,"cms-mobile.png")});
  assert.deepEqual(manager.fixtureErrors,[]);await manager.close();
  const employee=await pageWithFixture(browser,"employee");await employee.goto(new URL("admin-posts.html",origin).href,{waitUntil:"domcontentloaded"});await employee.locator("#cms-status").getByText("Tài khoản không có quyền quản lý bài viết.",{exact:true}).waitFor();assert.equal(await employee.locator("#cms-app").isVisible(),false);assert.equal(await employee.locator("#post-new").isDisabled(),true);assert.deepEqual(await employee.evaluate(()=>window.__cmsFixture.writes),[]);assert.deepEqual(employee.fixtureErrors,[]);await employee.close();
  console.log("CMS ROLES: manager owns draft/review only in UI; employee denied without data writes.");
}

async function staleOpen(browser){
  const base={author_id:"d0a00000-0000-4000-8000-000000000101",excerpt:"",body_markdown:"Nội dung giả lập",category:"Kinh nghiệm",status:"draft",version:1,created_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-01T00:00:00Z"};
  const page=await pageWithFixture(browser,"admin",[{...base,id:"slow-post",slug:"bai-cham",title:"Bài tải chậm"},{...base,id:"fast-post",slug:"bai-nhanh",title:"Bài chọn sau"}]);
  await page.goto(new URL("admin-posts.html",origin).href,{waitUntil:"domcontentloaded"});await page.locator("#cms-app:not(.hide)").waitFor();
  await page.evaluate(()=>{window.__cmsFixture.readDelays={"slow-post":900,"fast-post":10};});
  await page.locator('.cms-post[data-id="slow-post"]').click();await page.locator('.cms-post[data-id="fast-post"]').click();
  await page.waitForFunction(()=>window.__cmsFixture.readCompleted.includes("slow-post"));
  assert.equal(await page.locator("#post-title").inputValue(),"Bài chọn sau","An older response must not replace the most recently opened article");
  assert.deepEqual(page.fixtureErrors,[]);await page.close();console.log("CMS RACE: delayed responses cannot overwrite the most recent article selection.");
}

async function quotes(browser){
  const page=await pageWithFixture(browser);
  await page.goto(new URL("commercial.html",origin).href,{waitUntil:"domcontentloaded"});
  await page.locator("#app:not([hidden])").waitFor();
  await page.locator("#quotes button").filter({hasText:/^Thêm phiên bản$/}).click();
  const dialog=page.locator("dialog.quote-dialog");await dialog.waitFor();
  await dialog.getByLabel("Mô tả hạng mục",{exact:true}).fill("Hạng mục giả lập A");await dialog.getByLabel("Số lượng",{exact:true}).fill("2.5");await dialog.getByLabel("Đơn giá VND",{exact:true}).fill("12345");
  await dialog.getByRole("button",{name:"+ Thêm hạng mục",exact:true}).click();await dialog.getByLabel("Mô tả hạng mục",{exact:true}).nth(1).fill("Hạng mục giả lập B");await dialog.getByLabel("Số lượng",{exact:true}).nth(1).fill("1");await dialog.getByLabel("Đơn giá VND",{exact:true}).nth(1).fill("10000");
  await dialog.getByLabel("Giảm trừ (VND)",{exact:true}).fill("1000");await dialog.getByLabel("Thuế suất (%)",{exact:true}).fill("8");
  assert.match(await dialog.locator(".grand strong").innerText(),/43.052/);
  await dialog.getByRole("button",{name:"Lưu phiên bản",exact:true}).click();await dialog.waitFor({state:"detached"});
  const calls=await page.evaluate(()=>window.__cmsFixture.writes.filter(write=>write.mode==="rpc"));assert.equal(calls.length,1);assert.equal(calls[0].args.p_action,"revise");assert.equal(calls[0].args.p_amount,43052);assert.equal(calls[0].args.p_content.items.length,2);assert.equal(calls[0].args.p_content.items[0].amount,30863);assert.equal(calls[0].args.p_content.tax_amount,3189);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator("#quotes button").filter({hasText:"Xem / xuất PDF"}).click();const preview=page.locator("dialog.quote-document");await preview.waitFor();assert.match(await preview.locator(".grand strong").innerText(),/43.052/);assert.equal(await preview.locator("tbody tr").count(),2);assert.match(await preview.locator(".document-state").innerText(),/nháp/i);await page.screenshot({path:path.join(output,"quote-preview.png")});assert.deepEqual(page.fixtureErrors,[]);await preview.getByRole("button",{name:"Đóng",exact:true}).click();await page.close();
  console.log("QUOTE: structured line items, fractional quantity, integer VND rounding, discount/tax, RPC payload and print preview passed.");
}

(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:["--no-sandbox"]});try{await cms(browser);await roles(browser);await staleOpen(browser);await quotes(browser);console.log("CMS/quotation browser smoke passed. Supabase network requests were blocked; no live writes.");}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
