/* Full-route material audit. Isolated source build; no API writes or real accounts. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {buildPages}=require('../scripts/build-pages.cjs');
(async()=>{
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'atelier-canvas-'));buildPages({output});
 const server=http.createServer((req,res)=>{try{let f=path.resolve(output,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(output+path.sep)&&f!==output)throw Error();if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',({'.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(f)]||'text/html; charset=utf-8');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';let browser,writes=0;
 const routes=['','dich-vu/','dich-vu/thiet-ke-noi-that.html','dich-vu/thi-cong-noi-that.html','dich-vu/tu-van-trang-tri.html','du-an/','catalog.html','catalog/','kien-thuc.html','kien-thuc/ho-so-vat-lieu-noi-that-can-doi-chieu/','privacy.html','bai-viet.html'];
 const utilities=['404.html','payment-return.html','register.html','complete-profile.html','reset-password.html','set-password.html'];
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context=await browser.newContext({reducedMotion:'reduce'});await context.route('**/*',r=>{if(!['GET','HEAD'].includes(r.request().method()))writes++;return r.request().url().startsWith(base)?r.continue():r.abort();});
  const page=await context.newPage();
  for(const width of [320,390,1024,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of [...routes,...utilities]){
    await page.goto(base+route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,route+' '+width+' overflow');
    const canvas=await page.locator('body').evaluate(el=>{const c=getComputedStyle(el,'::before');return{position:c.position,content:c.content,height:c.height,image:c.backgroundImage};});
    assert.equal(canvas.position,'fixed',route+' continuous canvas');assert.notEqual(canvas.content,'none');assert.equal(parseFloat(canvas.height),900);
    if(utilities.includes(route)){assert.ok(canvas.image.includes('workspace-backdrop.svg'));assert.equal(await page.locator('main').evaluate(el=>parseFloat(getComputedStyle(el).borderTopLeftRadius))>=20,true);}
    if(route===''){
     for(const section of ['.intro','.projects','.services','.process','.estimate-section','.inspiration','.consult'])assert.equal(await page.locator(section).evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)',section+' old solid section removed');
     for(const panel of ['.intro>.wrap','.projects>.wrap','.process>.wrap','.estimate-panel','.consult-card'])assert.match(await page.locator(panel).evaluate(el=>getComputedStyle(el).backgroundColor),/^rgba\(/,panel+' translucent material');
     await page.locator('#contact').scrollIntoViewIfNeeded();assert.equal(await page.locator('#lead-form').isVisible(),true);assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el,'::before').position),'fixed');
    }
    if(route==='kien-thuc/ho-so-vat-lieu-noi-that-can-doi-chieu/')assert.match(await page.locator('.article-wrap').evaluate(el=>getComputedStyle(el).backgroundColor),/^rgba\(/);
    if(route==='dich-vu/')assert.match(await page.locator('.card').first().evaluate(el=>getComputedStyle(el).backgroundColor),/^rgba\(/);
    if(route==='privacy.html'||route==='bai-viet.html')assert.match(await page.locator('main').evaluate(el=>getComputedStyle(el).backgroundColor),/^rgba\(/,'Reading/legal page uses a glass frame');
    if(route==='catalog.html')assert.match(await page.locator('.toolbar').evaluate(el=>getComputedStyle(el).backgroundColor),/^rgba\(/);
   }
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});await nojs.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());const p=await nojs.newPage();await p.goto(base+'register.html');assert.equal(await p.locator('form').isVisible(),true);await p.goto(base+'reset-password.html');assert.equal(await p.locator('#request-form').isVisible(),true);
  await page.goto(base);const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'},{name:'prefers-reduced-motion',value:'reduce'}]});assert.equal(await page.locator('.intro>.wrap').evaluate(el=>getComputedStyle(el).backdropFilter),'none','Reduced-transparency avoids backdrop work');
  assert.equal(writes,0);console.log('Full canvas PASS: 18 public/utility routes x 4 widths, fixed full-viewport background through scroll, transparent sections, glass cards/filters/forms, no-JS account forms, reduced transparency, no API writes.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
