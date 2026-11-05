/* Internal delivery coordination: browser uses publishable Supabase key, RLS owns access. */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root.document?.getElementById("delivery-app"))api.mount(root);
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const stages={planning:"Lập kế hoạch",design:"Thiết kế",procurement:"Chuẩn bị vật tư",construction:"Thi công",handover:"Nghiệm thu",done:"Hoàn tất",paused:"Tạm dừng"};
  const active=new Set(["planning","design","procurement","construction","handover"]);
  const normalized=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().trim();
  function summarize(rows,now=Date.now()){
    let progress=0,overdue=0,week=0;
    for(const row of rows){
      if(!active.has(row.stage))continue;
      if(row.stage!=="planning")progress++;
      const due=Date.parse(row.due_at);
      if(Number.isFinite(due)&&due<now)overdue++;
      else if(Number.isFinite(due)&&due>=now&&due<now+7*86400000)week++;
    }
    return {total:rows.length,progress,overdue,week};
  }
  async function authorize(db){
    try{
      const {data:auth,error}=await db.auth.getUser();
      const user=auth?.user,role=user?.app_metadata?.role;
      if(error||!user?.id||!["admin","manager"].includes(role))return null;
      const {data:profile,error:profileError}=await db.from("staff_profiles").select("role,active").eq("user_id",user.id).single();
      return profileError||!profile?.active||profile.role!==role?null:{user,role};
    }catch{return null;}
  }
  function mount(win){
    const d=win.document,$=id=>d.getElementById(id),cfg=win.ATELIER_CONFIG;
    function notice(msg,error=false){
      $("delivery-status").textContent=msg;
      $("delivery-status").className="delivery-status"+(error?" error":"");
    }
    if(!cfg?.supabaseUrl||!cfg?.supabasePublishableKey||!win.supabase?.createClient){
      notice("Thiếu cấu hình xác thực. Không thể tải dữ liệu điều phối.",true);return;
    }
    const db=win.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,win.ATELIER_CLIENT_OPTIONS||{});
    let account=null,rows=[],customers=[],staff=[],portfolio=[],catalog=[],tasks=[],editing=null;
    let dirty=false,busy=false,loadIndex=0,linksIndex=0,linkedCatalog=[],linkedTasks=[];
    const opFields="id,inquiry_id,portfolio_project_id,title,stage,owner_user_id,due_at,details,version,created_by,created_at,updated_at";
    const asDate=value=>value?new Date(value).toLocaleString("vi-VN"):"Chưa có hạn";
    const option=(value,label)=>{const el=d.createElement("option");el.value=value;el.textContent=label;return el;};
    function setOptions(id,items,placeholder,value,makeLabel){
      const el=$(id);el.replaceChildren(option("",placeholder));
      for(const item of items)el.append(option(item.id,makeLabel(item)));
      el.value=value||"";
    }
    function askLeave(){return !dirty||win.confirm("Hồ sơ có thay đổi chưa lưu. Bỏ các thay đổi này?");}
    function selectCustomer(){return customers.find(x=>x.id===$( "delivery-inquiry").value);}
    function fill(record){
      editing=record||null;dirty=false;
      $("delivery-editor-title").textContent=record?"Cập nhật công trình":"Lập hồ sơ điều phối";
      $("delivery-title").value=record?.title||"";
      $("delivery-stage").value=record?.stage||"planning";
      $("delivery-details").value=record?.details||"";
      $("delivery-due").value=record?.due_at?new Date(new Date(record.due_at).getTime()-new Date(record.due_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
      $("delivery-inquiry").value=record?.inquiry_id||"";
      $("delivery-inquiry").disabled=!!record;
      $("delivery-owner").value=record?.owner_user_id||"";
      $("delivery-portfolio").value=record?.portfolio_project_id||"";
      $("delivery-links").hidden=!record;
      $("delivery-catalog-list").replaceChildren();
      $("delivery-task-list").replaceChildren();
      document.querySelectorAll(".delivery-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.id===record?.id));
      if(record)loadLinks(record);else ++linksIndex;
      renderTaskChoices();
    }
    function reset(){if(busy||!askLeave())return;fill(null);notice("Đã mở hồ sơ mới. Chưa ghi dữ liệu.");}
    function renderMetrics(){
      if(rows.length>200){for(const id of ["total","progress","overdue","week"])$("delivery-"+id).textContent="–";return;}
      const data=summarize(rows);
      for(const id of ["total","progress","overdue","week"])$("delivery-"+id).textContent=data[id].toLocaleString("vi-VN");
    }
    function renderList(){
      renderMetrics();
      const target=$("delivery-list");target.replaceChildren();
      const key=normalized($("delivery-search").value),stage=$("delivery-filter").value;
      let view=rows.filter(item=>(stage==="all"||item.stage===stage)&&normalized(item.title).includes(key));
      view=[...view].sort((a,b)=>(Date.parse(a.due_at)||Number.MAX_SAFE_INTEGER)-(Date.parse(b.due_at)||Number.MAX_SAFE_INTEGER));
      for(const row of view){
        const button=d.createElement("button");button.type="button";button.className="delivery-item"+(row.id===editing?.id?" active":"");button.dataset.id=row.id;
        const h=d.createElement("strong");h.textContent=row.title;
        const sub=d.createElement("small");sub.textContent=stages[row.stage]+" · "+asDate(row.due_at);
        button.append(h,sub);button.onclick=()=>{if(!busy&&askLeave())fill(row);};target.append(button);
      }
      if(!view.length){const el=d.createElement("p");el.className="delivery-muted";el.textContent="Chưa có công trình phù hợp trong phạm vi tải.";target.append(el);}
    }
    function renderTaskChoices(){
      const matching=tasks.filter(t=>t.inquiry_id===$("delivery-inquiry").value);
      setOptions("delivery-task",matching,"Chọn công việc CRM","",item=>item.title+" · "+(item.assignee_name||"Chưa phân công"));
    }
    function renderLinked(){
      const mats=$("delivery-catalog-list");mats.replaceChildren();
      for(const link of linkedCatalog){
        const item=catalog.find(x=>x.id===link.catalog_item_id);
        const box=d.createElement("div");box.className="delivery-linked-row";
        const name=d.createElement("span");name.textContent=(item?.name||"Vật tư chưa công khai")+" · "+link.quantity;
        const del=d.createElement("button");del.type="button";del.textContent="Gỡ";del.onclick=()=>unlink("delivery_catalog_links","catalog_item_id",link.catalog_item_id);
        box.append(name,del);mats.append(box);
      }
      if(!linkedCatalog.length){const empty=d.createElement("p");empty.className="delivery-muted";empty.textContent="Chưa có vật tư liên kết.";mats.append(empty);}
      const actions=$("delivery-task-list");actions.replaceChildren();
      for(const link of linkedTasks){
        const task=tasks.find(x=>x.id===link.task_id),line=d.createElement("div");line.className="delivery-linked-row";
        const name=d.createElement("span");name.textContent=task?.title||"Công việc (mở tại CRM)";
        const del=d.createElement("button");del.type="button";del.textContent="Gỡ";del.onclick=()=>unlink("delivery_task_links","task_id",link.task_id);
        line.append(name,del);actions.append(line);
      }
      if(!linkedTasks.length){const empty=d.createElement("p");empty.className="delivery-muted";empty.textContent="Chưa có công việc liên kết.";actions.append(empty);}
    }
    async function loadLinks(record){
      const seq=++linksIndex;
      try{
        const [m,t]=await Promise.all([
          db.from("delivery_catalog_links").select("workspace_id,catalog_item_id,quantity").eq("workspace_id",record.id),
          db.from("delivery_task_links").select("workspace_id,task_id").eq("workspace_id",record.id)
        ]);
        if(seq!==linksIndex||editing?.id!==record.id)return;
        if(m.error||t.error)throw m.error||t.error;
        linkedCatalog=m.data||[];linkedTasks=t.data||[];renderLinked();
      }catch{if(seq===linksIndex)notice("Không tải được vật tư/công việc liên kết. Kiểm tra kết nối và quyền.",true);}
    }
    async function load(){
      const seq=++loadIndex;$("delivery-reload").disabled=true;
      notice("Đang tải dữ liệu theo quyền Supabase RLS…");
      try{
        const results=await Promise.all([
          db.from("delivery_workspaces").select(opFields,{count:"exact"}).order("created_at",{ascending:false}).range(0,199),
          db.from("inquiries").select("id,full_name").order("created_at",{ascending:false}).limit(100),
          db.from("staff_profiles").select("user_id,full_name,role,active").eq("active",true).limit(100),
          db.from("projects").select("id,title").order("created_at",{ascending:false}).limit(200),
          db.from("catalog_items").select("id,name,published").eq("published",true).limit(200),
          db.from("inquiry_care_tasks").select("id,inquiry_id,title,assignee_name").limit(200)
        ]);
        if(seq!==loadIndex)return;
        const err=results.find(x=>x.error);if(err)throw err.error;
        [rows,customers,staff,portfolio,catalog,tasks]=results.map(x=>x.data||[]);
        const total=results[0].count;
        if(!Number.isSafeInteger(total))throw new Error("Missing exact count");
        setOptions("delivery-inquiry",customers,"Chọn yêu cầu tư vấn","",item=>item.full_name);
        setOptions("delivery-owner",staff.map(x=>({...x,id:x.user_id})),"Chưa phân công","",item=>item.full_name+" ("+item.role+")");
        setOptions("delivery-portfolio",portfolio,"Không liên kết","",item=>item.title);
        setOptions("delivery-catalog",catalog,"Chọn vật tư","",item=>item.name);
        $("delivery-scope").textContent=total>rows.length?
          "Có "+total+" hồ sơ trong phạm vi quyền; chỉ tải "+rows.length+" hồ sơ. Chưa hiển thị tổng KPI để tránh thống kê thiếu.":
          "Đang hiển thị "+rows.length+" hồ sơ theo quyền RLS. Dữ liệu kế hoạch, không đồng nghĩa công trình đã công khai.";
        $("delivery-app").hidden=false;
        fill(null);renderList();
        if(total>rows.length){for(const id of ["total","progress","overdue","week"])$("delivery-"+id).textContent="–";}
        notice("Đã tải dữ liệu trong phạm vi quyền. Hạn công trình được tính theo giờ thiết bị.");
      }catch{
        if(seq!==loadIndex)return;
        rows=[];customers=[];staff=[];portfolio=[];catalog=[];tasks=[];editing=null;
        $("delivery-app").hidden=true;
        notice("Không tải được dữ liệu điều phối. Có thể chưa triển khai schema staging hoặc chưa có quyền. Không có dữ liệu nào được thay đổi.",true);
      }finally{if(seq===loadIndex)$("delivery-reload").disabled=false;}
    }
    function payload(){
      const due=$("delivery-due").value;
      if(due&&!Number.isFinite(Date.parse(due)))throw new Error("Ngày hạn không hợp lệ");
      return {title:$("delivery-title").value.trim(),inquiry_id:$("delivery-inquiry").value,
        portfolio_project_id:$("delivery-portfolio").value||null,stage:$("delivery-stage").value,
        owner_user_id:$("delivery-owner").value||null,due_at:due?new Date(due).toISOString():null,
        details:$("delivery-details").value.trim()};
    }
    async function save(event){
      event.preventDefault();if(busy||!$("delivery-form").reportValidity())return;
      let data;try{data=payload();}catch(e){notice(e.message,true);return;}
      if(!customers.some(x=>x.id===data.inquiry_id)){notice("Chọn hồ sơ tư vấn đã được tải theo quyền.",true);return;}
      if(data.stage==="done"&&!win.confirm("Xác nhận công trình đã hoàn tất và đủ điều kiện nghiệm thu?"))return;
      busy=true;$("delivery-save").disabled=true;
      try{
        const q=editing?
          db.from("delivery_workspaces").update({
            title:data.title,stage:data.stage,owner_user_id:data.owner_user_id,due_at:data.due_at,
            portfolio_project_id:data.portfolio_project_id,details:data.details
          }).eq("id",editing.id).eq("version",editing.version).select(opFields).maybeSingle():
          db.from("delivery_workspaces").insert(data).select(opFields).single();
        const {data:written,error}=await q;
        if(error)throw error;
        if(!written){notice("Hồ sơ đã đổi phiên bản hoặc không có quyền. Tải lại trước khi lưu; biểu mẫu được giữ nguyên.",true);return;}
        dirty=false;notice("Đã xác minh hồ sơ được lưu trên Supabase.");
        await load();
        const refreshed=rows.find(x=>x.id===written.id);
        if(refreshed)fill(refreshed);
      }catch{notice("Không thể lưu hồ sơ. Chưa xác nhận thành công; nội dung đang nhập vẫn được giữ để kiểm tra.",true);}
      finally{busy=false;$("delivery-save").disabled=false;}
    }
    async function link(table,key,id,extra){
      if(busy||!editing||!id)return;
      busy=true;notice("Đang liên kết bản ghi…");
      try{
        const write={workspace_id:editing.id,[key]:id,...extra};
        const {data,error}=await db.from(table).insert(write).select("workspace_id,"+key).single();
        if(error||!data||data[key]!==id)throw error||new Error();
        notice("Đã xác minh liên kết được lưu theo RLS.");
        await loadLinks(editing);
      }catch{notice("Không thể liên kết. Kiểm tra quyền, dữ liệu trùng hoặc không cùng khách hàng.",true);}
      finally{busy=false;}
    }
    async function unlink(table,key,id){
      if(busy||!editing||!win.confirm("Gỡ liên kết này khỏi hồ sơ điều phối? Không xóa bản ghi nguồn."))return;
      busy=true;
      try{
        const {data,error}=await db.from(table).delete().eq("workspace_id",editing.id).eq(key,id)
          .select("workspace_id,"+key).maybeSingle();
        if(error||!data)throw error||new Error();
        notice("Đã gỡ liên kết, bản ghi Catalog/CRM gốc không thay đổi.");
        await loadLinks(editing);
      }catch{notice("Không gỡ được liên kết. Vui lòng kiểm tra quyền và tải lại.",true);}
      finally{busy=false;}
    }
    $("delivery-form").addEventListener("submit",save);
    $("delivery-form").addEventListener("input",()=>dirty=true);
    $("delivery-form").addEventListener("change",()=>{dirty=true;renderTaskChoices();});
    $("delivery-new").onclick=reset;$("delivery-reset").onclick=reset;$("delivery-reload").onclick=()=>{if(!busy&&askLeave())load();};
    $("delivery-search").oninput=renderList;$("delivery-filter").onchange=renderList;
    $("delivery-catalog-add").onclick=()=>{
      const id=$("delivery-catalog").value,quantity=Number($("delivery-quantity").value);
      if(!catalog.some(x=>x.id===id)||!Number.isFinite(quantity)||quantity<=0||quantity>1000000){
        notice("Chọn mục Catalog đã công khai và số lượng hợp lệ.",true);return;
      }
      link("delivery_catalog_links","catalog_item_id",id,{quantity});
    };
    $("delivery-task-add").onclick=()=>{
      const id=$("delivery-task").value;
      if(!tasks.some(t=>t.id===id&&t.inquiry_id===editing?.inquiry_id)){
        notice("Chỉ liên kết công việc thuộc cùng hồ sơ CRM.",true);return;
      }
      link("delivery_task_links","task_id",id);
    };
    win.addEventListener("beforeunload",event=>{if(dirty||busy){event.preventDefault();event.returnValue="";}});
    (async()=>{
      account=await authorize(db);
      if(!account){notice("Không có quyền quản lý điều phối. Cần Admin hoặc Quản lý đang hoạt động.",true);return;}
      await load();
    })();
  }
  return {stages,summarize,authorize,mount};
});
