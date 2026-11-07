const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.SITE_URL||'http://127.0.0.1:4173/',qid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',iid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function setup(page,role='admin',empty=false,general=false){
 await page.addInitScript(({role,empty,qid,iid})=>{
  const state=window.__payState={writes:[],fail:false,intents:empty?[]:[{id:iid,quote_id:qid,state:'unknown',amount:10000,order_code:7000000000000,created_at:'2026-11-08T00:00:00Z'}],events:[]};
  window.__payDB={auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.invalid',app_metadata:{role}}}}),getSession:async()=>({data:{session:{access_token:'SYNTHETIC_BROWSER'}}})},from(table){const filters=[];const query={select(){return query;},eq(k,v){filters.push(r=>r[k]===v);return query;},in(k,v){filters.push(r=>v.includes(r[k]));return query;},order(){return query;},range(){return query;},limit(){return query;},single:async()=>({data:{role,active:true}}),then(resolve,reject){if(state.fail)return Promise.resolve({error:{message:'synthetic offline'}}).then(resolve,reject);const rows={payos_deposit_intents:state.intents,payos_receipts:[{id:1,intent_id:null,order_code:123,amount:3000,currency:'VND',reference:'synthetic-ref',result:'unmatched',created_at:'2026-11-08T00:00:00Z'}],customer_quotes:[{id:qid,title:'Báo giá kiểm thử',status:'accepted',approved_version_id:'v1'}],customer_quote_versions:[{id:'v1',total_amount:20000}],payos_admin_events:state.events}[table]||[];return Promise.resolve({data:rows.filter(r=>filters.every(f=>f(r))),error:null}).then(resolve,reject);}};return query;}};
 },{role,empty,qid,iid});
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>window.__payDB};'}));
 await page.route('https://mswiegltusllzvuavjdh.supabase.co/**',async route=>{
  const url=route.request().url();
  if(url.endsWith('/health')||route.request().postDataJSON()?.action==='status')return route.fulfill({json:{credentialsPresent:true,paymentsEnabled:true,pilotOnly:!general,pilotQuoteId:general?undefined:qid,pilotAmount:general?undefined:10000}});
  if(route.request().postDataJSON()?.action==='balances'){const data=await page.evaluate(ids=>ids.map(quote_id=>{const rows=window.__payState.intents.filter(i=>i.quote_id===quote_id&&i.state!=='cancelled');return{quote_id,total:20000,remaining:Math.max(20000-rows.reduce((s,r)=>s+r.amount,0),0),active:rows.some(r=>['reserved','ready','unknown','review'].includes(r.state))};}),route.request().postDataJSON().quoteIds);return route.fulfill({json:data});}
  assert.equal(route.request().headers().authorization,'Bearer SYNTHETIC_BROWSER');const body=route.request().postDataJSON();await page.evaluate(body=>window.__payState.writes.push(body),body);
  if(url.endsWith('/payos-admin')){
   if(body.action==='sync')await page.evaluate(()=>{window.__payState.intents[0].state='paid';window.__payState.events.unshift({kind:'provider_sync',reason:'Kết quả giả lập',created_at:'2026-11-08T00:00:00Z',intent_id:window.__payState.intents[0].id,details:{outcome:'confirmed_paid'}});});
   return route.fulfill({json:body.action==='sync'?{outcome:'confirmed_paid',state:'paid'}:{recorded:true,webhookConfirmed:true}});
  }
  assert.ok(url.endsWith('/payos-deposits'));await new Promise(r=>setTimeout(r,150));
  await page.evaluate(({qid,iid,amount})=>window.__payState.intents.push({id:iid,quote_id:qid,state:'ready',amount,order_code:7000000000000,checkout_url:'https://pay.payos.vn/web/synthetic',created_at:'2026-11-08T00:00:00Z'}),{qid:body.quoteId,iid,amount:body.amount});
  return route.fulfill({json:{intentId:iid,state:'ready',checkoutUrl:'https://pay.payos.vn/web/synthetic'}});
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(new URL('payments.html',base).href);await page.locator('#payment-status').filter({hasNotText:'Đang xác thực'}).waitFor();
 if(role==='admin')await page.getByText('Đã tải dữ liệu. Trạng thái thu tiền lấy từ máy chủ.',{exact:true}).waitFor();
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});fs.mkdirSync('dist/payos-admin-uat',{recursive:true});
 try{
  for(const role of ['manager','employee']){const page=await browser.newPage();await setup(page,role);assert.equal(await page.locator('#payment-app').isVisible(),false);assert.equal(await page.evaluate(()=>window.__payState.writes.length),0);await page.close();}
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.locator('#payment-intents button').click();await page.locator('#payment-detail').waitFor();assert.equal(await page.locator('#confirm-bank').isVisible(),false);
   await page.locator('#sync-provider').click();assert.match(await page.locator('#payment-detail-status').innerText(),/5 đến 1000/);assert.equal(await page.evaluate(()=>window.__payState.writes.length),0);
   await page.locator('#payment-reason').fill('Kiểm tra trạng thái từ nhà cung cấp');await page.locator('#sync-provider').click();await page.locator('#payment-detail').waitFor({state:'hidden'});
   await page.locator('#payment-filter').selectOption('paid');await page.locator('#payment-intents button').waitFor();await page.locator('#payment-intents button').click();assert.equal(await page.locator('#confirm-bank').isVisible(),true);
   await page.locator('#payment-reason').fill('Đã tự kiểm tra tiền vào ngân hàng');await page.locator('#confirm-bank').click();await page.locator('#payment-detail').waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>window.__payState.writes.at(-1).kind),'bank_confirmed');
   await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'dist/payos-admin-uat/payments-'+width+'.png',fullPage:true});
   await page.evaluate(()=>window.__payState.fail=true);await page.locator('#refresh-payments').click();await page.getByText('Chưa tải được sổ giao dịch. Thử tải lại sau.',{exact:true}).waitFor();assert.equal(await page.locator('#payment-intents .payment-card').count(),0);assert.equal(await page.locator('#create-deposit').isDisabled(),true);assert.deepEqual(errors,[]);await page.close();
  }
  const generalPage=await browser.newPage();await setup(generalPage,'admin',true,true);assert.equal(await generalPage.locator('#deposit-amount').evaluate(el=>el.readOnly),false);await generalPage.locator('#deposit-amount').fill('5000');await generalPage.locator('#create-deposit').click();await generalPage.locator('#checkout-link').waitFor();assert.equal(await generalPage.evaluate(()=>window.__payState.writes[0].amount),5000);assert.match(await generalPage.locator('#quote-amount').innerText(),/15.000/);await generalPage.close();
  const page=await browser.newPage();await setup(page,'admin',true);await page.locator('#create-deposit').dblclick();await page.locator('#checkout-link').waitFor();assert.equal(await page.locator('#checkout-link').getAttribute('href'),'https://pay.payos.vn/web/synthetic');assert.equal(await page.evaluate(()=>window.__payState.writes.length),1);await page.close();
  console.log('PASS payments UI: desktop/mobile, roles, reason guard, provider sync, explicit bank attestation, no double submit and stale-data clearing. Fixtures only; no real merchant calls.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
