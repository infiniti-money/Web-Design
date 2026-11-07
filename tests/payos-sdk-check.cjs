// Official SDK integration with synthetic keys and intercepted fetch. NEVER merchant credentials.
const {PayOS}=require('../dist/payos-sdk/node_modules/@payos/node'),assert=require('node:assert/strict'),{createHmac}=require('node:crypto');
const key='UNIT_TEST_CHECKSUM_NOT_A_REAL_KEY',sign=text=>createHmac('sha256',key).update(text).digest('hex');
const data={orderCode:7000000000000,amount:100000,reference:'ref',currency:'VND',paymentLinkId:'link',code:'00'};
const signature=sign('amount=100000&code=00&currency=VND&orderCode=7000000000000&paymentLinkId=link&reference=ref');
(async()=>{
 let requests=0;
 const client=new PayOS({clientId:'UNIT_TEST_CLIENT',apiKey:'UNIT_TEST_API',checksumKey:key,logLevel:'off',maxRetries:0,fetch:async(_url,options)=>{
  requests++;const body=JSON.parse(options.body);
  assert.equal(body.signature,sign(`amount=${body.amount}&cancelUrl=${body.cancelUrl}&description=${body.description}&orderCode=${body.orderCode}&returnUrl=${body.returnUrl}`));
  const result={orderCode:body.orderCode,amount:body.amount,currency:'VND',paymentLinkId:'link',checkoutUrl:'https://pay.payos.vn/web/link'};
  const signed=Object.keys(result).sort().map(name=>name+'='+result[name]).join('&');
  return Response.json({code:'00',desc:'success',data:result,signature:sign(signed)});
 }});
 assert.deepEqual(await client.webhooks.verify({code:'00',success:true,data,signature}),data);
 await assert.rejects(client.webhooks.verify({code:'00',success:true,data:{...data,amount:100001},signature}));
 await assert.rejects(client.webhooks.verify({code:'00',success:true,data,signature:''}));
 const result=await client.paymentRequests.create({orderCode:7000000000000,amount:100000,description:'DH0000000',returnUrl:'https://example.invalid/return',cancelUrl:'https://example.invalid/cancel'});
 assert.equal(result.amount,100000);assert.equal(requests,1);
 console.log('payOS SDK 2.0.5: independent webhook HMAC vector, tamper rejection, signed create request and verified mock response passed. No network or real keys.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
