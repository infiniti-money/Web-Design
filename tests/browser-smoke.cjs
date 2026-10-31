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
 let inquiries=[{id:"inquiry-mock-1",full_name:"KHÁCH KIỂM THỬ GIẢ",phone:"0900000000",
   service:"Thiết kế nội thất",space:"Căn hộ",details:"CI ONLY",status:"new",
   created_at:"2026-10-31T00:00:00.000Z",consented_at:"2026-10-31T00:00:00.000Z",
   privacy_policy_version:"2026-10-31-retention-12m",last_contacted_at:null,legal_hold_until:null}];
 return {
   rpc(name,args) {
     if(name!=="record_inquiry_contact")return Promise.resolve({data:null,error:{message:"Unknown RPC"}});
     const item=inquiries.find(row=>row.id===args.p_inquiry_id);
     if(!item)return Promise.resolve({data:false,error:null});
     item.last_contacted_at=new Date().toISOString();
     if(item.status==="new")item.status="contacted";
     return Promise.resolve({data:true,error:null});
   },
   auth:{getUser:async()=>({data:{user:{email:"test-admin@example.invalid",app_metadata:{role:"admin"}}},error:null}),
         signOut:async()=>({error:null})},
   from(table) {
     const q={
       select(){return q},order(){return q},range(){return Promise.resolve({data:table==="projects"?[...records]:table==="inquiries"?[...inquiries]:[],error:null})},
       insert(value){records.push({id:"project-"+(records.length+1),...value});return Promise.resolve({error:null})},
       update(value){return{eq(key,id){const item=records.find(r=>r[key]===id);if(item)Object.assign(item,value);return Promise.resolve({error:null})}}},
       delete(){return{eq(key,id){records=records.filter(r=>r[key]!==id);return Promise.resolve({error:null})}}}
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
    assert.equal(await adminCRUD.locator("#crm-contacted").innerText(),"0");
    await adminCRUD.locator("#lead-search").fill("0900000000");
    assert.match(await adminCRUD.locator("#lead-match-count").innerText(),/Hiển thị 1 \/ 1/);
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
    console.log("ADMIN-UI: project CRUD + CRM search, filters, KPIs and contact RPC mocked, no live writes");

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
