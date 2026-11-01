// Tân Design v1.13.0 — privileged staff onboarding (never exposed in GitHub Pages).
// Supabase Auth's built-in invitation email is distinct from optional CRM email alerts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

const siteOrigin="https://infiniti-money.github.io";
const corsHeaders={
  "Access-Control-Allow-Origin":siteOrigin,
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Vary":"Origin",
  "Content-Type":"application/json;charset=utf-8"
};
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});
const roles=new Set(["admin","manager","employee"]);
const emailPattern=/^[^\s@]{1,100}@[^\s@]{1,160}\.[^\s@]{2,30}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});
  if(req.method!=="POST")return reply(405,{error:"METHOD_NOT_ALLOWED"});
  const origin=req.headers.get("origin");
  if(origin && origin!==siteOrigin)return reply(403,{error:"INVALID_ORIGIN"});
  const auth=req.headers.get("authorization")||"";
  const token=auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return reply(401,{error:"AUTH_REQUIRED"});
  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey)return reply(503,{error:"SERVER_NOT_CONFIGURED"});
  const service=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user:operator}={},error:userError}=await service.auth.getUser(token);
  if(userError||!operator)return reply(401,{error:"AUTH_INVALID"});
  if(operator.app_metadata?.role!=="admin")return reply(403,{error:"ADMIN_ONLY"});
  const {data:actor,error:actorErr}=await service.from("staff_profiles")
    .select("role,active").eq("user_id",operator.id).single();
  if(actorErr||!actor?.active||actor.role!=="admin")return reply(403,{error:"ADMIN_INACTIVE"});
  let body:Record<string,unknown>;
  try {
    const raw=await req.text();
    if(raw.length>4096)return reply(413,{error:"PAYLOAD_TOO_LARGE"});
    body=JSON.parse(raw);
    if(!body||typeof body!=="object"||Array.isArray(body))throw new Error();
  }catch{return reply(400,{error:"INVALID_JSON"})}
  const action=body.action;
  if(action==="pending"){
    const candidates=[];
    for(let page=1;page<=10;page++){
      const {data,error}=await service.auth.admin.listUsers({page,perPage:100});
      if(error)return reply(500,{error:"ACCOUNT_LIST_FAILED"});
      for(const user of data.users){
        if(user.app_metadata?.role||user.app_metadata?.registration_status==="rejected")continue;
        if(!user.email_confirmed_at)continue;
        const meta=user.user_metadata||{};
        if(!meta.full_name||!meta.date_of_birth||!meta.phone_number_unverified)continue;
        candidates.push({user_id:user.id,email:user.email,full_name:String(meta.full_name).slice(0,100),
          date_of_birth:String(meta.date_of_birth).slice(0,10),
          phone:String(meta.phone_number_unverified).slice(0,20),created_at:user.created_at});
      }
      if(data.users.length<100)break;
    }
    return reply(200,{ok:true,accounts:candidates});
  }
  if(action==="review_registration"){
    const id=String(body.user_id||"");
    const decision=String(body.decision||"");
    if(!uuid.test(id)||!["approve","reject"].includes(decision))return reply(422,{error:"INVALID_REVIEW"});
    const {data,error}=await service.auth.admin.getUserById(id);
    const target=data?.user;
    if(error||!target)return reply(404,{error:"ACCOUNT_NOT_FOUND"});
    if(target.app_metadata?.role||target.app_metadata?.registration_status==="rejected")
      return reply(409,{error:"ACCOUNT_ALREADY_REVIEWED"});
    if(!target.email_confirmed_at)return reply(409,{error:"EMAIL_NOT_CONFIRMED"});
    const meta=target.user_metadata||{};
    const name=String(meta.full_name||"").trim();
    if(name.length<2||name.length>100||!meta.date_of_birth||!meta.phone_number_unverified)
      return reply(422,{error:"REGISTRATION_INCOMPLETE"});
    if(decision==="reject"){
      const {error:denyError}=await service.auth.admin.updateUserById(id,{
        app_metadata:{...target.app_metadata,registration_status:"rejected"}
      });
      return denyError?reply(500,{error:"REVIEW_SAVE_FAILED"}):reply(200,{ok:true});
    }
    // Only employee can be assigned via self-registration approval.
    const {error:profileError}=await service.from("staff_profiles").insert({
      user_id:id,email:target.email,full_name:name,role:"employee",active:true
    });
    if(profileError)return reply(409,{error:"PROFILE_CREATE_FAILED"});
    const {error:roleError}=await service.auth.admin.updateUserById(id,{
      app_metadata:{...target.app_metadata,role:"employee",registration_status:"approved"}
    });
    if(roleError){
      await service.from("staff_profiles").delete().eq("user_id",id);
      return reply(500,{error:"ROLE_ASSIGNMENT_FAILED"});
    }
    return reply(200,{ok:true});
  }
  if(action==="invite"){
    const email=String(body.email||"").trim().toLowerCase();
    const name=String(body.full_name||"").trim();
    const role=String(body.role||"");
    if(!emailPattern.test(email)||name.length<2||name.length>100||!roles.has(role))
      return reply(422,{error:"INVALID_STAFF_DATA"});
    const {data:invite,error:inviteError}=await service.auth.admin.inviteUserByEmail(email,{
      redirectTo:"https://infiniti-money.github.io/Web-Design/set-password.html"
    });
    if(inviteError||!invite.user)return reply(409,{error:"INVITE_FAILED"});
    const user=invite.user;
    const {error:metaError}=await service.auth.admin.updateUserById(user.id,{
      app_metadata:{...user.app_metadata,role}
    });
    if(metaError)return reply(500,{error:"ROLE_ASSIGNMENT_FAILED"});
    const {error:profileError}=await service.from("staff_profiles").upsert({
      user_id:user.id,email,full_name:name,role,active:true,updated_at:new Date().toISOString()
    },{onConflict:"user_id"});
    if(profileError)return reply(500,{error:"PROFILE_SAVE_FAILED"});
    return reply(201,{ok:true,detail:"INVITATION_SENT",user_id:user.id});
  }
  if(action==="update"){
    const id=String(body.user_id||"");
    const nextRole=String(body.role||"");
    const active=body.active;
    if(!uuid.test(id)||!roles.has(nextRole)||typeof active!=="boolean")
      return reply(422,{error:"INVALID_STAFF_DATA"});
    const {data:current,error:currentError}=await service.from("staff_profiles")
      .select("user_id,role,active").eq("user_id",id).single();
    if(currentError||!current)return reply(404,{error:"STAFF_NOT_FOUND"});
    if(id===operator.id&&(nextRole!=="admin"||!active))
      return reply(409,{error:"CANNOT_DEMOTE_SELF"});
    // Explicitly reject removing/demoting Admin accounts: requires trusted maintenance
    // plus session revocation, because JWTs remain valid until they expire.
    if(current.role==="admin"&&(!active||nextRole!=="admin"))
      return reply(409,{error:"ADMIN_ROLE_PROTECTED"});
    const {data:authUser,error:fetchErr}=await service.auth.admin.getUserById(id);
    if(fetchErr||!authUser?.user)return reply(404,{error:"STAFF_AUTH_MISSING"});
    const {error:metaError}=await service.auth.admin.updateUserById(id,{
      app_metadata:{...authUser.user.app_metadata,role:active?nextRole:"disabled"}
    });
    if(metaError)return reply(500,{error:"ROLE_ASSIGNMENT_FAILED"});
    const {error:saveError}=await service.from("staff_profiles").update({
      role:nextRole,active,updated_at:new Date().toISOString()
    }).eq("user_id",id);
    if(saveError)return reply(500,{error:"PROFILE_SAVE_FAILED"});
    return reply(200,{ok:true,detail:"STAFF_UPDATED"});
  }
  return reply(400,{error:"UNKNOWN_ACTION"});
});
