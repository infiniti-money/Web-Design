"use strict";
/* Chromium visual/functional regression; fixture-only images, no production writes. */
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const base=process.env.SITE_URL||"http://127.0.0.1:4173/";
const tinyImage=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+b++kAAAAASUVORK5CYII=","base64");
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  for(const [width,height] of [[320,740],[390,844],[768,950],[1024,800],[1440,900],[1920,1080]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce",deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",error=>errors.push(error.message));
   await page.route("**/images.unsplash.com/**",route=>route.fulfill({status:200,contentType:"image/png",body:tinyImage}));
   await page.route("**/challenges.cloudflare.com/**",route=>route.abort());
   await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
   await page.waitForFunction(()=>document.documentElement.classList.contains("hero-gallery-ready"));
   assert.equal(await page.locator("#home .hero-photo").getAttribute("fetchpriority"),"high");
   assert.equal(await page.locator("#home h1").isVisible(),true);
   assert.equal(await page.getByRole("button",{name:"Ảnh tiếp theo"}).isVisible(),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"No page overflow at "+width);
   const bound=await page.locator("#home").boundingBox();
   assert.ok(bound.width>=width-20,"Full viewport hero at "+width+": "+bound.width);
   assert.equal(await page.locator("#home").getAttribute("data-hero-active"),"1");
   // Motion is reduced on all tested viewport sizes, but manually chosen images still change.
   await page.getByRole("button",{name:"Ảnh tiếp theo"}).click();
   await page.waitForFunction(()=>document.getElementById("home")?.dataset.heroActive==="2");
   assert.match(await page.locator("#home .hero-indicator").textContent(),/02 \/ 03/);
   await page.getByRole("button",{name:"Tạm dừng tự chuyển ảnh"}).click();
   assert.equal(await page.getByRole("button",{name:"Tiếp tục tự chuyển ảnh"}).getAttribute("aria-pressed"),"true");
   await page.getByRole("button",{name:"Ảnh trước"}).focus();
   await page.keyboard.press("Enter");
   await page.waitForFunction(()=>document.getElementById("home")?.dataset.heroActive==="1");
   assert.deepEqual(errors,[],"Unexpected JS errors at "+width);
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
  const page=await context.newPage();
  await page.route("**/images.unsplash.com/**",route=>route.fulfill({status:200,contentType:"image/png",body:tinyImage}));
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(await page.locator("#home .hero-photo").isVisible(),true);
  assert.equal(await page.locator("#home h1").isVisible(),true);
  assert.equal(await page.getByRole("button",{name:"Ảnh tiếp theo"}).isVisible(),false);
  await context.close();
  console.log("PASS: full-viewport hero at 320/390/768/1024/1440/1920, manual slider, keyboard, reduced motion and no-JS fallback");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
