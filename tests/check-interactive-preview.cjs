const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const resultDir=path.join(process.cwd(),"preview-v1-17");
(async()=>{
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},locale:"vi-VN",isMobile:true,hasTouch:true});
 const errors=[],externalRequests=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("request",req=>{if(!req.url().startsWith("http://127.0.0.1:8765/"))externalRequests.push(req.url())});
 await page.goto("http://127.0.0.1:8765/preview-v1-17/interactive-demo.html",{waitUntil:"networkidle"});
 await page.locator("#quotes .item").first().waitFor();
 assert.equal(await page.locator("#quotes .item").count(),2,"Two demo quotes expected");
 await page.locator("#quote-inquiry").selectOption("client-a");
 await page.locator("#quote-title").fill("Báo giá kiểm thử giao diện di động");
 await page.locator("#create-quote").click();
 await page.locator("#quotes .item").filter({hasText:"Báo giá kiểm thử giao diện di động"}).waitFor();
 const answers=["email","Khách xác nhận qua thư điện tử ngày 02/11/2026"];
 page.on("dialog",async d=>{
  if(d.type()==="prompt")await d.accept(answers.shift()||"");
  else await d.accept();
 });
 const quote=page.locator("#quotes .item").filter({hasText:"Thi công nội thất nhà phố"});
 await quote.getByRole("button",{name:"Duyệt",exact:true}).click();
 await quote.getByRole("button",{name:"Đánh dấu đã gửi"}).click();
 await quote.getByRole("button",{name:"Ghi nhận khách chấp nhận"}).click();
 await page.locator("#contract-inquiry").selectOption("client-b");
 await page.locator("#contract-quote").selectOption("quote-2");
 await page.locator("#contract-number").fill("HD-DEMO-20261102");
 await page.locator("#create-contract").click();
 await page.locator("#contracts .item").filter({hasText:"HD-DEMO-20261102"}).waitFor();
 const contract=page.locator("#contracts .item").filter({hasText:"HD-DEMO-20261102"});
 await contract.getByRole("button",{name:"Trình xem xét"}).click();
 await contract.getByRole("button",{name:"Xác nhận đã ký"}).click();
 assert.ok(await page.locator("#audit p").count()>=6);
 assert.match(await contract.innerText(),/Đã ký/);
 assert.deepEqual(errors,[],"Preview contains no JS errors");
 assert.deepEqual(externalRequests,[],"Preview must not call external servers");
 await page.screenshot({path:path.join(resultDir,"interactive-demo-after-flow-mobile.png"),fullPage:true});
 fs.writeFileSync(path.join(resultDir,"interactive-demo-report.json"),JSON.stringify({offline:true,externalRequests:0,errors:0,workflow:"create quote, approve, send, accept, create contract, review, sign",passed:true},null,2));
 console.log("Offline interactive preview: create/approve/accept/contract flow succeeded");
 await page.close();
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
