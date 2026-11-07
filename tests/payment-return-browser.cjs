const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const base=process.env.SITE_URL||'http://127.0.0.1:4173/';assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'local preview only');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
 const results=[];fs.mkdirSync('dist/payos-uat',{recursive:true});
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}}),requests=[],errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',route=>{
    const request=route.request();requests.push({url:request.url(),method:request.method()});
    return new URL(request.url()).origin===new URL(base).origin?route.continue():route.abort();
   });
   const url=new URL('payment-return.html',base);url.search='?code=00&status=PAID&cancel=false&orderCode=7000000000000&amount=999999&message=%3Cscript%3Ealert(1)%3C%2Fscript%3E';
   await page.goto(url.href,{waitUntil:'networkidle'});
   assert.match(await page.locator('h1').innerText(),/Kiểm tra xác nhận đặt cọc/);
   assert.match(await page.locator('main').innerText(),/không phải biên nhận/);
   assert.equal(await page.locator('script').count(),0,'return query must execute no payment logic');
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex,nofollow');
   assert.equal(await page.locator('meta[name=referrer]').getAttribute('content'),'no-referrer');
   assert.equal(await page.locator('body').innerText().then(t=>t.includes('999999')),false);
   assert.ok(requests.every(r=>r.method==='GET'&&new URL(r.url).origin===new URL(base).origin),'no merchant/database writes or remote requests');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.keyboard.press('Tab');assert.equal(await page.locator('a:focus').getAttribute('href'),'./index.html#contact');
   assert.deepEqual(errors,[]);await page.screenshot({path:'dist/payos-uat/payment-return-'+width+'.png',fullPage:true});
   results.push({width,passed:true,queryCannotSettle:true,keyboardContact:true,remoteRequests:0});await page.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync('dist/payos-uat/return-browser.json',JSON.stringify({results},null,2));console.log('PASS payment return: desktop/mobile, forged paid query, keyboard, no writes or remote requests');
})().catch(error=>{console.error(error);process.exitCode=1;});
