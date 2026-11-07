import {PaymentError,paymentCore} from './payos-core.mjs';
const allowedOrigins=new Set(['https://infiniti-money.github.io','atelier://app']);
export async function boundedJson(request){
  const reader=request.body?.getReader();if(!reader)throw new PaymentError('INVALID_JSON');
  let total=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>16384){await reader.cancel();throw new PaymentError('BODY_TOO_LARGE',413);}parts.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new PaymentError('INVALID_JSON');}
}
export function runtimeHandler({env,sdk,mode,releaseEnabled=false,fetcher=fetch}){
  const names=['PAYOS_CLIENT_ID','PAYOS_API_KEY','PAYOS_CHECKSUM_KEY'];
  const credentials=names.map(name=>env(name)||'');
  const configured=credentials.every(value=>value.trim().length>0);
  const enabled=releaseEnabled===true&&configured&&env('PAYOS_PAYMENTS_ENABLED')==='true'&&env('PAYOS_LEDGER_READY')==='true';
  const root=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),service=env('SUPABASE_SERVICE_ROLE_KEY');
  const businessCodes=new Set(['PAYOS_ADMIN_REQUIRED','PAYOS_QUOTE_NOT_ACCEPTED','PAYOS_AMOUNT_EXCEEDS_BALANCE','PAYOS_ACTIVE_PAYMENT','PAYOS_REQUEST_KEY_REUSED','PAYOS_QUOTE_HISTORY_UNPROTECTED','PAYOS_EVENT_CONFLICT']);
  async function rpc(name,args){
    const response=await fetcher(root+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok)throw new PaymentError(businessCodes.has(result?.message)?result.message:'LEDGER_UNAVAILABLE',businessCodes.has(result?.message)?409:503);return result;
  }
  async function auth(request){
    const token=request.headers.get('authorization');if(!token?.startsWith('Bearer '))throw new PaymentError('AUTH_REQUIRED',401);
    const headers={apikey:anon,Authorization:token};
    const response=await fetcher(root+'/auth/v1/user',{headers,signal:AbortSignal.timeout(10000)});if(!response.ok)throw new PaymentError('AUTH_REQUIRED',401);
    const user=await response.json();if(user.app_metadata?.role!=='admin'||!user.id)throw new PaymentError('ADMIN_REQUIRED',403);
    const url=new URL(root+'/rest/v1/staff_profiles');url.searchParams.set('select','role,active');url.searchParams.set('user_id','eq.'+user.id);
    const profileResponse=await fetcher(url,{headers,signal:AbortSignal.timeout(10000)});if(!profileResponse.ok)throw new PaymentError('ADMIN_REQUIRED',403);
    const profiles=await profileResponse.json();if(!Array.isArray(profiles)||profiles.length!==1||profiles[0].active!==true||profiles[0].role!=='admin')throw new PaymentError('ADMIN_REQUIRED',403);
    return{id:user.id,role:'admin'};
  }
  const store={
    reserve:({actorId,quoteId,requestKey,amount})=>rpc('payos_reserve_deposit',{p_actor:actorId,p_quote:quoteId,p_key:requestKey,p_amount:amount}),
    finish:({id,paymentLinkId,checkoutUrl})=>rpc('payos_finish_deposit_link',{p_id:id,p_link:paymentLinkId,p_url:checkoutUrl}),
    unknown:id=>rpc('payos_mark_deposit_unknown',{p_id:id}),
    receipt:({orderCode,amount,reference,currency,paymentLinkId})=>rpc('payos_apply_receipt',{p_order:orderCode,p_amount:amount,p_reference:reference,p_currency:currency,p_link:paymentLinkId})
  };
  // No SDK request, Auth request or database access occurs while disabled or during GET /health.
  let provider;
  function core(){
    if(!provider){const client=sdk({clientId:credentials[0],apiKey:credentials[1],checksumKey:credentials[2],maxRetries:0,timeout:15000,logLevel:'off'});provider={create:body=>client.paymentRequests.create(body),verify:body=>client.webhooks.verify(body)};}
    return paymentCore({enabled,auth,store,provider});
  }
  return async request=>{
    const origin=request.headers.get('origin')||'';
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowedOrigins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'};
    const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
    if(origin&&!allowedOrigins.has(origin))return reply(403,{error:'ORIGIN_NOT_ALLOWED'});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(mode==='deposits'&&request.method==='GET'&&new URL(request.url).pathname.endsWith('/health'))return reply(200,{service:'payos-deposits',credentialsPresent:configured,paymentsEnabled:enabled});
    if(request.method!=='POST')return reply(405,{error:'METHOD_NOT_ALLOWED'});
    if(!enabled)return reply(503,{error:'PAYMENTS_DISABLED'});
    try{const input=await boundedJson(request);const result=mode==='webhook'?await core().webhook(input):await core().create(request,input);return reply(200,result);}
    catch(error){return reply(error instanceof PaymentError?error.status:503,{error:error instanceof PaymentError?error.code:'PAYMENT_SERVICE_UNAVAILABLE'});}
  };
}
