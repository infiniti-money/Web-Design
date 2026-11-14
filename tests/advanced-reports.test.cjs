"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const report=require("../assets/reports-advanced.js");
const html=fs.readFileSync("reports-advanced.html","utf8");

function fake({role="admin",profileRole=role,active=true,rows=[
  {id:"t1",title:"Lắp đặt đèn",status:"todo",created_at:new Date().toISOString(),due_at:"2020-01-01T00:00:00Z"},
  {id:"t2",title:"Thi công phòng khách",status:"completed",completed_at:"2026-11-10T00:00:00Z",created_at:new Date().toISOString()}
],failRead=false}={}){
  const state={role,profileRole,active,rows,failRead,userId:"u1",calls:[],afterRead:null};
  const client={
    auth:{
      async getUser(){return {data:{user:state.role?{id:state.userId,app_metadata:{role:state.role}}:null}};},
      onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}
    },
    from(table){
      state.calls.push(table);
      if(table==="staff_profiles")return {
        select(){return this;},
        eq(){return this;},
        async single(){return {data:{role:state.profileRole,active:state.active}};}
      };
      assert.equal(table,"inquiry_care_tasks");
      const query={
        select(){return query;},
        gte(){return query;},
        order(){return query;},
        abortSignal(signal){state.signal=signal;return query;},
        async limit(limit){
          assert.equal(limit,500);
          if(state.afterRead)await state.afterRead();
          if(state.failRead)return {data:null,error:{message:"Denied"}};
          return {data:state.rows,error:null};
        }
      };
      return query;
    }
  };
  return {client,state};
}

test("Only active Admin/Manager with matching app_metadata may load reports",async()=>{
  for(const role of ["admin","manager"]){
    const f=fake({role});
    const r=await report.loadSnapshot(f.client);
    assert.equal(r.account.role,role);assert.equal(r.rows.length,2);
    assert.equal(f.state.calls.filter(x=>x==="staff_profiles").length,2,"verify role both before and after query");
  }
  for(const opts of [{role:"employee"},{role:"admin",active:false},
    {role:"manager",profileRole:"employee"},{role:null}]){
    const f=fake(opts);
    await assert.rejects(()=>report.loadSnapshot(f.client),/REPORT_FORBIDDEN/);
    assert.equal(f.state.calls.includes("inquiry_care_tasks"),false,"no business reads on invalid role");
  }
});

test("Stale results are refused after profile change or token role change",async()=>{
  for(const changed of ["profileRole","role","userId"]){
    const f=fake({role:"admin"});
    f.state.afterRead=async()=>{f.state[changed]=changed==="userId"?"other":changed==="role"?"employee":"manager";};
    await assert.rejects(()=>report.loadSnapshot(f.client),/REPORT_(FORBIDDEN|AUTH_CHANGED)/);
  }
});

test("Timeout, cancellation and RLS failures cannot publish a snapshot",async()=>{
  const failed=fake({failRead:true});
  await assert.rejects(()=>report.loadSnapshot(failed.client),/REPORT_READ_FAILED/);
  const stuck=fake();
  stuck.state.afterRead=()=>new Promise(()=>{});
  await assert.rejects(()=>report.loadSnapshot(stuck.client,{timeoutMs:12}),/REPORT_TIMEOUT/);
  assert.equal(stuck.state.signal.aborted,true);
  const f=fake();
  const controller=new AbortController();controller.abort();
  await assert.rejects(()=>report.loadSnapshot(f.client,{signal:controller.signal}),/REPORT_CANCELLED/);
  assert.equal(f.state.calls.length,0);
});

test("Filtering is case-, accent- and status-insensitive and summary is correct",()=>{
  const rows=[
    {title:"Thi công NỘI THẤT",status:"todo",due_at:"2020-01-01"},
    {title:"Lắp đặt đèn",status:"in_progress",due_at:"2099-01-01"},
    {title:"Đã bàn giao",status:"completed",completed_at:"2026-11-12"}
  ];
  assert.equal(report.filterRows(rows,{search:"noi that"}).length,1);
  assert.equal(report.filterRows(rows,{search:"lap dat"}).length,1);
  assert.equal(report.filterRows(rows,{status:"late",now:Date.now()}).length,1);
  assert.equal(report.filterRows(rows,{status:"active",now:Date.now()}).length,1);
  assert.deepEqual(report.summary(rows),{total:3,completed:1,late:1,active:1});
});

test("CSV protects Excel formula interpretation, quotes, tabs, CRLF and Unicode",()=>{
  const rows=[
    {title:"=HYPERLINK(\"evil\")",status:"todo",created_at:"2026-11-01",due_at:""},
    {title:" \t+cmd|'/c calc",status:"todo",created_at:"2026-11-01",due_at:""},
    {title:"Dòng \"B\"\nđã duyệt",status:"completed",created_at:"2026-11-01",due_at:""}
  ];
  const csv=report.serializeCsv(rows);
  assert.equal(csv[0],"\ufeff");assert.match(csv,/\"'=HYPERLINK\(\"\"evil\"\"\)\"/);
  assert.match(csv,/\"' \t\+cmd/);assert.match(csv,/Dòng \"\"B\"\"\nđã duyệt/);
  assert.ok(csv.includes("Tên công việc"));assert.doesNotMatch(csv,/\bBearer\b/);
});

test("Web/Windows advanced report is private, navigation-gated and RLS-only",()=>{
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/id="report" hidden/);
  for(const id of ["report-search","report-status","period","report-refresh","export"])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/assets\/reports-advanced\.js/);
  assert.match(fs.readFileSync("desktop/prepare-ui.cjs","utf8"),/reports-advanced\.html/);
  assert.match(fs.readFileSync("assets/admin-workspace.js","utf8"),/reports-advanced\.html/);
  const source=fs.readFileSync("assets/reports-advanced.js","utf8");
  assert.doesNotMatch(source,/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
  assert.doesNotMatch(source,/service_role|SUPABASE_SERVICE_ROLE|localStorage\.setItem/);
  for(const pattern of [/SIGNED_OUT/,/TOKEN_REFRESHED/,/REPORT_TIMEOUT/,/aria-busy/,/visibilitychange/,/REPORT_FORBIDDEN/])
    assert.match(source,pattern);
});