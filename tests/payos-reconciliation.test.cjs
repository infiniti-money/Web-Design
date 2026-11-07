const test=require('node:test'),assert=require('node:assert/strict');
const id='11111111-1111-4111-8111-111111111111',url='https://database.invalid/functions/v1/payos-webhook';
const modulePromise=import('../supabase/functions/_shared/payos-reconciliation.mjs');
async function setup(){const {reconciliationCore}=await modulePromise,calls=[];const provider={confirm:async value=>{calls.push(['confirm',value]);return{webhookUrl:value,accountNumber:'PRIVATE_BANK'};},get:async()=>({id:'link',orderCode:7,amount:10000,amountPaid:10000,amountRemaining:0,status:'PAID',transactions:[{reference:'ref',amount:10000,accountNumber:'PRIVATE_BANK'}]})};const rpc=async(name,args)=>{calls.push([name,args]);return name==='payos_admin_intent'?{id,orderCode:7,amount:10000,paymentLinkId:'link'}:{recorded:true};};return{calls,provider,core:reconciliationCore({auth:async()=>({id,role:'admin'}),rpc,provider,webhookUrl:url})};}
test('Webhook confirmation uses fixed server URL and returns no merchant bank details',async()=>{
 const x=await setup(),r=await x.core(null,{action:'confirm_webhook',reason:'Admin verifies channel',webhookUrl:'https://evil.invalid',actorId:'forged'});
 assert.deepEqual(r,{webhookConfirmed:true,webhookUrl:url});assert.equal(x.calls[0][1],url);assert.equal(x.calls[1][1].p_actor,id);assert.ok(!JSON.stringify(r).includes('PRIVATE'));
});
test('Failed or wrong webhook confirmation cannot record a successful check',async()=>{
 const x=await setup();x.provider.confirm=async()=>({webhookUrl:'https://evil.invalid'});await assert.rejects(x.core(null,{action:'confirm_webhook',reason:'Admin verifies channel'}),/MERCHANT_WEBHOOK_CHECK_FAILED/);assert.equal(x.calls.length,0);
});
test('Provider lookup is signed SDK data reduced to accounting fields',async()=>{
 const x=await setup();await x.core(null,{action:'sync',intentId:id,reason:'Check the provider status'});const args=x.calls.find(c=>c[0]==='payos_sync_provider')[1];assert.equal(args.p_actor,id);assert.deepEqual(args.p_snapshot.transactions,[{reference:'ref',amount:10000}]);assert.ok(!JSON.stringify(args).includes('PRIVATE'));
});
test('Malformed or mismatched provider response never reaches the sync RPC',async()=>{
 for(const patch of [{amount:1},{id:'wrong-link'},{amountPaid:'10000'},{transactions:[{amount:0,reference:'x'}]}]){const x=await setup(),original=x.provider.get;x.provider.get=async()=>({...await original(),...patch});await assert.rejects(x.core(null,{action:'sync',intentId:id,reason:'Check provider transaction'}),/PROVIDER_RESULT_UNCONFIRMED/);assert.equal(x.calls.filter(c=>c[0]==='payos_sync_provider').length,0);}
});
test('Review cannot impersonate an actor or forge webhook confirmation / forced paid',async()=>{
 const x=await setup();await x.core(null,{action:'review',intentId:id,kind:'bank_confirmed',reason:'Admin manually checked bank',actorId:'forged',state:'paid'});assert.equal(x.calls[0][1].p_actor,id);assert.equal(x.calls[0][1].p_kind,'bank_confirmed');assert.ok(!('state' in x.calls[0][1]));
 for(const kind of ['force_paid','webhook_confirmed'])await assert.rejects(x.core(null,{action:'review',intentId:id,kind,reason:'Forged action attempt'}),/INVALID_ADMIN_REQUEST/);
});
test('Pilot only accepts the server-selected quote and amount before reservation',async()=>{
 const {paymentCore}=await import('../supabase/functions/_shared/payos-core.mjs');let calls=0;const core=paymentCore({enabled:true,auth:async()=>({id,role:'admin'}),store:{reserve:async()=>{calls++;}},provider:{},pilot:{quoteId:id,amount:10000}});
 await assert.rejects(core.create(null,{quoteId:id,amount:20000,requestKey:id}),/PAYOS_PILOT_SCOPE_ONLY/);assert.equal(calls,0);
});
test('Public health excludes private pilot identifiers and amount',async()=>{
 const {runtimeHandler}=await import('../supabase/functions/_shared/payos-runtime.mjs');
 const values={PAYOS_CLIENT_ID:'fake',PAYOS_API_KEY:'fake',PAYOS_CHECKSUM_KEY:'fake',PAYOS_PAYMENTS_ENABLED:'true',PAYOS_LEDGER_READY:'true',PAYOS_PILOT_QUOTE_ID:id,PAYOS_PILOT_AMOUNT:'10000'};
 const handler=runtimeHandler({env:n=>values[n],sdk:()=>{throw Error('no SDK on public health');},mode:'deposits',releaseEnabled:true,pilotOnly:true});
 const response=await handler(new Request('https://edge.invalid/health'));const result=await response.json();assert.equal(result.pilotOnly,true);assert.equal(result.paymentsEnabled,true);assert.ok(!JSON.stringify(result).includes(id));assert.equal(result.pilotAmount,undefined);
});
