const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
(async()=>{
  const base=process.env.SITE_URL||"http://127.0.0.1:4174/",url=new URL("kien-thuc.html",base).href;
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  fs.mkdirSync("screenshots",{recursive:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
    const apiRequests=[],errors=[];page.on("request",request=>{if(request.url().includes(".supabase.co"))apiRequests.push(request.url());});page.on("pageerror",error=>errors.push(error.message));
    await page.goto(url);await page.locator("#knowledge-filters").waitFor({state:"visible"});
    const cards=page.locator("#knowledge-list .knowledge-card"),total=await cards.count();assert.ok(total>=3);
    await page.screenshot({path:"screenshots/knowledge-discovery-desktop.png",fullPage:true});
    const target=cards.filter({has:page.locator('a[href*="cach-doc-bao-gia-noi-that-theo-hang-muc"]')});
    const category=await target.getAttribute("data-category"),query=page.locator("#knowledge-query");
    await query.fill("DOC BAO GIA");await query.press("Enter");assert.equal(await target.isVisible(),true);
    assert.equal(new URL(page.url()).searchParams.get("q"),"DOC BAO GIA");
    await page.locator("#knowledge-category").selectOption(category);const shared=page.url();
    const matching=await cards.evaluateAll(nodes=>nodes.filter(node=>!node.hidden).length);assert.ok(matching>=1);
    await page.reload();await page.locator("#knowledge-filters").waitFor({state:"visible"});assert.equal(await query.inputValue(),"DOC BAO GIA");assert.equal(await page.locator("#knowledge-category").inputValue(),category);
    await query.fill("khong-co-bai-voi-chuoi-nay-8261");await query.press("Enter");assert.equal(await page.locator("#knowledge-empty").isVisible(),true);assert.equal(await cards.evaluateAll(nodes=>nodes.every(node=>node.hidden)),true);
    await page.locator("#knowledge-clear").click();assert.equal(await cards.evaluateAll(nodes=>nodes.every(node=>!node.hidden)),true);assert.equal(await query.evaluate(node=>node===document.activeElement),true);assert.equal(new URL(page.url()).search,"");
    await query.fill("doc huong dan");await query.press("Enter");assert.equal(await target.isVisible(),false,"Search must not match the generic read-guide action on every card");
    const hostile=new URL(url);hostile.searchParams.set("q",'<img src=x onerror="window.injected=1">');hostile.searchParams.set("category","unknown");
    await page.goto(hostile.href);await page.locator("#knowledge-filters").waitFor({state:"visible"});assert.equal(await page.evaluate(()=>window.injected),undefined);assert.equal(await page.locator("#knowledge-category").inputValue(),"");
    await page.goto(shared);await page.locator("#knowledge-filters").waitFor({state:"visible"});assert.equal(await target.isVisible(),true);
    const articleUrl=new URL("kien-thuc/cach-doc-bao-gia-noi-that-theo-hang-muc/",base).href;
    await page.goto(articleUrl);const toc=page.locator(".article-toc");assert.equal(await toc.isVisible(),true);
    const anchors=await toc.locator("a").evaluateAll(nodes=>nodes.map(node=>node.getAttribute("href").slice(1)));assert.ok(anchors.length>1);assert.equal(new Set(anchors).size,anchors.length);
    for(const id of anchors)assert.equal(await page.locator('[id="'+id+'"]').count(),1);
    await toc.locator("a").last().click();assert.equal(decodeURIComponent(new URL(page.url()).hash.slice(1)),anchors.at(-1));
    await page.waitForFunction(id=>{const target=document.getElementById(id),header=document.querySelector(".site-header");return target.getBoundingClientRect().top>=header.getBoundingClientRect().bottom-1&&target.getBoundingClientRect().top<innerHeight;},anchors.at(-1));
    await page.emulateMedia({media:"print"});assert.equal(await toc.isVisible(),false);assert.equal(await page.locator(".article-body").isVisible(),true);await page.emulateMedia({media:"screen"});
    await page.setViewportSize({width:390,height:844});await page.goto(url);await page.locator("#knowledge-filters").waitFor({state:"visible"});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:"screenshots/knowledge-discovery-mobile.png",fullPage:true});
    await page.goto(articleUrl);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:"screenshots/knowledge-outline-mobile.png",fullPage:true});
    const nojs=await browser.newContext({javaScriptEnabled:false}),fallback=await nojs.newPage();await fallback.goto(url);assert.equal(await fallback.locator("#knowledge-filters").isVisible(),false);assert.equal(await fallback.locator("#knowledge-list .knowledge-card").count(),total);await fallback.goto(articleUrl);await fallback.locator(".article-toc a").first().click();assert.ok(new URL(fallback.url()).hash.startsWith("#phan-"));assert.ok((await fallback.locator(".article-body").innerText()).length>300);
    const blocked=await context.newPage();await blocked.route("**/knowledge-discovery.js",route=>route.abort());await blocked.goto(url);assert.equal(await blocked.locator("#knowledge-filters").isVisible(),false);assert.equal(await blocked.locator("#knowledge-list .knowledge-card").count(),total);
    assert.deepEqual(apiRequests,[]);assert.deepEqual(errors,[]);
    console.log("Knowledge discovery: accent search, category, URL/reload, empty/reset/focus, safe query, TOC anchors, print, mobile, no-JS/blocked-script fallback passed. No API writes.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
