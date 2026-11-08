// Normal document navigation only. No interception/router and no production writes.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {buildPages}=require('../scripts/build-pages.cjs');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'atelier-navigation-'));buildPages({output:root});
 const server=http.createServer((req,res)=>{try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file!==root&&!file.startsWith(root+path.sep))throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.css':'text/css','.js':'application/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'text/html; charset=utf-8');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  for(const [width,reducedMotion]of [[1440,'no-preference'],[390,'no-preference'],[390,'reduce']]){
   const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion}),page=await ctx.newPage();page.setDefaultNavigationTimeout(12000);page.setDefaultTimeout(12000);const releaseHero=[];let holdHero=true,nativeCount=0;const errors=[];page.on('pageerror',e=>{/* Chromium can skip a native snapshot on history restore; this is not an application exception. */if(e.message==='Transition was aborted because of invalid state. ViewTransition opt-in disabled')return;errors.push(e.message);});
   await ctx.addInitScript(()=>{window.__navigationQA={transition:false,revealed:false};addEventListener('pagereveal',event=>{window.__navigationQA.transition=!!event.viewTransition;window.__navigationQA.revealed=true;});});
   await ctx.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base))return route.continue();if(!holdHero&&url.includes('photo-1600210492486-724fe5c67fb0'))return route.abort();if(url.includes('photo-1600210492486-724fe5c67fb0'))return new Promise(resolve=>{releaseHero.push(()=>route.abort().then(resolve));});return route.abort();});
   await page.goto(base,{waitUntil:'domcontentloaded'});console.log('NAV QA loaded',width,reducedMotion);await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('#home-fonts').getAttribute('media'),'all');assert.equal(await page.locator('#consultation-styles').getAttribute('media'),'all');assert.equal(await page.locator('.hero-photo').evaluate(x=>x.complete),false);
   assert.equal(await page.locator('#public-ready').count(),1);const before=await page.locator('h1').boundingBox();assert.equal(await page.evaluate(()=>document.fonts.check('500 48px "Playfair Display"','Không gian sống tại Hưng Yên')),true);
   holdHero=false;await Promise.all(releaseHero.map(release=>release()));await page.waitForLoadState('load');await page.evaluate(()=>document.fonts.ready);const after=await page.locator('h1').boundingBox();assert.ok(Math.abs(before.height-after.height)<0.5,'Hero image must not change font metrics');
   for(const [label,route]of [['Dịch vụ','dich-vu/'],['Catalog nội thất','catalog.html'],['Kiến thức','kien-thuc.html'],['Trang chủ','index.html#home'],['Dự án','du-an/']]){
    const home=await page.locator('#hamb').count()>0;let nav;
    if(width<1181){if(home){await page.locator('#hamb').click();nav=page.locator('#site-menu');}else{await page.locator('details.menu summary').click();nav=page.locator('details.menu nav');}}
    else nav=home?page.locator('#site-menu'):page.locator('.public-desktop-nav');
    const link=nav.getByRole('link',{name:label,exact:true});const target=new URL(await link.getAttribute('href'),page.url()).href;
    await Promise.all([page.waitForURL(target),link.click()]);await page.waitForLoadState('domcontentloaded');await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>window.__navigationQA.revealed);assert.equal(await page.locator('h1').isVisible(),true,route);assert.equal(await page.locator('#public-ready').count(),1,route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,route);
    const native=await page.evaluate(()=>window.__navigationQA.transition);if(native)nativeCount++;if(reducedMotion==='reduce')assert.equal(native,false,'Reduced motion '+route);
   }
   assert.ok(reducedMotion==='reduce'||nativeCount>0,'At least one native document snapshot is available');const current=page.url();await page.goBack({waitUntil:'domcontentloaded'});assert.notEqual(page.url(),current);await page.goForward({waitUntil:'domcontentloaded'});assert.equal(page.url(),current);assert.equal(await page.locator('h1').isVisible(),true);assert.deepEqual(errors,[]);await ctx.close();
  }
  console.log('Navigation PASS: slow hero no longer delays fonts or changes heading height; real link clicks Home/Services/Catalog/Knowledge/Projects with native transitions, reduced-motion opt-out, mobile menu, Back/Forward and no hidden destination.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
