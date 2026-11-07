const test=require('node:test'),assert=require('node:assert/strict');
const modules=Promise.all([import('../supabase/functions/_shared/payos-core.mjs'),import('../supabase/functions/_shared/payos-runtime.mjs')]);
const quoteId='11111111-1111-4111-8111-111111111111',requestKey='22222222-2222-4222-8222-222222222222';
async function setup(overrides={}){
 const [{paymentCore}]=await modules,calls=[];
 const intent={id:'intent',fresh:true,order_code:7000000000000,amount:100000,state:'reserved'};
 const store={reserve:async input=>{calls.push(['reserve',input]);return intent;},finish:async input=>{calls.push(['finish',input]);return{state:'ready'};},unknown:async id=>calls.push(['unknown',id]),receipt:async input=>{calls.push(['receipt',input]);return{status:'paid'};}};
 const provider={create:async input=>{calls.push(['create',input]);return{orderCode:intent.order_code,amount:intent.amount,currency:'VND',paymentLinkId:'link',checkoutUrl:'https://pay.payos.vn/web/link'};},verify:async envelope=>envelope.data};
 return{calls,store,provider,intent,core:paymentCore({enabled:true,auth:async()=>({id:'actor',role:'admin'}),store,provider,...overrides})};
}
const input={quoteId,requestKey,amount:100000};
test('Payment switch defaults closed before Auth, database or provider access',async()=>{
 const x=await setup({enabled:false});await assert.rejects(x.core.create(null,input),/PAYMENTS_DISABLED/);await assert.rejects(x.core.webhook({}),/PAYMENTS_DISABLED/);assert.deepEqual(x.calls,[]);
});
test('Manager cannot create deposits; unsafe money and identifiers never reach a store',async()=>{
 const x=await setup({auth:async()=>({id:'actor',role:'manager'})});await assert.rejects(x.core.create(null,input),/ADMIN_REQUIRED/);assert.deepEqual(x.calls,[]);
 for(const amount of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,NaN,'100000']){const y=await setup();await assert.rejects(y.core.create(null,{...input,amount}),/INVALID_DEPOSIT_REQUEST/);assert.deepEqual(y.calls,[]);}
 const z=await setup();await assert.rejects(z.core.create(null,{...input,quoteId:'../quote'}),/INVALID_DEPOSIT_REQUEST/);
});
test('Provider uses the database reservation, fixed return URLs and no customer attributes',async()=>{
 const x=await setup();x.intent.amount=50000;await x.core.create(null,input);const body=x.calls.find(c=>c[0]==='create')[1];assert.equal(body.amount,50000);assert.ok(body.description.length<=9);assert.equal(body.returnUrl,'https://infiniti-money.github.io/Web-Design/payment-return.html');assert.deepEqual(Object.keys(body).sort(),['amount','cancelUrl','description','expiredAt','orderCode','returnUrl']);assert.equal(x.calls.filter(c=>c[0]==='create').length,1);
});
test('Idempotent ready replay returns the existing link without a second provider request',async()=>{
 const x=await setup();Object.assign(x.intent,{fresh:false,state:'ready',checkout_url:'https://pay.payos.vn/web/existing'});assert.equal((await x.core.create(null,input)).checkoutUrl,x.intent.checkout_url);assert.equal(x.calls.filter(c=>c[0]==='create').length,0);
 x.intent.state='unknown';await assert.rejects(x.core.create(null,input),/REQUIRES_RECONCILIATION/);assert.equal(x.calls.filter(c=>c[0]==='create').length,0);
});
test('A provider timeout or wrong amount quarantines the reservation and never retries',async()=>{
 for(const failure of ['timeout','amount','url']){const x=await setup();x.provider.create=async()=>{if(failure==='timeout')throw Error('SECRET_PROVIDER_DETAIL');return{orderCode:x.intent.order_code,amount:failure==='amount'?1:x.intent.amount,currency:'VND',paymentLinkId:'link',checkoutUrl:failure==='url'?'https://pay.payos.vn.evil.invalid/':'https://pay.payos.vn/web/link'};};await assert.rejects(x.core.create(null,input),error=>error.code==='PROVIDER_RESULT_UNCONFIRMED'&&!error.message.includes('SECRET'));assert.equal(x.calls.filter(c=>c[0]==='unknown').length,1);assert.equal(x.calls.filter(c=>c[0]==='finish').length,0);}
});
test('Webhook signature failure and signed non-success responses cannot settle money',async()=>{
 const x=await setup();x.provider.verify=async()=>{throw Error('bad signature')};await assert.rejects(x.core.webhook({}),/INVALID_WEBHOOK_SIGNATURE/);assert.equal(x.calls.length,0);
 const y=await setup();assert.deepEqual(await y.core.webhook({code:'01',success:false,data:{code:'01'}}),{status:'ignored'});assert.equal(y.calls.length,0);
});
test('Only allowlisted signed receipt fields go to the database; partial currency anomalies stay visible for review',async()=>{
 const x=await setup(),data={orderCode:7,amount:100,reference:'bank-ref',currency:'USD',paymentLinkId:'link',code:'00',counterAccountName:'PRIVATE',accountNumber:'PRIVATE'};
 await x.core.webhook({code:'00',success:true,data});const receipt=x.calls[0][1];assert.deepEqual(receipt,{orderCode:7,amount:100,reference:'bank-ref',currency:'USD',paymentLinkId:'link'});assert.ok(!JSON.stringify(receipt).includes('PRIVATE'));
 await assert.rejects(x.core.webhook({code:'00',success:true,data:{...data,amount:-1}}),/INVALID_WEBHOOK_DATA/);
});
test('Public health reports presence only, never keys or an assertion that merchant credentials are valid',async()=>{
 const [,{runtimeHandler}]=await modules,values={PAYOS_CLIENT_ID:'fake-client-private',PAYOS_API_KEY:'fake-api-private',PAYOS_CHECKSUM_KEY:'fake-checksum-private'};let calls=0;
 const handle=runtimeHandler({env:name=>values[name],sdk:()=>{calls++;throw Error('must not construct SDK')},mode:'deposits',fetcher:async()=>{calls++;throw Error('must not fetch')}});
 const response=await handle(new Request('https://edge.invalid/payos-deposits/health'));assert.equal(response.status,200);const text=await response.text();assert.deepEqual(JSON.parse(text),{service:'payos-deposits',credentialsPresent:true,paymentsEnabled:false});assert.ok(!text.includes('private'));assert.equal(calls,0);
 const post=await handle(new Request('https://edge.invalid/payos-deposits',{method:'POST',body:'{}'}));assert.equal(post.status,503);assert.equal(calls,0);
});
test('Enabled endpoint enforces fresh Admin Auth and active profile before any ledger operation',async()=>{
 const [,{runtimeHandler}]=await modules;let sdkCalls=0,rpcCalls=0;
 const values={PAYOS_CLIENT_ID:'fake',PAYOS_API_KEY:'fake',PAYOS_CHECKSUM_KEY:'fake',PAYOS_PAYMENTS_ENABLED:'true',PAYOS_LEDGER_READY:'true',SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'fake'};
 const handle=runtimeHandler({env:name=>values[name],mode:'deposits',releaseEnabled:true,sdk:()=>{sdkCalls++;return{}},fetcher:async url=>{if(String(url).includes('/auth/v1/'))return Response.json({id:quoteId,app_metadata:{role:'admin'}});if(String(url).includes('/staff_profiles'))return Response.json([{role:'admin',active:false}]);rpcCalls++;throw Error('unexpected ledger');}});
 const unauthorized=await handle(new Request('https://edge.invalid/payos-deposits',{method:'POST',body:JSON.stringify(input)}));assert.equal(unauthorized.status,401);
 const inactive=await handle(new Request('https://edge.invalid/payos-deposits',{method:'POST',headers:{Authorization:'Bearer SYNTHETIC'},body:JSON.stringify(input)}));assert.equal(inactive.status,403);assert.equal(rpcCalls,0);
});
test('Oversized body and disallowed origins stop before Auth/provider traffic',async()=>{
 const [,{runtimeHandler,boundedJson}]=await modules;
 await assert.rejects(boundedJson(new Request('https://x.invalid',{method:'POST',body:'x'.repeat(17000)})),/BODY_TOO_LARGE/);
 const h=runtimeHandler({env:()=>undefined,sdk:()=>{throw Error('unexpected')},mode:'deposits'});const r=await h(new Request('https://x.invalid/health',{headers:{Origin:'https://evil.invalid'}}));assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
});
