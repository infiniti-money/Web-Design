const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const {authorize,readCounts,loadSnapshot}=require("../assets/operations.js");
function fake({role="admin",profileRole=role,active=true,authError=false,unavailable=[]}={}){
  const calls=[];
  const counts={"inquiry_care_tasks":4,"customer_quotes":2,"cms_posts":1,"staff_profiles":3};
  const client={
    auth:{getUser:async()=>authError?{error:{message:"offline"}}:{data:{user:{id:"test-user",app_metadata:{role}}}}},
    from(table){
      const record={table,filters:[],projection:null};
      calls.push(record);
      const query={
        select(fields,options){record.projection={fields,options};return query;},
        eq(field,value){record.filters.push(["eq",field,value]);return query;},
        in(field,value){record.filters.push(["in",field,value]);return query;},
        lt(field,value){record.filters.push(["lt",field,value]);return query;},
        gte(field,value){record.filters.push(["gte",field,value]);return query;},
        abortSignal(){return query;},
        single:async()=>({data:{role:profileRole,active,full_name:"Người thử"},error:null}),
        then(ok,fail){const res=unavailable.includes(table)?{count:null,error:{message:"RLS failure"}}:{count:counts[table],error:null};return Promise.resolve(res).then(ok,fail);}
      };
      return query;
    }
  };
  return {client,calls};
}
test("Operations page is private, noindex, and included by website and Windows package",()=>{
  const html=fs.readFileSync("operations.html","utf8");
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/id="ops-app" hidden/);
  assert.match(html,/id="ops-refresh"/);
  assert.match(html,/assets\/operations.js/);
  const navigation=fs.readFileSync("assets/admin-workspace.js","utf8");
  assert.match(navigation,/\["operations.html","Trung tâm vận hành","manager"\]/);
  const {pages,trustedPage}=require("../desktop/security.cjs");
  assert.ok(pages.has("operations.html"));
  assert.equal(trustedPage("atelier://app/operations.html"),true);
  const publicBuilder=fs.readFileSync("scripts/build-pages.cjs","utf8");
  assert.match(publicBuilder,/"operations.html"/);
  const desktopBuilder=fs.readFileSync("desktop/prepare-ui.cjs","utf8");
  assert.match(desktopBuilder,/"operations.html"/);
});
test("Only active Admin/Manager with matching staff role can access operations",async()=>{
  for(const role of ["admin","manager"]){
    const {client}=fake({role});
    assert.deepEqual(await authorize(client),{id:"test-user",role,name:"Người thử"});
  }
  for(const options of [{role:"employee"},{role:"manager",profileRole:"employee"},{role:"admin",active:false},{role:"manager",authError:true}]){
    const {client}=fake(options);
    assert.equal(await authorize(client),null,JSON.stringify(options));
  }
});
test("Operations only requests RLS-filtered exact counts, with deadline boundaries",async()=>{
  const {client,calls}=fake();
  const when=new Date("2026-11-05T02:00:00.000Z");
  const result=await readCounts(client,"admin",when);
  assert.deepEqual(Object.keys(result),["tasks-overdue","tasks-next","quotes-review","posts-review","staff-active"]);
  assert.ok(Object.values(result).every(x=>x.ok&&Number.isSafeInteger(x.count)));
  const requested=calls.filter(x=>x.projection);
  assert.equal(requested.length,5);
  assert.ok(requested.every(x=>x.projection.fields==="id"&&x.projection.options?.count==="exact"&&x.projection.options?.head===true));
  const tasks=requested.filter(x=>x.table==="inquiry_care_tasks");
  assert.equal(tasks.length,2);
  assert.ok(tasks.every(t=>t.filters.some(f=>f[0]==="in"&&f[1]==="status"&&f[2].join(",")==="todo,in_progress")));
  assert.ok(tasks[0].filters.some(f=>f[0]==="lt"&&f[1]==="due_at"&&f[2]===when.toISOString()));
  assert.ok(tasks[1].filters.some(f=>f[0]==="gte"&&f[2]===when.toISOString()));
  assert.ok(tasks[1].filters.some(f=>f[0]==="lt"&&f[2]===new Date(when.getTime()+7*86400000).toISOString()));
  assert.ok(requested.some(x=>x.table==="customer_quotes"&&x.filters.some(f=>f[1]==="status"&&f[2]==="submitted")));
  assert.ok(requested.some(x=>x.table==="cms_posts"&&x.filters.some(f=>f[1]==="status"&&f[2]==="review")));
});
test("Manager cannot request staff count, employee cannot request any counts, errors are not treated as zero",async()=>{
  const manager=fake({role:"manager",unavailable:["cms_posts"]});
  const result=await readCounts(manager.client,"manager");
  assert.equal(Object.hasOwn(result,"staff-active"),false);
  assert.equal(manager.calls.some(x=>x.table==="staff_profiles"),false);
  assert.deepEqual(result["posts-review"],{ok:false,count:null});
  assert.deepEqual(result["quotes-review"],{ok:true,count:2});
  const employee=fake({role:"employee"});
  await assert.rejects(()=>readCounts(employee.client,"employee"),/FORBIDDEN_OPERATIONS_VIEW/);
  assert.equal(employee.calls.length,0);
});
test("Operations page has no mutations or privileged browser keys",()=>{
  const script=fs.readFileSync("assets/operations.js","utf8");
  assert.doesNotMatch(script,/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
  assert.doesNotMatch(script,/service_role|supabaseSecret|SUPABASE_SERVICE_ROLE/i);
  assert.match(script,/event==="SIGNED_OUT"/);
});
test("Snapshot validates account identity and current authorization again after counts",async()=>{
  const good=fake();assert.equal((await loadSnapshot(good.client)).account.id,"test-user");
  for(const change of ["account","role"]){
    const f=fake();let checks=0;const original=f.client.auth.getUser;
    f.client.auth.getUser=async()=>{const r=await original();if(++checks===2){if(change==="account")r.data.user.id="different-user";else r.data.user.app_metadata.role="employee";}return r;};
    await assert.rejects(()=>loadSnapshot(f.client),/AUTHORIZATION_CHANGED/);assert.equal(checks,2);
  }
});
test("Snapshot times out stuck Auth and cancels without publishing or requesting counts",async()=>{
  const f=fake();f.client.auth.getUser=()=>new Promise(()=>{});
  await assert.rejects(()=>loadSnapshot(f.client,{timeoutMs:15}),/SNAPSHOT_TIMEOUT/);assert.equal(f.calls.length,0);
  const controller=new AbortController();controller.abort();const g=fake();
  await assert.rejects(()=>loadSnapshot(g.client,{signal:controller.signal}),/SNAPSHOT_CANCELLED/);assert.equal(g.calls.length,0);
});
