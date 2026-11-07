// HTTP -> runtime -> official SDK (intercepted merchant) -> real PostgreSQL RPCs.
// Synthetic data only. No Supabase/platform/merchant credentials are accepted.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const {createServer}=require('node:http'),{createHmac,randomUUID}=require('node:crypto');
const run=promisify(execFile),{PayOS}=require('../dist/payos-sdk/node_modules/@payos/node');
const container=process.env.PAYOS_TEST_DOCKER_CONTAINER,database='payos_e2e_test';
const docker=process.env.PAYOS_TEST_DOCKER_EXE||'docker';
const admin='11111111-1111-4111-8111-111111111111',manager='22222222-2222-4222-8222-222222222222';
const checksum='SYNTHETIC_HTTP_TEST_CHECKSUM',sign=data=>createHmac('sha256',checksum).update(Object.keys(data).sort().map(k=>k+'='+data[k]).join('&')).digest('hex');
const literal=value=>value==null?'NULL':"'"+String(value).replace(/'/g,"''")+"'";
async function sql(command){
 const args=['-U','ci','-d',database,'-Atq','-v','ON_ERROR_STOP=1','-c',command];
 try{return(await run(container?docker:'psql',container?['exec',container,'psql',...args]:['-h','127.0.0.1',...args],{maxBuffer:2*1024*1024})).stdout.trim();}
 catch(error){throw Error((error.stderr||error.message).trim());}
}
async function json(command){return JSON.parse(await sql(command));}
const report=[],check=async(name,fn)=>{await fn();report.push({name,passed:true});console.log('PASS '+name);};
(async()=>{
 if(container){
  assert.match(container,/^atelier-payos-uat-/);
  const meta=JSON.parse((await run(docker,['inspect',container])).stdout)[0];
  assert.equal(Object.keys(meta.HostConfig.PortBindings||{}).length,0,'test container must publish no ports');
  const network=JSON.parse((await run(docker,['network','inspect',meta.HostConfig.NetworkMode])).stdout)[0];
  assert.equal(network.Internal,true,'test network must block outbound');
 }else{
  assert.equal(process.env.PGHOST,'127.0.0.1');assert.equal(process.env.PGUSER,'ci');
  assert.equal(process.env.PGDATABASE,database);assert.equal(process.env.PAYOS_TEST_ISOLATED,'1');
 }
 assert.equal(await sql("select current_database()||':'||(to_regclass('auth.users') is null)::text"),database+':true','requires a fresh synthetic database');
 const fixture=fs.readFileSync('tests/payos-ledger-isolated.sql','utf8').split('begin;')[1].split('\\ir ../supabase/migrations/')[0];
 const initSql='BEGIN;'+fixture+fs.readFileSync('supabase/migrations/20261107180731_payos_reconciliation_admin.sql','utf8')+fs.readFileSync('supabase/migrations/20261107183121_payos_general_availability.sql','utf8')+"update private.payos_pilot_policy set enabled=true,general_availability=true; select public.payos_record_review('"+admin+"',null,null,'webhook_confirmed','Synthetic webhook confirmed before general collection');COMMIT;";
 fs.mkdirSync('dist/payos-uat',{recursive:true});const initPath=path.resolve('dist/payos-uat/init-synthetic.sql');fs.writeFileSync(initPath,initSql);
 if(container)await run(docker,['cp',initPath,container+':/tmp/payos-uat-init.sql']);
 const initArgs=['-U','ci','-d',database,'-q','-v','ON_ERROR_STOP=1','-f',container?'/tmp/payos-uat-init.sql':initPath];
 await run(container?docker:'psql',container?['exec',container,'psql',...initArgs]:['-h','127.0.0.1',...initArgs]);
 const {runtimeHandler}=await import('../supabase/functions/_shared/payos-runtime.mjs');
 const values={PAYOS_CLIENT_ID:'SYNTHETIC_CLIENT',PAYOS_API_KEY:'SYNTHETIC_API',PAYOS_CHECKSUM_KEY:checksum,PAYOS_PAYMENTS_ENABLED:'true',PAYOS_LEDGER_READY:'true',SUPABASE_URL:'https://database.invalid',SUPABASE_ANON_KEY:'SYNTHETIC_ANON',SUPABASE_SERVICE_ROLE_KEY:'SYNTHETIC_SERVICE'};
 let providerCalls=0,providerMode='normal',earlyCallback,failFinish=false,revokeBeforeRpc=false;
 const providerOrders=new Map();
 const rpcNames={payos_reserve_deposit:['p_actor','p_quote','p_key','p_amount'],payos_finish_deposit_link:['p_id','p_link','p_url'],payos_mark_deposit_unknown:['p_id'],payos_apply_receipt:['p_order','p_reference','p_amount','p_currency','p_link']};
 const fetcher=async(url,opts={})=>{
  const u=new URL(url);assert.equal(u.origin,'https://database.invalid','unexpected network access');
  const token=new Headers(opts.headers).get('authorization');
  const actor=token==='Bearer SYNTHETIC_ADMIN'?admin:token==='Bearer SYNTHETIC_MANAGER'?manager:null;
  if(u.pathname==='/auth/v1/user'){
   if(!actor)return Response.json({error:'invalid'},{status:401});
   const rows=await json('select coalesce(json_agg(t),\'[]\') from (select id,raw_app_meta_data as app_metadata from auth.users where id='+literal(actor)+') t');
   return rows.length?Response.json(rows[0]):Response.json({}, {status:401});
  }
  if(u.pathname==='/rest/v1/staff_profiles'){
   assert.equal(u.searchParams.get('user_id'),'eq.'+actor);
   return Response.json(await json('select coalesce(json_agg(t),\'[]\') from (select role,active from public.staff_profiles where user_id='+literal(actor)+') t'));
  }
  const name=u.pathname.split('/').pop();assert.ok(rpcNames[name]);
  assert.equal(token,'Bearer SYNTHETIC_SERVICE');
  const args=JSON.parse(opts.body);
  if(revokeBeforeRpc&&name==='payos_reserve_deposit'){
   revokeBeforeRpc=false;await sql('update auth.users set raw_app_meta_data=\'{"role":"manager"}\' where id='+literal(admin));
  }
  if(failFinish&&name==='payos_finish_deposit_link'){failFinish=false;throw Error('SYNTHETIC_DATABASE_TIMEOUT');}
  try{
   const result=await sql('SET ROLE service_role; select public.'+name+'('+rpcNames[name].map(k=>literal(args[k])).join(',')+');');
   return Response.json(result.split('\n').at(-1)?JSON.parse(result.split('\n').at(-1)):null);
  }catch(error){return Response.json({message:(error.message.match(/ERROR:\s*(PAYOS_[A-Z_]+)/)||[])[1]||'synthetic_database_error'},{status:400});}
 };
 const sdk=options=>new PayOS({...options,fetch:async(url,opts)=>{
  assert.equal(new URL(url).origin,'https://api-merchant.payos.vn');providerCalls++;
  const body=JSON.parse(opts.body);
  const signed={amount:body.amount,cancelUrl:body.cancelUrl,description:body.description,orderCode:body.orderCode,returnUrl:body.returnUrl};
  assert.equal(body.signature,sign(signed));assert.ok(body.description.length<=9);
  const result={orderCode:body.orderCode,amount:body.amount,currency:'VND',paymentLinkId:'synthetic-'+body.orderCode,checkoutUrl:'https://pay.payos.vn/web/synthetic-'+body.orderCode};
  providerOrders.set(body.orderCode,result);
  if(providerMode==='timeout')throw Error('SYNTHETIC_MERCHANT_TIMEOUT');
  if(providerMode==='early')await earlyCallback(result);
  return Response.json({code:'00',desc:'success',data:result,signature:sign(result)});
 }});
 const config={env:n=>values[n],sdk,releaseEnabled:true,fetcher};
 const deposits=runtimeHandler({...config,mode:'deposits'}),webhook=runtimeHandler({...config,mode:'webhook'});
 const server=createServer(async(req,res)=>{
  try{
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
   const response=await(req.url.startsWith('/webhook')?webhook:deposits)(request);
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  }catch{res.writeHead(500);res.end('synthetic harness error');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 async function post(route,body,token='SYNTHETIC_ADMIN',headers={}){
  const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:JSON.stringify(body)});
  const data=await response.json();assert.ok(!JSON.stringify(data).includes('SYNTHETIC_SERVICE'));return{httpStatus:response.status,status:response.status,...data};
 }
 async function quote(total=1000000){const q=randomUUID(),v=randomUUID();await sql('insert into public.customer_quotes values('+[literal(q),literal('accepted'),literal(admin),literal(v)].join(',')+'); insert into public.customer_quote_versions values('+[literal(v),literal(q),1,total,literal('{"synthetic":true}')+'::jsonb'].join(',')+');');return q;}
 const create=(q,amount=100000,requestKey=randomUUID(),extra={})=>post('/deposits',{quoteId:q,amount,requestKey,...extra});
 const row=id=>json('select to_jsonb(i) from public.payos_deposit_intents i where id='+literal(id));
 function envelope(order,overrides={}){const data={orderCode:order.orderCode,amount:order.amount,currency:'VND',paymentLinkId:order.paymentLinkId,reference:randomUUID(),code:'00',...overrides};return{code:'00',success:true,data,signature:sign(data)};}
 const order=async id=>providerOrders.get((await row(id)).order_code);
 try{
  await check('Auth: unsigned, Manager, inactive and revoked Admin blocked before merchant',async()=>{
   const q=await quote(),body={quoteId:q,amount:100000,requestKey:randomUUID()};const before=providerCalls;
   assert.equal((await post('/deposits',body,null)).status,401);assert.equal((await post('/deposits',body,'SYNTHETIC_MANAGER')).status,403);
   await sql('update public.staff_profiles set active=false where user_id='+literal(admin));assert.equal((await post('/deposits',body)).status,403);
   await sql('update public.staff_profiles set active=true where user_id='+literal(admin));revokeBeforeRpc=true;assert.equal((await post('/deposits',body)).error,'PAYOS_ADMIN_REQUIRED');
   await sql('update auth.users set raw_app_meta_data=\'{"role":"admin"}\' where id='+literal(admin));assert.equal(providerCalls,before);
  });
  await check('Admin creation, actor attribution, ready replay and paid replay',async()=>{
   const q=await quote(),key=randomUUID(),a=await create(q,100000,key,{actorId:manager,state:'paid'});assert.equal(a.status,200);assert.equal(a.state,'ready');assert.equal((await row(a.intentId)).created_by,admin);
   const before=providerCalls,b=await create(q,100000,key);assert.equal(b.checkoutUrl,a.checkoutUrl);assert.equal(providerCalls,before);
   const event=envelope(await order(a.intentId));assert.equal((await post('/webhook',event,null)).status,'paid'); // receipt result has its own status
   const paid=await create(q,100000,key);assert.equal(paid.state,'paid');assert.equal(paid.checkoutUrl,undefined);assert.equal(providerCalls,before);
  });
  await check('Concurrent duplicate callbacks settle once; altered signed replay conflicts',async()=>{
   const a=await create(await quote()),event=envelope(await order(a.intentId));
   const results=await Promise.all(Array.from({length:8},()=>post('/webhook',event,null)));
   assert.ok(results.every(r=>r.httpStatus===200));assert.equal(results.filter(r=>r.duplicate===false).length,1);assert.equal(results.filter(r=>r.duplicate===true).length,7);
   assert.equal(await sql('select count(*) from public.payos_receipts where reference='+literal(event.data.reference)),'1');
   const conflict=envelope(await order(a.intentId),{reference:event.data.reference,amount:event.data.amount+1});assert.equal((await post('/webhook',conflict,null)).error,'PAYOS_EVENT_CONFLICT');
  });
  await check('Bad signatures, tampering and non-success envelopes do not write receipts',async()=>{
   const a=await create(await quote()),event=envelope(await order(a.intentId));event.data.amount++;
   const before=await sql('select count(*) from public.payos_receipts');assert.equal((await post('/webhook',event,null)).error,'INVALID_WEBHOOK_SIGNATURE');
   const failure=envelope(await order(a.intentId),{code:'01'});assert.equal((await post('/webhook',{...failure,success:false},null)).status,'ignored');assert.equal(await sql('select count(*) from public.payos_receipts'),before);
  });
  for(const [name,overrides] of [['partial',{amount:50000}],['excess',{amount:100001}],['currency',{currency:'USD'}],['wrong link',{paymentLinkId:'different-link'}]])await check('Reconciliation quarantine: '+name,async()=>{
   const q=await quote(),a=await create(q),event=envelope(await order(a.intentId),overrides),r=await post('/webhook',event,null);
   assert.equal(r.status,'needs_review');assert.equal((await row(a.intentId)).state,'review');assert.equal((await create(q)).error,'PAYOS_ACTIVE_PAYMENT');
  });
  await check('Unknown order retained unmatched and raw bank/customer fields discarded',async()=>{
   const event=envelope({orderCode:7999999999999,amount:1000,paymentLinkId:'unknown'},{counterAccountName:'SYNTHETIC_PRIVATE',accountNumber:'SYNTHETIC_PRIVATE'});
   assert.equal((await post('/webhook',event,null)).status,'unmatched');const receipt=await json('select to_jsonb(r) from public.payos_receipts r where reference='+literal(event.data.reference));assert.ok(!JSON.stringify(receipt).includes('SYNTHETIC_PRIVATE'));
  });
  await check('Provider timeout is unknown, replay never creates a second merchant link',async()=>{
   const q=await quote(),key=randomUUID(),before=providerCalls;providerMode='timeout';const a=await create(q,100000,key);providerMode='normal';assert.equal(a.status,502);
   const state=await sql('select state from public.payos_deposit_intents where request_key='+literal(key));assert.equal(state,'unknown');assert.equal((await create(q,100000,key)).error,'DEPOSIT_REQUIRES_RECONCILIATION');assert.equal(providerCalls,before+1);
  });
  await check('Database failure after merchant creation requires reconciliation',async()=>{
   const q=await quote(),key=randomUUID();failFinish=true;assert.equal((await create(q,100000,key)).status,502);
   const intent=await json('select to_jsonb(i) from public.payos_deposit_intents i where request_key='+literal(key));assert.equal(intent.state,'unknown');assert.equal((await post('/webhook',envelope(providerOrders.get(intent.order_code)),null)).status,'needs_review');
  });
  await check('Callback before link persistence cannot falsely become paid',async()=>{
   const q=await quote();providerMode='early';earlyCallback=async result=>assert.equal((await post('/webhook',envelope(result),null)).status,'needs_review');
   const a=await create(q);providerMode='normal';assert.equal(a.state,'review');assert.equal(a.checkoutUrl,undefined);assert.equal((await row(a.intentId)).state,'review');
  });
  await check('Concurrent different requests for one quote create one merchant link',async()=>{
   const q=await quote(),before=providerCalls;const results=await Promise.all([create(q,600000),create(q,600000)]);
   assert.equal(results.filter(x=>x.status===200).length,1);assert.equal(results.filter(x=>x.error==='PAYOS_ACTIVE_PAYMENT').length,1);assert.equal(providerCalls,before+1);
  });
  await check('Concurrent identical request key never creates twice and can be replayed',async()=>{
   const q=await quote(),key=randomUUID(),before=providerCalls;
   const results=await Promise.all([create(q,100000,key),create(q,100000,key)]);
   assert.ok(results.some(x=>x.httpStatus===200));
   assert.ok(results.every(x=>x.httpStatus===200||x.error==='DEPOSIT_REQUIRES_RECONCILIATION'));
   assert.equal(providerCalls,before+1);const replay=await create(q,100000,key);assert.equal(replay.state,'ready');assert.equal(providerCalls,before+1);
  });
  await check('A second bank reference after paid stays in review without counting twice',async()=>{
   const a=await create(await quote()),result=await order(a.intentId);
   assert.equal((await post('/webhook',envelope(result),null)).status,'paid');
   assert.equal((await post('/webhook',envelope(result),null)).status,'needs_review');
   assert.equal((await row(a.intentId)).state,'paid');
   assert.equal(await sql('select count(*) from public.payos_receipts where intent_id='+literal(a.intentId)+' and result=\'paid\''),'1');
  });
  await check('Paid totals and remaining amount prevent collecting beyond quote value',async()=>{
   const q=await quote(),a=await create(q,700000);await post('/webhook',envelope(await order(a.intentId)),null);
   const before=providerCalls;assert.equal((await create(q,300001)).error,'PAYOS_AMOUNT_EXCEEDS_BALANCE');assert.equal(providerCalls,before);
   const b=await create(q,300000);assert.equal((await post('/webhook',envelope(await order(b.intentId)),null)).status,'paid');assert.equal(await sql('select sum(amount) from public.payos_deposit_intents where state=\'paid\' and quote_id='+literal(q)),'1000000');
  });
  await check('Ledger read/write permissions and stale forged JWT claims',async()=>{
   await assert.rejects(sql('SET ROLE anon; select * from public.payos_receipts'),/permission denied/);
   const claims=JSON.stringify({sub:manager,app_metadata:{role:'admin'}});
   assert.equal(await sql('BEGIN;SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claims"='+literal(claims)+'; select count(*) from public.payos_receipts;ROLLBACK;'),'0');
   await assert.rejects(sql('update public.payos_receipts set amount=amount'),/PAYOS_LEDGER_IMMUTABLE/);
  });
  await check('HTTP origin and body limits reject before ledger/provider traffic',async()=>{
   assert.equal((await post('/deposits',{},'SYNTHETIC_ADMIN',{Origin:'https://attacker.invalid'})).status,403);
   assert.equal((await post('/webhook',{padding:'x'.repeat(17000)},null)).status,413);
  });
 }finally{await new Promise(resolve=>server.close(resolve));}
 fs.mkdirSync('dist/payos-uat',{recursive:true});fs.writeFileSync('dist/payos-uat/http-ledger.json',JSON.stringify({synthetic:true,auth:'adapter using SQL roles; real Auth service not exercised',merchant:'official SDK with synthetic HMAC and intercepted fetch; no real network',database:'PostgreSQL with synthetic schema/data',providerCalls,checks:report},null,2));
 console.log('PASS '+report.length+' HTTP/SDK/PostgreSQL checks; no real merchant or production calls');
})().catch(error=>{console.error(error);process.exitCode=1;});
