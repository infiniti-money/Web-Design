const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined}),base=process.env.SITE_URL||'http://127.0.0.1:4187/';
 try{
  async function open(config,fail=false){
   const page=await browser.newPage();let requests=0;
   await page.route('**/assets/integration-config.js',route=>route.fulfill({contentType:'application/javascript',body:'window.ATELIER_INTEGRATIONS='+JSON.stringify({tawk:config})}));
   await page.route('https://embed.tawk.to/**',route=>{requests++;return fail?route.abort():route.fulfill({headers:{'access-control-allow-origin':'*'},contentType:'application/javascript',body:'window.Tawk_API.showWidget=()=>{};window.Tawk_API.maximize=()=>window.__chatOpens=(window.__chatOpens||0)+1;window.Tawk_API.hideWidget=()=>{};window.Tawk_API.onLoad();'});});
   await page.goto(base);return{page,count:()=>requests};
  }
  for(const config of [{enabled:false},{enabled:true,propertyId:'../unsafe',widgetId:'invalid'}]){
   const view=await open(config);assert.equal(await view.page.getByRole('button',{name:'Chat trực tiếp với nhân viên',exact:true}).count(),0);assert.equal(view.count(),0);await view.page.close();
  }
  const config={enabled:true,propertyId:'0123456789abcdef01234567',widgetId:'example123'},view=await open(config);
  assert.equal(view.count(),0);const button=view.page.getByRole('button',{name:'Chat trực tiếp với nhân viên',exact:true});await button.click();await view.page.waitForFunction(()=>window.__chatOpens===1);assert.equal(view.count(),1);await button.click();await view.page.waitForFunction(()=>window.__chatOpens===2);assert.equal(view.count(),1);await view.page.close();
  const unavailable=await open(config,true);await unavailable.page.getByRole('button',{name:'Chat trực tiếp với nhân viên',exact:true}).click();await unavailable.page.getByText(/Chưa kết nối được chat/).waitFor();assert.equal(await unavailable.page.getByRole('button',{name:'Chat trực tiếp với nhân viên',exact:true}).isEnabled(),true);await unavailable.page.getByRole('button',{name:'Chat trực tiếp với nhân viên',exact:true}).click();await unavailable.page.waitForFunction(()=>!document.querySelector('.consult-copy button').disabled);assert.equal(unavailable.count(),2);
  console.log('Customer chat: disabled/invalid configuration makes no provider requests; click-only loading, single SDK, reopen and retry after failure passed with synthetic provider.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
