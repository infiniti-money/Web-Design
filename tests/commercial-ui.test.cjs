const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const html=fs.readFileSync("commercial.html","utf8");
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(m=>!/\bsrc\s*=/.test(m[1]) && m[2].trim());
assert.equal(scripts.length,1,"Expected one executable commercial page script");
const source=scripts[0][2];

class FakeElement {
  constructor(tag="div"){this.tag=tag;this.hidden=false;this.value="";this.children=[];this._text="";this.onclick=null;this.onchange=null;}
  set textContent(v){this._text=String(v);this.children=[];}
  get textContent(){return this._text;}
  append(...nodes){for(const n of nodes){this.children.push(n);if(this.tag==="select"&&this.children.length===1)this.value=n.value||"";}}
  replaceChildren(...nodes){this.children=[...nodes];if(this.tag==="select")this.value=nodes[0]?.value||"";}
}
async function start(role="admin",opts={}){
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,new FakeElement(["quote-inquiry","contract-inquiry","contract-quote"].includes(id)?"select":id));return elements.get(id);};
 get("app").hidden=true;
 const calls=[];
 let reads=0;
 const rows={
   inquiries:[{id:"client-a",full_name:"Khách A"},{id:"client-b",full_name:"Khách B"}],
   customer_quotes:[{id:"q1",title:"Báo giá mẫu",status:"accepted",inquiry_id:"client-b",approved_version_id:"v-approved"}],
   customer_contracts:[],
   commercial_audit:[],
   customer_quote_versions:[{quote_id:"q1",version_no:1,total_amount:100000}],
   staff_profiles:[{user_id:"u1",full_name:"Người kiểm thử"}]
 };
 const db={
   auth:{getUser:async()=>{if(opts.failAuth)throw Error("offline");return{data:{user:role?{id:"u1",app_metadata:{role}}:null},error:null};}},
   from(table){
     let filters={};
     const query={
       select(){return query;},
       eq(field,value){filters[field]=value;return query;},
       order(){return query;},
       async single(){
         if(table==="staff_profiles")return{data:{role:opts.profileRole||role,active:opts.inactive?false:true},error:opts.profileError?{message:"forbidden"}:null};
         if(table==="customer_quotes")return{data:rows.customer_quotes.find(q=>q.id===filters.id),error:null};
         return{data:null,error:null};
       },
       async limit(){
         reads++;
         if(opts.throwRead && table==="customer_quotes")throw Error("connection lost");
         if(opts.failRead && table==="customer_quotes")return{data:null,error:{message:"network"}};
         return{data:rows[table],error:null};
       }
     };
     return query;
   },
   async rpc(name,args){calls.push({name,args});return opts.rpcError?{error:{message:"Permission denied"}}:{data:"created",error:null};}
 };
 const document={getElementById:get,createElement:tag=>new FakeElement(tag)};
 const context={window:{ATELIER_CONFIG:{supabaseUrl:"https://example.supabase.co",supabasePublishableKey:"sb_publishable_test"},supabase:{createClient:()=>db}},document,confirm:()=>true,prompt:()=>null};
 await vm.runInNewContext(source,context,{filename:"commercial.html"});
 return{get,calls,rows,db,reads:()=>reads};
}
test("Commercial UI refuses unprivileged, inactive and unsigned users",async()=>{
 for(const [role,opts] of [["employee",{}],["admin",{inactive:true}],["manager",{profileRole:"employee"}],[null,{}]]){
   const s=await start(role,opts);
   assert.equal(s.get("app").hidden,true);
   assert.equal(s.get("create-quote").onclick,null);
   assert.equal(s.calls.length,0);
 }
});
test("Commercial UI handles authentication outages without uncaught errors",async()=>{
 const s=await start("admin",{failAuth:true});
 assert.equal(s.get("app").hidden,true);
 assert.match(s.get("status").textContent,/Kết nối xác thực thất bại/);
});
test("Manager can create a draft, retains selected customer after refresh",async()=>{
 const s=await start("manager");
 assert.equal(s.get("app").hidden,false);
 s.get("quote-inquiry").value="client-b";
 await s.get("create-quote").onclick();
 assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].args.p_action,"create");
 assert.equal(s.calls[0].args.p_inquiry,"client-b");
 assert.equal(s.get("quote-inquiry").value,"client-b");
 assert.match(s.get("status").textContent,/Đã lưu thao tác/);
});
test("Commercial UI rejects duplicate rapid submissions",async()=>{
 const s=await start("admin");
 s.get("create-quote").value="Báo giá mẫu";
 const button=s.get("create-quote");
 await Promise.all([button.onclick(),button.onclick()]);
 assert.equal(s.calls.length,1);
});
test("Contract creation passes exact approved version, not newest listing",async()=>{
 const s=await start("admin");
 s.get("contract-inquiry").value="client-b";
 s.get("contract-inquiry").onchange();
 assert.equal(s.get("contract-quote").value,"q1");
 s.get("contract-number").value="HD-01";
 await s.get("create-contract").onclick();
 assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].args.p_kind,"contract");
 assert.equal(s.calls[0].args.p_content.quote_id,"q1");
 assert.equal(s.calls[0].args.p_content.quote_version_id,"v-approved");
});
test("After data refresh failure, a successful RPC is not falsely reported as fully refreshed",async()=>{
 const s=await start("admin",{failRead:true});
 await s.get("create-quote").onclick();
 assert.equal(s.calls.length,1);
 assert.match(s.get("status").textContent,/chưa tải lại được dữ liệu/);
});

test("Network exceptions show a recoverable Vietnamese error instead of an unhandled rejection",async()=>{
 const s=await start("admin",{throwRead:true});
 assert.equal(s.get("app").hidden,false);
 assert.match(s.get("status").textContent,/Không tải được dữ liệu/);
 assert.equal(s.calls.length,0);
});
test("Commercial form uses responsive accessible labels and displays helpful empty-state guidance",async()=>{
 assert.match(html,/class="page-kicker"/);
 assert.match(html,/@media\(max-width:760px\)/);
 assert.match(html,/input:focus-visible/);
 assert.match(html,/Chưa có báo giá\. Hãy tạo báo giá nháp/);
 assert.match(html,/Chưa có hợp đồng\. Cần báo giá/);
});
