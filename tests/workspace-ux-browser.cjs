"use strict";
/* Role-aware workspace UI regression with synthetic sessions only.
 * This deliberately does not authenticate against production Supabase. */
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),http=require("node:http");
const {buildPages}=require("../scripts/build-pages.cjs");
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"atelier-workspace-"));
 buildPages({output:root});
 const server=http.createServer((req,res)=>{
  try{
   const url=new URL(req.url,"http://localhost");
   const name=decodeURIComponent(url.pathname).replace(/^\//,"")||"index.html";
   const file=path.resolve(root,name);
   if(file!==root&&!file.startsWith(root+path.sep))throw Error("traversal");
   const type={".js":"application/javascript",".css":"text/css",".woff2":"font/woff2",".png":"image/png",".svg":"image/svg+xml",".html":"text/html"};
   res.setHeader("Content-Type",type[path.extname(file)]||"text/plain");
   res.end(fs.readFileSync(file));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port+"/";
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:["--no-sandbox"],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:"light"});
  await context.route("**/*",route=>{
    const url=route.request().url();
    if(!url.startsWith(base))return route.abort();
    if(new URL(url).pathname==="/admin.js")return route.fulfill({status:200,contentType:"application/javascript",body:"// No real login in fixture tests."});
    return route.continue();
  });
  const page=await context.newPage();const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"admin.html",{waitUntil:"load"});
  const login=async role=>{
    await page.evaluate(role=>{
      document.getElementById("dashboard").classList.remove("hide");
      window.dispatchEvent(new CustomEvent("atelier:session",{detail:{role,name:"Tài khoản nghiệm thu",email:"fixture@example.invalid"}}));
    },role);
    await page.locator(".workspace-sidebar").waitFor();
  };
  await login("admin");
  assert.equal(await page.locator(".workspace-modules-grid a[href$='payments.html']").count(),1);
  assert.equal(await page.locator(".workspace-modules-grid a[href$='reports-advanced.html']").count(),1);
  assert.equal(await page.locator(".workspace-modules-grid a[href$='#staff']").count(),1);
  await page.locator(".workspace-settings-button").click();
  await page.locator("#workspace-theme-select").selectOption("dark");
  assert.equal(await page.locator("body.workspace-theme-dark").count(),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem("atelier-workspace-theme")),"dark");
  await page.locator(".workspace-dialog[open] header button").last().click();
  await login("manager");
  assert.equal(await page.locator(".workspace-sidebar a[href$='commercial.html']").count(),1);
  assert.equal(await page.locator(".workspace-sidebar a[href$='reports-advanced.html']").count(),1);
  assert.equal(await page.locator(".workspace-sidebar a[href$='payments.html']").count(),0);
  assert.equal(await page.locator(".workspace-sidebar #tab-staff:not(.hide)").count(),0);
  await login("employee");
  assert.equal(await page.locator(".workspace-sidebar a[href$='notifications.html']").count(),1);
  for(const file of ["operations.html","payments.html","commercial.html","reports-advanced.html","admin-posts.html","admin-catalog.html"]){
    assert.equal(await page.locator(".workspace-sidebar a[href$='"+file+"']").count(),0,file+" denied in employee navigation");
  }
  assert.equal(await page.locator(".workspace-sidebar #tab-staff:not(.hide)").count(),0);
  await page.setViewportSize({width:390,height:844});
  await page.locator(".workspace-menu").click();
  assert.equal(await page.locator("body.workspace-drawer-open").count(),1);
  const drawerBox=await page.locator(".workspace-sidebar").boundingBox();
  assert.ok(drawerBox&&Math.abs(drawerBox.x)<2,"Mobile drawer must be visible");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"Mobile page overflow");
  await page.locator(".workspace-mask").click({position:{x:350,y:100}});
  assert.equal(await page.locator("body.workspace-drawer-open").count(),0);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent("atelier:session",{detail:null})));
  assert.equal(await page.locator(".workspace-sidebar").count(),0);
  assert.equal(await page.locator(".workspace-modules").count(),0);
  assert.equal(await page.locator("body.workspace-theme-dark").count(),0);
  assert.deepEqual(errors,[],"Browser errors in role/appearance smoke");
  console.log("PASS: unified Admin/Manager/Employee navigation, module links, dark mode, mobile drawer, logout cleanup; synthetic sessions only.");
  await context.close();
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
