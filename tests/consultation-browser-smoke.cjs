"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const site=(process.env.SITE_URL||"http://127.0.0.1:4173/").replace(/\/?$/,"/");
const config=fs.readFileSync("app-config.js","utf8")
  .replace(/turnstileSiteKey:\s*"[^"]*"/,'turnstileSiteKey: "1x00000000000000000000AA"');
assert.match(config,/turnstileSiteKey: "1x00000000000000000000AA"/);

(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},locale:"vi-VN"});
  await page.route("**/app-config.js",route=>route.fulfill({status:200,contentType:"application/javascript",body:config}));
  await page.route("**/challenges.cloudflare.com/turnstile/v0/api.js**",route=>route.fulfill({
    status:200,contentType:"application/javascript",
    body:'window.turnstile={render:function(el,opts){window.__ciCaptcha=opts;opts.callback("synthetic-challenge");return "ci-widget";},reset:function(){window.__ciCaptcha.callback("synthetic-challenge");}};'
  }));
  await page.route("**/rest/v1/projects**",route=>route.fulfill({status:200,contentType:"application/json",body:"[]"}));
  const received=[];
  await page.route("**/functions/v1/submit-inquiry",async route=>{
    received.push(route.request().postDataJSON());
    const count=received.length;
    // All outcomes are fixtures: the real Edge Function never receives a test write.
    if(count===1)return route.fulfill({status:429,contentType:"application/json",body:'{"code":"rate_limited"}'});
    if(count===2)return route.fulfill({status:500,contentType:"application/json",body:'{"code":"internal"}'});
    return route.fulfill({status:201,contentType:"application/json",body:'{"ok":true}'});
  });
  const response=await page.goto(site+"?service=build#contact",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  await page.locator("#lead-form").scrollIntoViewIfNeeded();
  assert.equal(await page.locator("#service").inputValue(),"Thi công trọn gói");
  assert.match(await page.locator("#requested-service-note").innerText(),/Thi công trọn gói/);
  await page.locator("#service").selectOption({label:"Tư vấn & trang trí"});
  assert.match(await page.locator("#requested-service-note").innerText(),/Tư vấn & trang trí/);
  await page.locator("#full-name").fill("KHÁCH HÀNG THỬ NGHIỆM");
  await page.locator("#phone").fill("0900000000");
  await page.locator("#consent").check();
  async function post(){
    await page.locator('#lead-form [type=submit]:not([disabled])').waitFor({timeout:15000});
    await page.locator('#lead-form [type=submit]').click();
  }
  await post();
  await page.locator("#form-feedback").getByText(/Bạn đã gửi quá nhiều yêu cầu/).waitFor();
  assert.equal(await page.locator("#form-feedback").getAttribute("data-state"),"warning");
  assert.equal(await page.locator("#lead-form").getAttribute("aria-busy"),"false");
  assert.equal(await page.locator("#full-name").inputValue(),"KHÁCH HÀNG THỬ NGHIỆM");
  await post();
  await page.locator("#form-feedback").getByText(/Gửi yêu cầu chưa thành công/).waitFor();
  assert.match(await page.locator("#form-feedback").innerText(),/Chưa thể xác nhận hệ thống đã nhận hay chưa/);
  assert.ok(!(await page.locator("#form-feedback").innerText()).includes("Dữ liệu chưa được lưu"));
  assert.equal(await page.locator("#phone").inputValue(),"0900000000");
  await post();
  await page.locator("#form-feedback").getByText(/Yêu cầu đã được hệ thống ghi nhận/).waitFor();
  assert.equal(await page.locator("#form-feedback").getAttribute("data-state"),"success");
  assert.equal(await page.locator("#lead-form").getAttribute("aria-busy"),"false");
  assert.equal(await page.locator("#full-name").inputValue(),"");
  assert.equal(await page.locator("#requested-service-note").isVisible(),false);
  assert.equal(received.length,3);
  assert.ok(received.every(x=>x.privacy_consent===true&&x.turnstile_token==="synthetic-challenge"));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.close();
  console.log("CONSULTATION PASS: service context, 429/500 ambiguity, preserved input, confirmed success, Turnstile reset, mobile.");
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
