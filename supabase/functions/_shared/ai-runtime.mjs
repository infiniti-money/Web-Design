import {validateNeeds,describeNeeds,instructions,geminiText} from './ai-core.mjs';
const originAllowed='https://infiniti-money.github.io';
export function aiHandler({env,knowledge,fetcher=fetch}){
 const enabled=()=>model==='gemini-3.5-flash-lite'&&env('AI_ENABLED')==='true'&&env('AI_QUOTA_READY')==='true'&&!!env('GEMINI_API_KEY')&&!!env('TURNSTILE_SECRET_KEY');
 const model=env('GEMINI_MODEL')||'gemini-3.5-flash-lite';
 const response=(status,code,extra={})=>new Response(JSON.stringify({ok:status===200,code,...extra}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':originAllowed,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'content-type','Vary':'Origin'}});
 return async request=>{
  const origin=request.headers.get('origin');if(origin&&origin!==originAllowed)return new Response('Forbidden',{status:403});
  if(request.method==='OPTIONS')return response(200,'PREFLIGHT');
  if(request.method==='GET'&&new URL(request.url).pathname.endsWith('/health'))return response(200,'HEALTH',{service:'ai-consultation',provider:'gemini',enabled:enabled(),model,limits:{requestsPerDay:500,requestsPerMinute:15,inputTokensPerMinute:250000,networkPerHour:30,resetTimezone:'America/Los_Angeles'}});
  if(request.method!=='POST')return response(405,'METHOD_NOT_ALLOWED');
  if(!enabled())return response(503,'AI_UNAVAILABLE');
  let needs,body;
  try{
   if(!(request.headers.get('content-type')||'').startsWith('application/json'))return response(415,'INVALID_CONTENT_TYPE');
   const reader=request.body?.getReader();if(!reader)return response(400,'INVALID_NEEDS');const chunks=[];let total=0;for(;;){const r=await reader.read();if(r.done)break;total+=r.value.length;if(total>4096){await reader.cancel();return response(413,'BODY_TOO_LARGE');}chunks.push(r.value);}
   const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));needs=validateNeeds(body);
  }catch{return response(400,'INVALID_NEEDS');}
  const token=body.turnstile_token;if(typeof token!=='string'||token.length<5||token.length>2048)return response(403,'CAPTCHA_REQUIRED');
  try{
   const verify=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env('TURNSTILE_SECRET_KEY'),response:token}),signal:AbortSignal.timeout(5000)});
   if(!verify.ok)return response(503,'CAPTCHA_UNAVAILABLE');const result=await verify.json();if(result.success!==true||result.hostname!=='infiniti-money.github.io'||result.action!=='ai_consultation')return response(403,'CAPTCHA_FAILED');
  }catch{return response(503,'CAPTCHA_UNAVAILABLE');}
  const root=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY');if(!root||!service)return response(503,'AI_UNAVAILABLE');
  try{
   const network=request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||(request.headers.get('x-forwarded-for')||'').split(',')[0]||'unknown';
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(service),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('atelier-ai:'+new Date().toISOString().slice(0,13)+':'+network));const hash=[...new Uint8Array(signature)].map(x=>x.toString(16).padStart(2,'0')).join('');
   const systemText=instructions(knowledge),userText=describeNeeds(needs),inputTokenBudget=new TextEncoder().encode(systemText+'\n'+userText).length+64;
   const quota=await fetcher(root+'/rest/v1/rpc/reserve_ai_consultation_budget',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({p_network_hash:hash,p_input_tokens:inputTokenBudget}),signal:AbortSignal.timeout(5000)});const result=await quota.json();if(!quota.ok)return response(result?.message==='AI_QUOTA_EXCEEDED'?429:503,result?.message==='AI_QUOTA_EXCEEDED'?'AI_LIMIT_REACHED':'AI_UNAVAILABLE');if(result!==true)return response(503,'AI_UNAVAILABLE');
   if(!/^gemini-[a-z0-9.-]+$/.test(model))return response(503,'AI_UNAVAILABLE');
   const answer=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env('GEMINI_API_KEY')},body:JSON.stringify({systemInstruction:{parts:[{text:systemText}]},contents:[{role:'user',parts:[{text:userText}]}],generationConfig:{maxOutputTokens:1600,temperature:0.3}}),signal:AbortSignal.timeout(25000)});
   if(!answer.ok)return response(answer.status===429?429:503,answer.status===429?'AI_LIMIT_REACHED':'AI_UNAVAILABLE');
   return response(200,'ANSWER',{answer:geminiText(await answer.json()),needs:describeNeeds(needs)});
  }catch{return response(503,'AI_UNAVAILABLE');}
 };
}
