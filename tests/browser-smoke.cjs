/* Browser-level smoke tests against deployed GitHub Pages.
 * Read-only test: never submits personal data or changes project content.
 * Run with: npm install --no-save playwright@1.56.1 && npx playwright install chromium
 *           node tests/browser-smoke.cjs
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium, devices } = require("playwright");

const origin = (process.env.SITE_URL || "https://infiniti-money.github.io/Web-Design/").replace(/\/+$/, "/");
const out = process.env.SCREENSHOT_DIR || "screenshots";
fs.mkdirSync(out, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const consoleErrors = [];
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
    desktop.on("pageerror", error => consoleErrors.push("home: " + error.message));
    // The deployed website has a real Turnstile sitekey. Mock ONLY the browser
    // challenge in this read-only smoke test; never bypass server Siteverify.
    await desktop.route("**/challenges.cloudflare.com/turnstile/v0/api.js**", route =>
      route.fulfill({status:200,contentType:"application/javascript",body:
        'window.turnstile={render:function(el,opts){opts.callback("ci-browser-challenge");return "widget";},reset:function(){}};'}));
    const projectsResponse = desktop.waitForResponse(
      r => r.url().includes("/rest/v1/projects?") && r.request().method() === "GET",
      { timeout: 45000 }
    );
    const response = await desktop.goto(origin, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.equal(response?.status(), 200, "GitHub Pages must return HTTP 200 for homepage");
    const api = await projectsResponse;
    assert.equal(api.status(), 200, "Live project query must return HTTP 200");
    await desktop.locator("#project-grid article.project").first().waitFor({ timeout: 15000 });
    const projects = await desktop.locator("#project-grid article.project").count();
    assert.equal(projects, 6, "Expected six published sample projects");
    assert.equal(await desktop.locator("#admin-live-link").isVisible(), true, "Admin link should show in live mode");
    assert.equal(await desktop.locator("#admin-toggle").isVisible(), false, "Publicly accessible demo lead panel must be hidden in live mode");
    assert.equal(await desktop.locator("#lead-form").count(), 1);
    await desktop.screenshot({ path: out + "/atelier-desktop.png", fullPage: true });
    console.log("HOME: HTTP", response.status(), "| Supabase API", api.status(), "| projects", projects);

    // Verify category filter and keyboard modal interactions.
    const apartment = desktop.locator('.filter[data-filter="apartment"]');
    await apartment.click();
    const filtered = await desktop.locator("#project-grid article.project").count();
    assert.ok(filtered >= 1 && filtered < projects, "Apartment filter should narrow the results");
    await desktop.locator("#project-grid article.project").first().press("Enter");
    assert.equal(await desktop.locator("#project-modal").getAttribute("aria-hidden"), "false");
    await desktop.keyboard.press("Escape");
    assert.equal(await desktop.locator("#project-modal").getAttribute("aria-hidden"), "true");
    console.log("INTERACTION: category filter and modal keyboard controls passed");

    // Exercise the real consultation form without storing synthetic customer PII.
    // Block all legacy client-side INSERTs, even when Pages serves a stale build.
    await desktop.route("**/rest/v1/inquiries**", route => {
      if (route.request().method() === "POST") {
        return route.fulfill({status:403,contentType:"application/json",
          body:JSON.stringify({code:"TEST_BLOCKED_LEGACY_WRITE"})});
      }
      return route.continue();
    });
    const intercepted = [];
    await desktop.route("**/functions/v1/submit-inquiry", async route => {
      const payload = route.request().postDataJSON();
      intercepted.push(payload);
      assert.equal(route.request().method(), "POST");
      await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({ok:true})});
    });
    await desktop.locator("#full-name").fill("Người kiểm thử");
    await desktop.locator("#phone").fill("0900000000");
    await desktop.locator("#service").selectOption({label:"Thiết kế nội thất"});
    await desktop.locator("#consent").check();
    await desktop.locator("#lead-form [type=submit]:not([disabled])").waitFor({timeout:15000});
    await desktop.locator("#lead-form [type=submit]").click();
    await desktop.locator("#form-feedback").getByText("Yêu cầu đã được hệ thống ghi nhận").waitFor();
    assert.equal(intercepted.length,1,"Form must use Edge Function exactly once");
    assert.equal(intercepted[0].full_name,"Người kiểm thử");
    assert.equal(intercepted[0].privacy_consent,true,"Website must forward affirmative consent");
    assert.equal(intercepted[0].turnstile_token,"ci-browser-challenge",
      "Real-sitekey client must forward challenge after client-side verification");
    console.log("CONSULTATION: Edge Function request sent; mocked success without writing customer data");

    // Privacy notice must be published and linked by the consultation form.
    const privacyResponse = await desktop.request.get(new URL("privacy.html",origin).toString());
    assert.equal(privacyResponse.status(),200,"Privacy page must be accessible");
    const privacyHtml = await privacyResponse.text();
    assert.match(privacyHtml, /Chính sách quyền riêng tư/);
    assert.match(privacyHtml, /Tân Design/);
    assert.match(privacyHtml, /Tân Phú, Việt Yên, Hưng Yên/);
    assert.match(privacyHtml, /infinitimoney@icloud\.com/);
    assert.match(privacyHtml, /12 tháng kể từ lần liên hệ cuối cùng/);
    assert.equal(await desktop.locator('footer a[href="mailto:infinitimoney@icloud.com"]').count(),1);
    assert.equal(await desktop.locator('#lead-form a[href="./privacy.html"]').count(),1);
    console.log("PRIVACY: published policy HTTP 200 and form link verified");

    const admin = await browser.newPage({ viewport: { width: 1280, height: 850 }, locale: "vi-VN" });
    admin.on("pageerror", error => consoleErrors.push("admin: " + error.message));
    const ar = await admin.goto(new URL("admin.html", origin).toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.equal(ar?.status(), 200, "Admin page must be reachable");
    await admin.locator("#login-panel:not(.hide)").waitFor({ timeout: 25000 });
    assert.equal(await admin.locator("#setup-panel").isVisible(), false, "Admin should have valid Supabase configuration");
    await admin.screenshot({ path: out + "/atelier-admin-login.png", fullPage: true });
    console.log("ADMIN: HTTP", ar.status(), "| login form visible; no credentials submitted");

    // UI CRUD with a mocked *authorized* Supabase client; never use admin passwords in CI.
    const adminCRUD = await browser.newPage({viewport:{width:1440,height:900}});
    await adminCRUD.route("**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0",route=>
      route.fulfill({status:200,contentType:"application/javascript",body:`
window.supabase={createClient:()=>{
 let records=[];
 let careNotes=[];
 let noteRevisions=[];
 let careTasks=[];
 let taskEvents=[];
 let inquiries=[{id:"inquiry-mock-1",full_name:"KHÁCH KIỂM THỬ GIẢ",phone:"0900000000",
   service:"Thiết kế nội thất",space:"Căn hộ",details:"CI ONLY",status:"new",
   created_at:"2026-10-31T00:00:00.000Z",consented_at:"2026-10-31T00:00:00.000Z",
   privacy_policy_version:"2026-10-31-retention-12m",last_contacted_at:null,legal_hold_until:null,follow_up_at:null}];
 window.__ci_seed_extra_leads = count => {
   for(let i=0;i<count;i++)inquiries.push({
     id:"lead-extra-"+i,full_name:"KHÁCH GIẢ "+i,phone:"0900001"+String(i).padStart(3,"0"),
     service:"Thiết kế nội thất",space:"Căn hộ",details:"SYNTHETIC_CI_"+i,
     status:"new",created_at:"2026-10-31T00:00:00.000Z",
     consented_at:"2026-10-31T00:00:00.000Z",
     privacy_policy_version:"2026-10-31-retention-12m",
     last_contacted_at:null,legal_hold_until:null,follow_up_at:null
   });
 };
 return {
   rpc(name,args) {
     if(name==="edit_inquiry_care_note"){
       const item=careNotes.find(row=>row.id===args.p_note_id && row.editable===true);
       if(!item)return Promise.resolve({data:false,error:null});
       if(item.updated_at!==args.p_expected_updated_at)return Promise.resolve({data:null,error:{message:"STALE_NOTE"}});
       noteRevisions.push({
         id:"rev-"+noteRevisions.length,note_id:item.id,inquiry_id:item.inquiry_id,
         previous_body:item.body,revised_body:args.p_body,edited_at:new Date().toISOString()
       });
       item.body=args.p_body;item.updated_at=new Date(Date.now()+1000).toISOString();
       return Promise.resolve({data:true,error:null});
     }
     if(name==="complete_inquiry_followup"){
       const item=inquiries.find(row=>row.id===args.p_inquiry_id);
       if(!item||!item.follow_up_at)return Promise.resolve({data:false,error:null});
       item.follow_up_at=null;
       careNotes.push({id:"care-"+careNotes.length,inquiry_id:item.id,note_kind:"reminder",
         body:"Đã hoàn thành công việc nhắc liên hệ",editable:false,
         created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
       return Promise.resolve({data:true,error:null});
     }
     if(name==="update_inquiry_status_with_log"){
       const item=inquiries.find(row=>row.id===args.p_inquiry_id);
       if(!item)return Promise.resolve({data:false,error:null});
       item.status=args.p_status;
       careNotes.push({id:"care-"+careNotes.length,inquiry_id:item.id,note_kind:"note",
         body:"Đã chuyển trạng thái: "+args.p_status,created_at:new Date().toISOString()});
       return Promise.resolve({data:true,error:null});
     }
     if(name==="schedule_inquiry_followup"){
       const item=inquiries.find(row=>row.id===args.p_inquiry_id);
       if(!item)return Promise.resolve({data:false,error:null});
       item.follow_up_at=args.p_due_at;
       careNotes.push({id:"care-"+careNotes.length,inquiry_id:item.id,note_kind:"reminder",
         body:args.p_due_at?"Đặt lịch nhắc liên hệ":"Hủy lịch nhắc liên hệ",
         scheduled_for:args.p_due_at,created_at:new Date().toISOString()});
       return Promise.resolve({data:true,error:null});
     }
     if(name!=="record_inquiry_contact")return Promise.resolve({data:null,error:{message:"Unknown RPC"}});
     const item=inquiries.find(row=>row.id===args.p_inquiry_id);
     if(!item)return Promise.resolve({data:false,error:null});
     item.last_contacted_at=new Date().toISOString();
     if(item.status==="new")item.status="contacted";
     careNotes.push({id:"care-"+careNotes.length,inquiry_id:item.id,note_kind:"note",
       body:"Đã ghi nhận liên hệ thực tế",created_at:new Date().toISOString()});
     return Promise.resolve({data:true,error:null});
   },
   auth:{getUser:async()=>({data:{user:{email:"test-admin@example.invalid",app_metadata:{role:"admin"}}},error:null}),
         signOut:async()=>({error:null})},
   from(table) {
     const q={
       conditions:[],head:false,countRequested:false,term:"",
       filtered(){
         let items=table==="projects"?[...records]:table==="inquiries"?[...inquiries]:
           table==="inquiry_care_notes"?[...careNotes]:table==="inquiry_care_note_revisions"?[...noteRevisions]:
           table==="inquiry_care_tasks"?careTasks.map(x=>({...x,inquiries:{full_name:inquiries.find(i=>i.id===x.inquiry_id)?.full_name||""}})):
           table==="inquiry_care_task_events"?[...taskEvents]:[];
         for(const fn of q.conditions)items=items.filter(fn);
         if(q.term)items=items.filter(row=>[row.full_name,row.phone,row.service,row.space,row.details]
           .some(value=>String(value||"").toLowerCase().includes(q.term)));
         return items;
       },
       select(_fields,options){q.head=!!options?.head;q.countRequested=options?.count==="exact";return q},
       order(){return q},
       eq(key,value){q.conditions.push(row=>row[key]===value);return q},
       gte(key,value){q.conditions.push(row=>row[key]>=value);return q},
       gt(key,value){q.conditions.push(row=>row[key]>value);return q},
       lt(key,value){q.conditions.push(row=>row[key]!=null && row[key]<value);return q},
       neq(key,value){q.conditions.push(row=>row[key]!==value);return q},
       ilike(key,value){
         const term=String(value).replace(/%/g,"").toLowerCase();
         q.conditions.push(row=>String(row[key]||"").toLowerCase().includes(term));return q;
       },
       lte(key,value){q.conditions.push(row=>row[key] && row[key]<=value);return q},
       or(expression){const match=/full_name\.ilike\.%([^%]*)%/.exec(expression);q.term=(match?.[1]||"").toLowerCase();return q},
       range(start,end){const items=q.filtered();return Promise.resolve({data:items.slice(start,end+1),count:q.countRequested?items.length:null,error:null})},
       then(ok,fail){const items=q.filtered();return Promise.resolve({data:q.head?null:items,count:q.countRequested?items.length:null,error:null}).then(ok,fail)},
       insert(value){
         if(table==="inquiry_care_notes"){
           const ts=new Date().toISOString();
           careNotes.push({id:"care-"+careNotes.length,created_at:ts,updated_at:ts,editable:true,note_kind:"note",...value});
         }
         else if(table==="inquiry_care_tasks"){
           const ts=new Date().toISOString();
           const record={id:"task-"+careTasks.length,created_at:ts,status:"todo",completed_at:null,...value};
           careTasks.push(record);
           taskEvents.push({id:"event-"+taskEvents.length,inquiry_id:record.inquiry_id,task_id:record.id,
             event_type:"created",current_value:record.assignee_name,created_at:ts});
         } else records.push({id:"project-"+(records.length+1),...value});
         return Promise.resolve({error:null});
       },
       update(value){return{eq(key,id){
         const items=table==="inquiries"?inquiries:table==="inquiry_care_tasks"?careTasks:records;
         const item=items.find(r=>r[key]===id);
         if(item&&table==="inquiry_care_tasks"){
           if(value.status && value.status!==item.status)taskEvents.push({
             id:"event-"+taskEvents.length,inquiry_id:item.inquiry_id,task_id:item.id,
             event_type:"status_changed",previous_value:item.status,current_value:value.status,
             created_at:new Date().toISOString()
           });
           if(value.assignee_name && value.assignee_name!==item.assignee_name)taskEvents.push({
             id:"event-"+taskEvents.length,inquiry_id:item.inquiry_id,task_id:item.id,
             event_type:"reassigned",previous_value:item.assignee_name,current_value:value.assignee_name,
             created_at:new Date().toISOString()
           });
           for(const [key,type] of [["title","title_changed"],["details","details_changed"],
             ["priority","priority_changed"],["due_at","due_changed"]]){
             if(Object.hasOwn(value,key)&&value[key]!==item[key])taskEvents.push({
               id:"event-"+taskEvents.length,inquiry_id:item.inquiry_id,task_id:item.id,
               event_type:type,previous_value:item[key],current_value:value[key],
               created_at:new Date().toISOString()
             });
           }
         }
         if(item)Object.assign(item,value);
         return Promise.resolve({error:null})}}},
       delete(){return{eq(key,id){
         if(table==="inquiries")inquiries=inquiries.filter(r=>r[key]!==id);
         else records=records.filter(r=>r[key]!==id);
         return Promise.resolve({error:null})}}}
     };return q;
   }
 };
}};`}));
    await adminCRUD.goto(new URL("admin.html",origin).toString(),{waitUntil:"domcontentloaded",timeout:45000});
    await adminCRUD.locator("#dashboard:not(.hide)").waitFor({timeout:15000});
    await adminCRUD.locator("#p-title").fill("Thử nghiệm giao diện");
    await adminCRUD.locator("#p-slug").fill("thu-nghiem-giao-dien");
    await adminCRUD.locator("#p-image").fill("https://example.com/test.jpg");
    await adminCRUD.locator("#project-save").click();
    await adminCRUD.locator("#projects-table").getByText("Thử nghiệm giao diện").waitFor();
    await adminCRUD.locator("#projects-table button").getByText("Sửa").click();
    await adminCRUD.locator("#p-title").fill("Đã chỉnh sửa dự án");
    await adminCRUD.locator("#project-save").click();
    await adminCRUD.locator("#projects-table").getByText("Đã chỉnh sửa dự án").waitFor();
    adminCRUD.on("dialog",dialog=>dialog.accept());
    await adminCRUD.locator("#projects-table button").getByText("Xóa").click();
    await adminCRUD.locator("#projects-table").getByText("Chưa có dự án").waitFor();
    await adminCRUD.locator("#tab-inquiries").click();
    await adminCRUD.locator("#inquiries-table").getByText("KHÁCH KIỂM THỬ GIẢ").waitFor();
    assert.equal(await adminCRUD.locator("#crm-total").innerText(),"1");
    assert.equal(await adminCRUD.locator("#crm-due").innerText(),"0");
    await adminCRUD.locator("#inquiries-table").getByRole("button",{name:"Hồ sơ"}).click();
    await adminCRUD.locator("#profile-name").getByText("KHÁCH KIỂM THỬ GIẢ").waitFor();
    await adminCRUD.locator("#profile-note-input").fill("Đã xem hồ sơ và cần báo giá.");
    await adminCRUD.locator("#profile-note-save").click();
    await adminCRUD.locator("#profile-history").getByText("Đã xem hồ sơ và cần báo giá.").waitFor();
    await adminCRUD.locator("#profile-history").getByRole("button",{name:"Sửa ghi chú"}).click();
    await adminCRUD.locator(".care-note-edit textarea").fill("Đã sửa: khách cần báo giá trong tuần.");
    await adminCRUD.locator(".care-note-edit").getByRole("button",{name:"Lưu chỉnh sửa"}).click();
    await adminCRUD.locator("#profile-history").getByText("Đã sửa: khách cần báo giá trong tuần.").waitFor();
    await adminCRUD.locator("#profile-revisions").getByText(/Trước: Đã xem hồ sơ và cần báo giá/).waitFor();
    await adminCRUD.locator("#profile-revisions").getByText(/Sau: Đã sửa: khách cần báo giá trong tuần/).waitFor();
    const followupValue=new Date(Date.now()+86400000).toISOString().slice(0,16);
    await adminCRUD.locator("#profile-reminder-at").fill(followupValue);
    await adminCRUD.locator("#profile-reminder-save").click();
    await adminCRUD.locator("#profile-history").getByText("Đặt lịch nhắc liên hệ").waitFor();
    await adminCRUD.locator("#profile-reminder-done").click();
    await adminCRUD.locator("#profile-history").getByText("Đã hoàn thành công việc nhắc liên hệ").waitFor();
    assert.equal(await adminCRUD.locator("#profile-reminder-done").isDisabled(),true);
    assert.equal(await adminCRUD.locator("#crm-due").innerText(),"0");
    await adminCRUD.locator("#profile-reminder-at").fill(followupValue);
    await adminCRUD.locator("#profile-reminder-save").click();
    await adminCRUD.locator("#profile-history").getByText("Đặt lịch nhắc liên hệ").first().waitFor();
    await adminCRUD.locator("#profile-reminder-clear").click();
    await adminCRUD.locator("#profile-history").getByText("Hủy lịch nhắc liên hệ").waitFor();
    await adminCRUD.locator("#care-task-title").fill("Gửi báo giá nội thất");
    await adminCRUD.locator("#care-task-assignee").fill("Nhân viên A");
    await adminCRUD.locator("#care-task-details").fill("Liên hệ xác nhận và gửi dự toán.");
    await adminCRUD.locator("#care-task-priority").selectOption("high");
    await adminCRUD.locator("#care-task-create").click();
    await adminCRUD.locator("#care-task-list").getByText("Gửi báo giá nội thất").waitFor();
    await adminCRUD.locator("#care-task-events").getByText("Giao công việc").waitFor();
    await adminCRUD.locator("#care-task-list").getByRole("button",{name:"Sửa công việc"}).click();
    await adminCRUD.locator("#care-task-title").fill("Gửi báo giá nội thất cập nhật");
    await adminCRUD.locator("#care-task-details").fill("Bổ sung phương án 3D.");
    await adminCRUD.locator("#care-task-priority").selectOption("urgent");
    await adminCRUD.locator("#care-task-create").getByText("Lưu thay đổi").waitFor();
    await adminCRUD.locator("#care-task-create").click();
    await adminCRUD.locator("#care-task-list").getByText("Gửi báo giá nội thất cập nhật").waitFor();
    await adminCRUD.locator("#care-task-events").getByText(/Sửa tên việc/).waitFor();
    await adminCRUD.locator("#care-task-events").getByText(/Sửa mô tả/).waitFor();
    await adminCRUD.locator("#care-task-events").getByText(/Đổi mức ưu tiên/).waitFor();
    await adminCRUD.locator("#care-task-list").getByRole("button",{name:"Sửa công việc"}).click();
    await adminCRUD.locator("#care-task-cancel").click();
    assert.equal(await adminCRUD.locator("#care-task-cancel").isVisible(),false);
    await adminCRUD.locator("#care-task-list").getByRole("combobox",{name:/Tiến độ/}).selectOption("in_progress");
    await adminCRUD.locator("#care-task-events").getByText("Chuyển tiến độ").waitFor();
    await adminCRUD.locator("#profile-close").click();
    assert.equal(await adminCRUD.locator("#lead-profile").isVisible(),false);
    await adminCRUD.locator("#tab-tasks").click();
    await adminCRUD.locator("#tasks-board-table").getByText("Gửi báo giá nội thất cập nhật").waitFor();
    assert.equal(await adminCRUD.locator("#tasks-total").innerText(),"1");
    assert.equal(await adminCRUD.locator("#tasks-progress").innerText(),"1");
    await adminCRUD.locator("#tasks-board-table").getByRole("combobox",{name:/Tiến độ/}).selectOption("done");
    await adminCRUD.locator("#tasks-board-table").getByRole("combobox",{name:/Tiến độ/}).inputValue().then(v=>assert.equal(v,"done"));
    await adminCRUD.locator("#task-view-kanban").click();
    assert.equal(await adminCRUD.locator("#tasks-kanban").isVisible(),true);
    assert.equal(await adminCRUD.locator("#tasks-table-wrap").isVisible(),false);
    await adminCRUD.locator("#kanban-done").getByText("Gửi báo giá nội thất cập nhật").waitFor();
    assert.equal(await adminCRUD.locator("#kanban-done-count").innerText(),"1");
    await adminCRUD.locator("#kanban-done").getByRole("button",{name:/Mở lại công việc/}).click();
    await adminCRUD.locator("#kanban-todo").getByText("Gửi báo giá nội thất cập nhật").waitFor();
    await adminCRUD.locator("#kanban-todo").getByRole("button",{name:/Bắt đầu công việc/}).click();
    await adminCRUD.locator("#kanban-progress").getByText("Gửi báo giá nội thất cập nhật").waitFor();
    await adminCRUD.locator("#kanban-progress").getByRole("button",{name:/Hoàn thành công việc/}).click();
    await adminCRUD.locator("#kanban-done").getByText("Gửi báo giá nội thất cập nhật").waitFor();
    await adminCRUD.locator("#task-view-table").click();
    assert.equal(await adminCRUD.locator("#tasks-kanban").isVisible(),false);
    assert.equal(await adminCRUD.locator("#tasks-table-wrap").isVisible(),true);
    await adminCRUD.locator("#tasks-status-filter").selectOption("todo");
    await adminCRUD.locator("#tasks-board-table").getByText("Chưa có công việc phù hợp.").waitFor();
    await adminCRUD.locator("#tasks-status-filter").selectOption("all");
    await adminCRUD.locator("#tasks-board-table").getByText("Gửi báo giá nội thất cập nhật").waitFor();
    await adminCRUD.locator("#tab-inquiries").click();

    assert.equal(await adminCRUD.locator("#crm-contacted").innerText(),"0");
    await adminCRUD.locator("#lead-search").fill("0900000000");
    assert.match(await adminCRUD.locator("#lead-match-count").innerText(),/Hiển thị 1–1 \/ 1/);
    await adminCRUD.locator("#lead-search").fill("KHONG TON TAI");
    await adminCRUD.locator("#inquiries-table").getByText("Không có hồ sơ phù hợp bộ lọc.").waitFor();
    await adminCRUD.locator("#lead-clear-filters").click();
    await adminCRUD.locator("#lead-filter-service").selectOption("Thi công trọn gói");
    await adminCRUD.locator("#inquiries-table").getByText("Không có hồ sơ phù hợp bộ lọc.").waitFor();
    await adminCRUD.locator("#lead-clear-filters").click();
    await adminCRUD.locator("#lead-filter-status").selectOption("new");
    await adminCRUD.locator("#inquiries-table").getByText("KHÁCH KIỂM THỬ GIẢ").waitFor();
    await adminCRUD.locator("#lead-clear-filters").click();
    await adminCRUD.locator("#inquiries-table button").getByText("Ghi nhận liên hệ").click();
    await adminCRUD.locator("#inquiries-table").getByText(/Liên hệ cuối:/).waitFor();
    assert.equal(await adminCRUD.locator("#inquiries-table select").inputValue(),"contacted");
    assert.equal(await adminCRUD.locator("#crm-contacted").innerText(),"1");
    await adminCRUD.locator("#inquiries-table").getByRole("combobox").selectOption("quoted");
    await adminCRUD.locator("#inquiries-table").getByRole("combobox").inputValue().then(v=>assert.equal(v,"quoted"));
    assert.equal(await adminCRUD.locator("#crm-quoted").innerText(),"1");
    assert.equal(await adminCRUD.locator("#lead-page-label").innerText(),"Trang 1 / 1");
    assert.equal(await adminCRUD.locator("#lead-prev-page").isDisabled(),true);
    assert.equal(await adminCRUD.locator("#lead-next-page").isDisabled(),true);
    const downloadReady=adminCRUD.waitForEvent("download");
    await adminCRUD.locator("#lead-export-csv").click();
    const exported=await downloadReady;
    assert.match(exported.suggestedFilename(),/tan-design-khach-hang-trang-1\.csv/);
    const bytes=fs.readFileSync(await exported.path());
    assert.equal(bytes.subarray(0,3).toString("hex"),"efbbbf","CSV must include Excel UTF-8 BOM");
    assert.match(bytes.toString("utf8"),/KHÁCH KIỂM THỬ GIẢ/);
    await adminCRUD.evaluate(()=>window.__ci_seed_extra_leads(27));
    await adminCRUD.locator("#reload-inquiries").click();
    await adminCRUD.locator("#lead-match-count").getByText(/Hiển thị 1–25 \/ 28/).waitFor();
    assert.equal(await adminCRUD.locator("#crm-total").innerText(),"28");
    assert.equal(await adminCRUD.locator("#lead-next-page").isDisabled(),false);
    await adminCRUD.locator("#lead-next-page").click();
    await adminCRUD.locator("#lead-page-label").getByText("Trang 2 / 2").waitFor();
    assert.match(await adminCRUD.locator("#lead-match-count").innerText(),/Hiển thị 26–28 \/ 28/);
    await adminCRUD.locator("#lead-search").fill("0900001026");
    await adminCRUD.locator("#lead-match-count").getByText(/Hiển thị 1–1 \/ 1/).waitFor();
    assert.equal(await adminCRUD.locator("#lead-page-label").innerText(),"Trang 1 / 1");
    await adminCRUD.locator("#lead-clear-filters").click();
    await adminCRUD.locator("#lead-match-count").getByText(/Hiển thị 1–25 \/ 28/).waitFor();
    console.log("ADMIN-UI: project CRUD + server-filtered CRM, 28-record paging, exact KPIs and CSV download simulated; no live writes");

    const mobile = await browser.newPage({ ...devices["iPhone 13"], locale: "vi-VN" });
    mobile.on("pageerror", error => consoleErrors.push("mobile: " + error.message));
    const mr = await mobile.goto(origin, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.equal(mr?.status(), 200, "Mobile homepage must load");
    await mobile.locator("#project-grid article.project").first().waitFor({ timeout: 15000 });
    await mobile.screenshot({ path: out + "/atelier-mobile.png", fullPage: true });
    const overflow = await mobile.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 3
    );
    assert.equal(overflow, false, "Homepage should not overflow horizontally at mobile width");
    console.log("MOBILE: loaded; no horizontal overflow");

    // Simulate Cloudflare Turnstile in browser without a real widget or a customer record.
    const turnstileTest = await browser.newPage({ viewport: { width: 1080, height: 800 }, locale: "vi-VN" });
    const configured = fs.readFileSync("app-config.js","utf8")
      .replace(/turnstileSiteKey:\s*"[^"]*"/, 'turnstileSiteKey: "1x00000000000000000000AA"');
    assert.match(configured, /turnstileSiteKey: "1x00000000000000000000AA"/);
    await turnstileTest.route("**/app-config.js", route =>
      route.fulfill({status:200,contentType:"application/javascript",body:configured}));
    await turnstileTest.route("**/challenges.cloudflare.com/turnstile/v0/api.js**", route =>
      route.fulfill({status:200,contentType:"application/javascript",body:
        'window.turnstile={render:function(el,opts){opts.callback("test-captcha-token");return "widget";},reset:function(){}};'}));
    const sentWithChallenge=[];
    await turnstileTest.route("**/functions/v1/submit-inquiry", route => {
      sentWithChallenge.push(route.request().postDataJSON());
      return route.fulfill({status:201,contentType:"application/json",body:'{"ok":true}'});
    });
    await turnstileTest.goto(origin,{waitUntil:"domcontentloaded",timeout:45000});
    await turnstileTest.locator("#lead-form [type=submit]:not([disabled])").waitFor({timeout:20000});
    assert.equal(await turnstileTest.locator("#turnstile-container").evaluate(el => !el.hidden),true);
    await turnstileTest.locator("#full-name").fill("Người kiểm thử");
    await turnstileTest.locator("#phone").fill("0900000000");
    await turnstileTest.locator("#service").selectOption({label:"Thiết kế nội thất"});
    await turnstileTest.locator("#consent").check();
    await turnstileTest.locator("#lead-form [type=submit]").click();
    await turnstileTest.locator("#form-feedback").getByText("Yêu cầu đã được hệ thống ghi nhận").waitFor();
    assert.equal(sentWithChallenge.length,1);
    assert.equal(sentWithChallenge[0].turnstile_token,"test-captcha-token");
    assert.equal(sentWithChallenge[0].privacy_consent,true);
    console.log("TURNSTILE: simulated challenge token sent through protected API");

    // If the CDN fails on a LIVE site, never silently save a local demo lead.
    const disconnected = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await disconnected.route("**/cdn.jsdelivr.net/npm/@supabase/**", route => route.abort());
    await disconnected.goto(origin, { waitUntil: "domcontentloaded", timeout: 45000 });
    await disconnected.locator("#form-feedback").getByText("Kết nối tạm gián đoạn").waitFor({ timeout: 15000 });
    assert.equal(await disconnected.locator("#lead-form [type=submit]").isDisabled(), true,
      "Production form must be disabled if Supabase SDK fails");
    assert.equal(await disconnected.locator("#admin-toggle").isVisible(), false,
      "Demo leads panel must stay hidden in configured production");
    console.log("OUTAGE: consultation submission safely disabled (no silent demo fallback)");

    assert.deepEqual(consoleErrors, [], "Browser JavaScript exceptions: " + consoleErrors.join("; "));
    console.log("Browser smoke tests passed.");
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
