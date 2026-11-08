// Isolated fixture build and HTTP server; never connects to Supabase or writes business data.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {buildPages}=require('../scripts/build-pages.cjs');
(async()=>{
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'atelier-catalog-browser-')),id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 buildPages({output,catalogItems:[{id,name:'Mẫu vật liệu kiểm thử',category:'Vật liệu',style:'Hiện đại',description:'Nội dung kiểm thử giao diện. Mã vật liệu, màu sắc và hồ sơ cần được xác minh trước khi lựa chọn.',image_url:'',published:true,sort_order:0}]});
 const server=http.createServer((req,res)=>{try{let file=path.resolve(output,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(output+path.sep)&&file!==output)throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const context=await browser.newContext({javaScriptEnabled:false}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});await page.goto(base+'catalog/');assert.equal(await page.locator('h1').textContent(),'Catalog nội thất và vật liệu');assert.equal(await page.locator('article.card').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.getByRole('link',{name:'Mẫu vật liệu kiểm thử',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForURL('**/catalog/muc-'+id+'/');assert.equal(await page.locator('h1').textContent(),'Mẫu vật liệu kiểm thử');assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);assert.equal(await page.locator('img').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   assert.equal(await page.getByRole('link',{name:'Trao đổi nhu cầu tư vấn'}).getAttribute('href'),'../../index.html#contact');assert.match(await page.getByRole('link',{name:'Mở bộ lọc và sách mẫu'}).getAttribute('href'),new RegExp('item='+id));
   if(width===390){fs.mkdirSync('screenshots',{recursive:true});await page.screenshot({path:'screenshots/catalog-static-mobile.png',fullPage:true});}
  }
  await page.goto(base+'catalog.html');await page.getByRole('link',{name:'Xem catalog theo từng trang'}).click();assert.equal(page.url(),base+'catalog/');assert.deepEqual(errors,[]);console.log('Static catalog: 1440/390/320 px, JavaScript disabled, keyboard navigation, stable deep link, noindex and consultation/legacy CTAs passed. Isolated fixtures only.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
