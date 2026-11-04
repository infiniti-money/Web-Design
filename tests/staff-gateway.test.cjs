const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{stripTypeScriptTypes}=require("node:module");
const raw=fs.readFileSync("supabase/functions/staff-management/index.ts","utf8").replace(/^import[^\n]+\n/m,"");
const source=stripTypeScriptTypes(raw,{mode:"strip"});
const adminId="d0a00000-0000-4000-8000-000000000011",targetId="d0a00000-0000-4000-8000-000000000012";
function setup(options={}){
  let handler;const calls=[];
  const target={id:targetId,email:"fixture@example.invalid",email_confirmed_at:"2026-01-01T00:00:00Z",app_metadata:{},user_metadata:{full_name:"Nhân sự kiểm thử",date_of_birth:"2000-01-01",phone_number_unverified:"0900000000"}};
  const service={
    auth:{
      getUser:async()=>({data:{user:options.invalidToken?null:{id:adminId,app_metadata:{role:options.role||"admin"},user_metadata:{role:"admin"}}},error:null}),
      admin:{
        listUsers:async()=>({data:{users:[target]},error:null}),
        getUserById:async()=>({data:{user:target},error:null}),
        updateUserById:async(id,value)=>{calls.push({kind:"metadata",id,value});return{error:null};},
        inviteUserByEmail:async()=>{calls.push({kind:"invitation"});return{data:{user:target},error:null};}
      }
    },
    from(table){return{
      select(){return this;},eq(){return this;},
      single:async()=>({data:{user_id:adminId,role:options.profileRole||"admin",active:!options.inactive},error:null}),
      insert:async value=>{calls.push({kind:"insert",table,value});return{error:null};},
      upsert:async value=>{calls.push({kind:"upsert",table,value});return{error:null};},
      update(value){calls.push({kind:"update",table,value});return{eq:async()=>({error:null})};},
      delete(){return{eq:async()=>({error:null})};}
    };}
  };
  vm.runInNewContext(source,{Deno:{serve:fn=>handler=fn,env:{get:key=>key==="SUPABASE_URL"?"https://fixture.supabase.co":"TEST_NOT_REAL_SECRET"}},createClient:()=>service,Response,Request,Set,JSON,Date});
  const send=(body,origin="atelier://app",token="valid",method="POST")=>handler(new Request("https://fixture.supabase.co/functions/v1/staff-management",{method,headers:{origin,authorization:token?"Bearer "+token:"","content-type":"application/json"},...(method==="POST"?{body:JSON.stringify(body)}:{})}));
  return{send,calls};
}
test("Staff API explicitly accepts desktop/web origins and never reflects arbitrary origins",async()=>{
  const s=setup();const [desktop,web,bad]=await Promise.all([s.send({},"atelier://app",null,"OPTIONS"),s.send({},"https://infiniti-money.github.io",null,"OPTIONS"),s.send({},"https://attacker.test",null,"OPTIONS")]);
  assert.equal(desktop.status,204);assert.equal(desktop.headers.get("access-control-allow-origin"),"atelier://app");assert.equal(web.headers.get("access-control-allow-origin"),"https://infiniti-money.github.io");assert.equal(bad.status,403);assert.notEqual(bad.headers.get("access-control-allow-origin"),"https://attacker.test");assert.deepEqual(s.calls,[]);
});
test("Staff API denies missing sessions, non-admin claims, invalid tokens and disabled profiles before writes",async()=>{
  for(const options of [{role:"employee"},{inactive:true},{invalidToken:true},{profileRole:"manager"}]){const s=setup(options);const r=await s.send({action:"invite"});assert.ok([401,403].includes(r.status));assert.deepEqual(s.calls,[]);}
  const s=setup();assert.equal((await s.send({action:"pending"},"atelier://app",null)).status,401);
});
test("Approving a registration grants employee role only and does not send an invitation",async()=>{
  const s=setup(),r=await s.send({action:"review_registration",user_id:targetId,decision:"approve",role:"admin"});assert.equal(r.status,200);const profile=s.calls.find(c=>c.kind==="insert"),metadata=s.calls.find(c=>c.kind==="metadata");assert.equal(profile.value.role,"employee");assert.equal(metadata.value.app_metadata.role,"employee");assert.ok(!s.calls.some(c=>c.kind==="invitation"));
});
test("An administrator cannot demote or disable their own account through the staff API",async()=>{
  const s=setup(),r=await s.send({action:"update",user_id:adminId,role:"employee",active:false});assert.equal(r.status,409);assert.deepEqual(s.calls,[]);
});
