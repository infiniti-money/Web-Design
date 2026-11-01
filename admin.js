/* ATELIER HOME v1.13.0 Admin.
 * Authentication is Supabase Auth. Authorization is enforced on DB via RLS.
 * No service-role or private credentials are ever used by this browser app. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.ATELIER_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl || "") &&
    /^sb_publishable_[a-zA-Z0-9_-]+$/.test(cfg.supabasePublishableKey || "");
  if (!configured || !window.supabase?.createClient) {
    $("setup-panel").classList.remove("hide");
    if (configured) $("setup-panel").querySelector("p").textContent =
      "Không thể tải thư viện kết nối Supabase. Kiểm tra mạng hoặc thử lại sau.";
    return;
  }
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  const categories = { apartment:"Căn hộ", villa:"Biệt thự", house:"Nhà phố", commercial:"Thương mại" };
  const inquiryStates = { "new":"Mới", "contacted":"Đã liên hệ", "quoted":"Đã báo giá", "closed":"Hoàn thành" };
  const PAGE_SIZE = 25;
  const state = { projects:[], inquiries:[], editingId:null, slugTouched:false, busy:false,
    leadSearch:"", leadStatus:"all", leadService:"all", leadPeriod:"all", leadPage:0, leadTotal:0,
    leadQuerySeq:0, leadStatsSeq:0, leadReminder:"all",activeProfile:null,profileSeq:0,customerTaskSeq:0,taskBoardSeq:0,taskBoardPage:0,prioritySeq:0,taskBoardTotal:0,taskView:"table",reportSeq:0,taskReport:null,editingTask:null,staff:[],currentUser:null,currentRole:null,myTaskSeq:0,taskStatusFilter:"all",taskOwnerFilter:"",taskDueFilter:"all" };

  function message(id, text, error=false) {
    const el = $(id); el.textContent = text;
    el.classList.toggle("error", !!error);
    el.classList.toggle("ok", !error && !!text);
  }
  function el(tag, value, className) {
    const n = document.createElement(tag);
    if (value !== undefined) n.textContent = String(value);
    if (className) n.className = className;
    return n;
  }
  function btn(label, click, className="") {
    const b=el("button",label,"tiny "+className);b.type="button";b.addEventListener("click",click);return b;
  }
  function cell(row,...children) {
    const td=el("td");for(const child of children){td.append(child)}row.append(td);return td;
  }
  function stamp(date) {
    if(!date)return "—";
    const time=new Date(date);
    return Number.isNaN(time.getTime()) ? "—" : time.toLocaleString("vi-VN");
  }
  function retentionUntil(date){
    if(!date)return null;
    const exp=new Date(date);
    if(Number.isNaN(exp.getTime()))return null;
    const originalDay=exp.getUTCDate();
    exp.setUTCDate(1);exp.setUTCMonth(exp.getUTCMonth()+12);
    const lastDay=new Date(Date.UTC(exp.getUTCFullYear(),exp.getUTCMonth()+1,0)).getUTCDate();
    exp.setUTCDate(Math.min(originalDay,lastDay));
    return exp.toISOString();
  }
  function slugify(t) {
    return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")
      .replace(/Đ/g,"d").toLowerCase().replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"").slice(0,100);
  }
  function switchTab(name) {
    for(const kind of ["projects","inquiries","tasks","reports","my-tasks","staff"]) {
      const active = kind === name;
      $("panel-"+kind).classList.toggle("hide", !active);
      $("tab-"+kind).setAttribute("aria-selected", String(active));
    }
    if(name==="tasks")refreshTasksBoard();
    if(name==="reports")loadPerformanceReport();
    if(name==="my-tasks")loadMyTasks();
    if(name==="staff")loadStaff();
  }
  function setBusy(b) {
    state.busy=b;
    for(const id of ["project-save","login-button","reload-projects","reload-inquiries","profile-note-save","profile-reminder-save","profile-reminder-clear"]) $(id).disabled=b;
    $("profile-reminder-done").disabled=b || !state.activeProfile?.follow_up_at;
  }
  function loginVisible() {
    state.activeProfile=null;
    state.currentUser=null;state.currentRole=null;state.staff=[];
    ++state.profileSeq;
    $("lead-profile").classList.add("hide");
    $("profile-note-input").value="";
    $("login-panel").classList.remove("hide");$("dashboard").classList.add("hide");
  }
  async function verify() {
    const {data,error}=await client.auth.getUser();
    const user=data?.user;
    const role=user?.app_metadata?.role;
    if(error || !user?.id || !["admin","manager","employee"].includes(role))return null;
    const {data:profile,error:profileError}=await client.from("staff_profiles")
      .select("role,active,full_name").eq("user_id",user.id).single();
    if(profileError || !profile?.active || profile.role!==role)return null;
    return {user,role,profile};
  }
  async function enterDashboard() {
    const verified=await verify();
    if(!verified) {
      await client.auth.signOut();
      loginVisible();
      message("login-status","Tài khoản chưa được cấp quyền hoặc đã vô hiệu hóa. Liên hệ quản trị viên.",true);
      return;
    }
    const {user,role,profile}=verified;
    state.currentUser=user;state.currentRole=role;
    $("login-panel").classList.add("hide");
    $("dashboard").classList.remove("hide");
    $("signed-in-email").textContent=user.email || "Tài khoản";
    $("signed-in-role").textContent=profile.full_name+" · "+({admin:"Admin",manager:"Quản lý",employee:"Nhân viên"}[role]);
    for(const tab of ["projects","inquiries","tasks","reports","my-tasks","staff"]){
      const allowed=role==="admin" || (role==="manager" && ["tasks","reports","my-tasks"].includes(tab))
        || (role==="employee" && tab==="my-tasks");
      $("tab-"+tab).classList.toggle("hide",!allowed);
    }
    $("admin-overview-metrics").classList.toggle("hide",role!=="admin");
    $("admin-priority-hub").classList.toggle("hide",role!=="admin");
    if(role==="admin"){switchTab("projects");await Promise.all([loadAll(),loadStaff()]);}
    else if(role==="manager"){switchTab("tasks");await Promise.all([loadStaff(),loadMyTasks()]);}
    else switchTab("my-tasks");
  }
  async function loadStaff() {
    if(state.currentRole==="employee")return;
    const {data,error}=await client.from("staff_profiles")
      .select("user_id,email,full_name,role,active").order("full_name",{ascending:true}).range(0,499);
    if(error){message("staff-status","Không đọc được danh sách: "+error.message,true);return;}
    state.staff=data||[];
    const select=$("care-task-account"),previous=select.value;
    select.replaceChildren();
    const prompt=el("option","Chọn tài khoản đang hoạt động");prompt.value="";select.append(prompt);
    for(const user of state.staff.filter(u=>u.active)){
      const opt=el("option",user.full_name+" · "+user.email);opt.value=user.user_id;select.append(opt);
    }
    select.value=state.staff.some(u=>u.user_id===previous&&u.active)?previous:"";
    if(state.currentRole==="admin")renderStaffTable();
  }
  function renderStaffTable(){
    const tbody=$("staff-table");tbody.replaceChildren();
    for(const person of state.staff){
      const tr=el("tr");
      cell(tr,el("strong",person.full_name));
      cell(tr,el("span",person.email));
      const choice=el("select");choice.setAttribute("aria-label","Vai trò: "+person.full_name);
      for(const [id,label] of [["employee","Nhân viên"],["manager","Quản lý"],["admin","Admin"]]){
        const o=el("option",label);o.value=id;choice.append(o);
      }
      choice.value=person.role;
      const active=el("select");active.setAttribute("aria-label","Trạng thái: "+person.full_name);
      for(const [id,label] of [["active","Hoạt động"],["disabled","Vô hiệu hóa"]]){
        const o=el("option",label);o.value=id;active.append(o);
      }
      active.value=person.active?"active":"disabled";
      cell(tr,choice);cell(tr,active);
      const action=btn("Cập nhật",()=>saveStaffRole(person,choice.value,active.value==="active"));
      if(person.user_id===state.currentUser?.id || person.role==="admin"){
        action.disabled=true;action.title="Không thể vô hiệu hóa/hạ quyền Admin tại đây";
      }
      cell(tr,action);tbody.append(tr);
    }
    if(!state.staff.length){const tr=el("tr"),td=el("td","Chưa có nhân viên.","empty");td.colSpan=5;tr.append(td);tbody.append(tr);}
  }
  async function callStaffApi(payload){
    const {data:session,error}=await client.auth.getSession();
    if(error||!session.session?.access_token)throw new Error("Phiên đăng nhập hết hạn.");
    const response=await fetch(cfg.supabaseUrl.replace(/\/$/,"")+"/functions/v1/staff-management",{
      method:"POST",headers:{"Content-Type":"application/json",
        "apikey":cfg.supabasePublishableKey,
        "Authorization":"Bearer "+session.session.access_token},
      body:JSON.stringify(payload)
    });
    const result=await response.json().catch(()=>({error:"SERVER_ERROR"}));
    if(!response.ok||!result.ok)throw new Error(result.error||"SERVER_ERROR");
    return result;
  }
  async function loadPendingRegistrations(){
    if(state.currentRole!=="admin")return;
    message("pending-status","Đang tải tài khoản chờ duyệt...");
    const table=$("pending-table");table.replaceChildren();
    try{
      const result=await callStaffApi({action:"pending"});
      for(const person of result.accounts){
        const tr=el("tr");
        for(const value of [person.full_name,person.email,person.date_of_birth,person.phone])cell(tr,el("span",value||"—"));
        const td=el("td");
        for(const [label,decision] of [["Duyệt","approve"],["Từ chối","reject"]]){
          td.append(btn(label,async()=>{
            if(!confirm((decision==="approve"?"Cấp quyền Nhân viên":"Từ chối đăng ký")+" cho "+person.email+"?"))return;
            try{
              await callStaffApi({action:"review_registration",user_id:person.user_id,decision});
              await loadPendingRegistrations();await loadStaff();
            }catch(err){message("pending-status","Không thể xử lý: "+err.message,true)}
          }));
        }
        tr.append(td);table.append(tr);
      }
      message("pending-status",result.accounts.length+" tài khoản chờ duyệt.");
    }catch(err){message("pending-status","Lỗi danh sách chờ duyệt: "+err.message,true)}
  }
  $("pending-refresh").addEventListener("click",loadPendingRegistrations);
  async function inviteStaff(event){
    event.preventDefault();
    if(state.currentRole!=="admin")return;
    const email=$("staff-email").value.trim(),full_name=$("staff-name").value.trim(),role=$("staff-role").value;
    if(full_name.length<2 || !email.includes("@")){message("staff-status","Thông tin chưa hợp lệ.",true);return;}
    $("staff-invite-submit").disabled=true;
    try{
      await callStaffApi({action:"invite",email,full_name,role});
      $("staff-invite-form").reset();
      await loadStaff();
      message("staff-status","Đã gửi lời mời tài khoản. Người nhận cần mở email xác thực và đặt mật khẩu.");
    }catch(error){message("staff-status","Không mời được tài khoản: "+error.message,true)}
    finally{$("staff-invite-submit").disabled=false}
  }
  async function saveStaffRole(person,role,active){
    if(state.currentRole!=="admin")return;
    if(!confirm("Cập nhật quyền truy cập của "+person.full_name+"?"))return;
    try{
      await callStaffApi({action:"update",user_id:person.user_id,role,active});
      await loadStaff();
      message("staff-status","Đã cập nhật quyền. Người dùng cần đăng nhập lại để làm mới vai trò.");
    }catch(error){message("staff-status","Không cập nhật được: "+error.message,true)}
  }
  async function loadProjects() {
    const {data,error}=await client.from("projects")
      .select("id,slug,title,category,area,style,image_url,summary,published,sort_order,created_at")
      .order("sort_order",{ascending:true}).range(0,199);
    if(error) {message("dash-status","Không đọc được dự án: "+(error.message||"Lỗi truy vấn"),true);return;}
    state.projects=data||[];renderProjects();renderMetrics();
  }
  // All customer data is fetched only after verifying Admin authentication.
  // RLS is the final authorization boundary for every query.
  const inquiryColumns="id,full_name,phone,service,space,details,status,created_at,consented_at,privacy_policy_version,last_contacted_at,legal_hold_until,follow_up_at";
  const vietnamDayStartUTC=() => {
    const date = new Date(Date.now() + 7 * 3600000).toISOString().slice(0,10);
    return new Date(Date.parse(date+"T00:00:00Z") - 7 * 3600000).toISOString();
  };
  function applyInquiryQuery(query) {
    if(state.leadStatus!=="all") query=query.eq("status",state.leadStatus);
    if(state.leadService!=="all") query=query.eq("service",state.leadService);
    if(state.leadReminder==="due")query=query.lte("follow_up_at",new Date().toISOString());
    if(state.leadReminder==="upcoming"){
      query=query.gt("follow_up_at",new Date().toISOString())
        .lte("follow_up_at",new Date(Date.now()+7*86400000).toISOString());
    }
    if(state.leadPeriod==="today") query=query.gte("created_at",vietnamDayStartUTC());
    else if(["7","30","90"].includes(state.leadPeriod))
      query=query.gte("created_at",new Date(Date.now()-Number(state.leadPeriod)*86400000).toISOString());
    // Escape PostgREST filter grammar: user text cannot add extra OR clauses.
    const term=state.leadSearch.slice(0,90).replace(/[^\p{L}\p{N}\s-]/gu,"").trim();
    if(term) query=query.or(["full_name","phone","details","service","space"]
      .map(column=>column+".ilike.%"+term+"%").join(","));
    return query;
  }
  async function loadInquiries() {
    const seq=++state.leadQuerySeq;
    $("crm-loading").classList.remove("hide");
    $("lead-prev-page").disabled=true;
    $("lead-next-page").disabled=true;
    const from=state.leadPage*PAGE_SIZE;
    try {
      let query=client.from("inquiries").select(inquiryColumns,{count:"exact"})
        .order("created_at",{ascending:false}).order("id",{ascending:false});
      query=applyInquiryQuery(query);
      const {data,error,count}=await query.range(from,from+PAGE_SIZE-1);
      if(seq!==state.leadQuerySeq)return;
      if(error)throw error;
      state.leadTotal=typeof count==="number" ? count : (data||[]).length;
      if(!data?.length && state.leadPage>0 && state.leadTotal>0){
        state.leadPage=Math.ceil(state.leadTotal/PAGE_SIZE)-1;
        return loadInquiries();
      }
      state.inquiries=data||[];
      renderInquiries();
    } catch(error) {
      if(seq===state.leadQuerySeq) {
        message("dash-status","Không đọc được yêu cầu tư vấn: "+(error.message||"Lỗi truy vấn"),true);
        $("lead-match-count").textContent="Không tải được hồ sơ. Nhấn Làm mới để thử lại.";
      }
    } finally {
      if(seq===state.leadQuerySeq)$("crm-loading").classList.add("hide");
    }
  }
  async function loadLeadStats() {
    const seq=++state.leadStatsSeq;
    const head=() => client.from("inquiries").select("id",{count:"exact",head:true});
    const requests=[
      head(),head().gte("created_at",vietnamDayStartUTC()),
      head().eq("status","contacted"),head().eq("status","quoted"),
      head().eq("status","new"),
      head().lte("follow_up_at",new Date().toISOString())
    ];
    const results=await Promise.all(requests);
    if(seq!==state.leadStatsSeq)return;
    if(results.some(x=>x.error)){
      message("dash-status","Không tải được thống kê tư vấn.",true);
      return;
    }
    const [total,today,contacted,quoted,newCount,due]=results.map(x=>Number(x.count)||0);
    $("crm-total").textContent=total;
    $("crm-today").textContent=today;
    $("crm-contacted").textContent=contacted;
    $("crm-quoted").textContent=quoted;
    $("metric-inquiries").textContent=newCount;
    $("crm-due").textContent=due;
  }
  async function refreshInquiries() {
    await Promise.all([loadInquiries(),loadLeadStats(),loadPriorityHub()]);
  }
  // Priority center reads only Admin-RLS-authorized rows and exact server counts.
  // The lists are deliberately capped to five items; KPI totals are not capped.
  async function loadPriorityHub() {
    const seq=++state.prioritySeq;
    message("priority-status","Đang cập nhật lịch ưu tiên...");
    const now=new Date().toISOString();
    const until=new Date(Date.now()+7*86400000).toISOString();
    const taskQuery=()=>client.from("inquiry_care_tasks")
      .select("id,title,assignee_name,due_at,status,inquiries(full_name)",{count:"exact"})
      .neq("status","done");
    const leadQuery=()=>client.from("inquiries")
      .select("id,full_name,follow_up_at",{count:"exact"});
    const specs=[
      {key:"task-overdue",task:true,q:taskQuery().lt("due_at",now).order("due_at",{ascending:true})},
      {key:"task-soon",task:true,q:taskQuery().gte("due_at",now).lte("due_at",until).order("due_at",{ascending:true})},
      {key:"lead-overdue",task:false,q:leadQuery().lte("follow_up_at",now).order("follow_up_at",{ascending:true})},
      {key:"lead-soon",task:false,q:leadQuery().gt("follow_up_at",now).lte("follow_up_at",until).order("follow_up_at",{ascending:true})}
    ];
    const results=await Promise.allSettled(specs.map(x=>x.q.range(0,4)));
    if(seq!==state.prioritySeq)return;
    let failed=0;
    for(let index=0;index<specs.length;index++){
      const spec=specs[index],result=results[index];
      const countEl=$("priority-"+spec.key),list=$("priority-"+spec.key+"-list");
      list.replaceChildren();
      if(result.status!=="fulfilled"||result.value.error){
        countEl.textContent="—";list.append(el("li","Không tải được dữ liệu."));failed++;continue;
      }
      const {data,count}=result.value;
      countEl.textContent=typeof count==="number"?count:(data||[]).length;
      if(!data?.length){list.append(el("li","Không có mục nào."));continue}
      for(const item of data){
        const li=el("li");
        li.append(el("strong",spec.task?item.title:item.full_name),
          el("small",(spec.task
            ? (item.inquiries?.full_name||"Khách hàng")+" · "+item.assignee_name
            : "Liên hệ khách hàng")+" · "+stamp(spec.task?item.due_at:item.follow_up_at)));
        list.append(li);
      }
    }
    message("priority-status",failed
      ? "Có "+failed+" nhóm ưu tiên không tải được. Nhấn Làm mới ưu tiên để thử lại."
      : "Đã đồng bộ việc cần xử lý từ Supabase.",failed>0);
  }
  function showTaskPriority(filter){
    state.taskDueFilter=filter;
    state.taskStatusFilter="all";
    state.taskOwnerFilter="";
    state.taskBoardPage=0;
    $("tasks-due-filter").value=filter;
    $("tasks-status-filter").value="all";
    $("tasks-owner-filter").value="";
    switchTab("tasks");
    $("panel-tasks").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showLeadPriority(filter){
    state.leadReminder=filter;
    state.leadStatus="all";state.leadService="all";state.leadPeriod="all";state.leadSearch="";
    state.leadPage=0;
    for(const [id,value] of [
      ["lead-filter-reminder",filter],["lead-filter-status","all"],
      ["lead-filter-service","all"],["lead-filter-period","all"],["lead-search",""]
    ])$(id).value=value;
    switchTab("inquiries");
    loadInquiries();
    $("panel-inquiries").scrollIntoView({behavior:"smooth",block:"start"});
  }
  // Supabase RPC performs all aggregation under the current Admin JWT and RLS.
  // No raw customer records leave the database for report calculations.
  function reportDateStart(days) {
    const current=new Date();
    const vietnamToday=new Date(current.getTime()+7*3600000).toISOString().slice(0,10);
    const midnightUtc=Date.parse(vietnamToday+"T00:00:00Z")-7*3600000;
    return new Date(midnightUtc-(days-1)*86400000).toISOString();
  }
  function reportNumber(value) {
    const n=Number(value);
    return Number.isFinite(n)?n:0;
  }
  function reportPeriodLabel(period,bucket){
    if(typeof period!=="string"||!/^\d{4}-\d\d-\d\d$/.test(period))return "—";
    const [y,m,d]=period.split("-");
    return bucket==="month"?m+"/"+y:d+"/"+m;
  }
  function renderReportChart(rows,bucket){
    const chart=$("report-chart");
    chart.replaceChildren();
    const points=Array.isArray(rows)?rows:[];
    if(!points.length){
      chart.append(el("p","Chưa có kỳ thống kê.","muted"));return;
    }
    const max=Math.max(1,...points.map(p=>reportNumber(p.total)));
    const summary=[];
    for(const item of points){
      const total=reportNumber(item.total),done=reportNumber(item.done);
      const label=reportPeriodLabel(item.period,bucket);
      summary.push(label+": "+total+" việc, "+done+" hoàn thành");
      const column=el("div",undefined,"report-bar-group");
      column.append(el("span",total+" / "+done,"report-bar-count"));
      const track=el("div",undefined,"report-bar-track");
      const outer=el("div",undefined,"report-bar-total");
      outer.style.height=total?Math.max(4,Math.round(150*total/max))+"px":"0px";
      const inner=el("div",undefined,"report-bar-completed");
      inner.style.height=total?Math.min(100,Math.round(100*done/total))+"%":"0%";
      outer.append(inner);track.append(outer);
      column.append(track,el("span",label,"report-bar-label"));
      column.setAttribute("title",label+": "+total+" giao, "+done+" hoàn thành");
      chart.append(column);
    }
    chart.setAttribute("aria-label","Theo "+(bucket==="month"?"tháng":"tuần")+". "+summary.join("; "));
  }
  function renderPerformanceReport(data) {
    const overview=data?.overview||{};
    for(const [id,key] of [
      ["report-total","total"],["report-done","done"],
      ["report-in-progress","in_progress"],["report-overdue","overdue"]
    ])$(id).textContent=reportNumber(overview[key]);
    $("report-rate").textContent=reportNumber(overview.completion_rate).toLocaleString("vi-VN",{maximumFractionDigits:1})+"%";
    $("report-completed-in-period").textContent=reportNumber(data?.completed_in_period);
    const people=Array.isArray(data?.people)?data.people:[];
    $("report-assignee-count").textContent=people.length+" người phụ trách có việc giao trong kỳ";
    const table=$("report-people-table");table.replaceChildren();
    if(!people.length){
      const tr=el("tr"),td=el("td","Chưa có công việc nào được giao trong kỳ.","empty");
      td.colSpan=6;tr.append(td);table.append(tr);
    }
    for(const person of people){
      const tr=el("tr");
      cell(tr,el("strong",person.assignee||"Chưa phân công"));
      for(const key of ["total","in_progress","done","overdue"])
        cell(tr,el("span",reportNumber(person[key])));
      cell(tr,el("strong",reportNumber(person.completion_rate).toLocaleString("vi-VN",{maximumFractionDigits:1})+"%"));
      table.append(tr);
    }
    renderReportChart(data?.trend,data?.bucket||$("report-bucket").value);
  }
  async function loadPerformanceReport(){
    if($("panel-reports").classList.contains("hide"))return;
    const seq=++state.reportSeq;
    const days=Number($("report-range").value);
    const bucket=$("report-bucket").value;
    if(![7,30,90,365].includes(days)||!["week","month"].includes(bucket)){
      message("report-status","Tùy chọn báo cáo không hợp lệ.",true);return;
    }
    $("report-refresh").disabled=true;
    message("report-status","Đang tổng hợp báo cáo từ Supabase...");
    try{
      const {data,error}=await client.rpc("care_performance_report",{
        p_start:reportDateStart(days),p_end:new Date().toISOString(),p_bucket:bucket
      });
      if(seq!==state.reportSeq)return;
      if(error)throw error;
      if(!data||!Array.isArray(data.people)||!Array.isArray(data.trend))throw new Error("Dữ liệu tổng hợp không hợp lệ.");
      state.taskReport=data;
      renderPerformanceReport(data);
      message("report-status","Đã tổng hợp báo cáo trên toàn bộ công việc thuộc kỳ được chọn.");
    }catch(error){
      if(seq===state.reportSeq){
        message("report-status","Không thể tải báo cáo: "+(error.message||"Lỗi hệ thống"),true);
        state.taskReport=null;
      }
    }finally{
      if(seq===state.reportSeq)$("report-refresh").disabled=false;
    }
  }
  async function loadMyTasks(){
    if(!state.currentUser?.id)return;
    const seq=++state.myTaskSeq;
    message("my-tasks-status","Đang tải công việc cá nhân...");
    const query=client.from("inquiry_care_tasks")
      .select("id,inquiry_id,title,assignee_name,assignee_user_id,status,priority,due_at,inquiries(id,full_name,follow_up_at)")
      .eq("assignee_user_id",state.currentUser.id).order("due_at",{ascending:true}).range(0,99);
    try{
      const {data,error}=await query;
      if(seq!==state.myTaskSeq)return;
      if(error)throw error;
      const list=$("my-tasks-table"),reminders=$("my-reminders");
      list.replaceChildren();reminders.replaceChildren();
      const times=new Map();
      for(const task of data||[]){
        const tr=el("tr");
        cell(tr,el("strong",task.title));
        cell(tr,el("span",task.inquiries?.full_name||"—"));
        cell(tr,el("span",stamp(task.due_at)+(isOverdue(task)?" · QUÁ HẠN":"")+
          " · "+(taskPriorities[task.priority]||task.priority)));
        cell(tr,statusSelector(task));list.append(tr);
        const inquiry=task.inquiries;
        if(inquiry?.follow_up_at&&inquiry.id&&!times.has(inquiry.id))
          times.set(inquiry.id,inquiry);
      }
      if(!data?.length){
        const tr=el("tr"),td=el("td","Bạn chưa có công việc được giao theo tài khoản.","empty");
        td.colSpan=4;tr.append(td);list.append(tr);
      }
      const remind=[...times.values()].sort((a,b)=>new Date(a.follow_up_at)-new Date(b.follow_up_at));
      for(const lead of remind.slice(0,15)){
        const box=el("div");
        box.append(el("strong",lead.full_name),el("small","Nhắc liên hệ: "+stamp(lead.follow_up_at)));
        reminders.append(box);
      }
      if(!remind.length)reminders.append(el("p","Không có lịch liên hệ đang chờ.","muted"));
      message("my-tasks-status","Đang hiển thị "+(data||[]).length+" công việc của tài khoản hiện tại (tối đa 100).");
    }catch(error){
      if(seq===state.myTaskSeq)message("my-tasks-status","Không tải được công việc cá nhân: "+error.message,true);
    }
  }
  async function loadAll() {
    message("dash-status","Đang tải dữ liệu...");
    await Promise.all([loadProjects(),refreshInquiries()]);
    if(!$("dash-status").classList.contains("error"))
      message("dash-status","Đã tải dữ liệu. Quản lý khách hàng phân trang 25 hồ sơ, thống kê toàn bộ dữ liệu.");
  }
  function renderMetrics() {
    $("metric-projects").textContent=state.projects.length;
    $("metric-published").textContent=state.projects.filter(p=>p.published).length;
  }
  function renderProjects() {
    const body=$("projects-table");body.replaceChildren();
    if(!state.projects.length) {
      const row=el("tr"),td=el("td","Chưa có dự án. Thêm một dự án ở biểu mẫu bên phải.","empty");
      td.colSpan=4;row.append(td);body.append(row);return;
    }
    state.projects.forEach(p=>{
      const row=el("tr");
      const identity=el("div");
      identity.append(el("strong",p.title),el("small",p.slug));
      cell(row,identity);
      cell(row,el("span",categories[p.category]||p.category));
      cell(row,el("span",p.published?"Đã đăng":"Bản nháp","badge"+(p.published?"":" draft")));
      const tools=el("div",undefined,"actions");
      tools.append(btn("Sửa",()=>editProject(p)),
                   btn("Xóa",()=>deleteProject(p),"danger"));
      cell(row,tools);body.append(row);
    });
  }
  function renderInquiries() {
    const body=$("inquiries-table");body.replaceChildren();
    const visible=state.inquiries;
    const start=state.leadPage*PAGE_SIZE;
    const last=start+visible.length;
    $("lead-match-count").textContent=state.leadTotal
      ? "Hiển thị "+(start+1)+"–"+last+" / "+state.leadTotal+" hồ sơ phù hợp"
      : "Không có hồ sơ phù hợp bộ lọc.";
    const pages=Math.max(1,Math.ceil(state.leadTotal/PAGE_SIZE));
    $("lead-page-label").textContent="Trang "+(state.leadPage+1)+" / "+pages;
    $("lead-prev-page").disabled=state.leadPage===0;
    $("lead-next-page").disabled=state.leadPage+1>=pages;
    $("lead-export-csv").disabled=!visible.length;
    if(!visible.length) {
      const tr=el("tr"),td=el("td","Không có hồ sơ phù hợp bộ lọc.","empty");
      td.colSpan=5;tr.append(td);body.append(tr);return;
    }
    visible.forEach(i=>{
      const tr=el("tr");
      const name=el("div");name.append(el("strong",i.full_name),el("small",stamp(i.created_at)));
      cell(tr,name);cell(tr,el("span",i.phone));
      const purpose=el("div");purpose.append(el("strong",i.service),el("small",i.space),el("small",i.details||""));
      purpose.append(el("small",i.consented_at ? "Đồng ý: "+stamp(i.consented_at)+" · Chính sách: "+(i.privacy_policy_version||"—") : "Chưa có dấu thời gian đồng ý"));
      const retentionBase = i.last_contacted_at || i.created_at;
      if (retentionBase) {
        const expiry = new Date(retentionBase);
        if (!Number.isNaN(expiry.getTime())) {
          const originalDay=expiry.getUTCDate();
          expiry.setUTCDate(1);
          expiry.setUTCMonth(expiry.getUTCMonth() + 12);
          const lastDay=new Date(Date.UTC(expiry.getUTCFullYear(),expiry.getUTCMonth()+1,0)).getUTCDate();
          expiry.setUTCDate(Math.min(originalDay,lastDay));
          purpose.append(el("small","Liên hệ cuối: "+(i.last_contacted_at ? stamp(i.last_contacted_at) : "Chưa liên hệ")+" · Dự kiến xóa: "+stamp(expiry.toISOString())));
        }
      }
      if (i.legal_hold_until) purpose.append(el("small","Giữ theo nghĩa vụ pháp lý đến: "+stamp(i.legal_hold_until)));
      if(i.follow_up_at)purpose.append(el("small","Nhắc liên hệ: "+stamp(i.follow_up_at)+(new Date(i.follow_up_at)<=new Date()?" · ĐẾN HẠN":""),new Date(i.follow_up_at)<=new Date()?"due-soon":""));

      cell(tr,purpose);
      const status=el("select",undefined,"lead-status");
      status.setAttribute("aria-label","Trạng thái yêu cầu của "+i.full_name);
      for(const [key,label] of Object.entries(inquiryStates)) {
        const o=el("option",label);o.value=key;status.append(o);
      }
      status.value=i.status;
      status.addEventListener("change",()=>updateInquiry(i,status));
      cell(tr,status);
      const inquiryTools=el("div",undefined,"actions");
      inquiryTools.append(btn("Hồ sơ",()=>openCustomerProfile(i)),btn("Ghi nhận liên hệ",()=>markInquiryContacted(i)),
                          btn("Xóa",()=>deleteInquiry(i),"danger"));
      cell(tr,inquiryTools);
      body.append(tr);
    });
  }
  const taskStatuses={todo:"Chờ thực hiện",in_progress:"Đang thực hiện",done:"Hoàn thành"};
  const taskPriorities={normal:"Bình thường",high:"Cao",urgent:"Khẩn cấp"};
  const taskPageSize=25;
  const taskColumns="id,inquiry_id,title,details,assignee_name,assignee_user_id,status,priority,due_at,completed_at,created_at,inquiries(full_name)";
  const isOverdue=t=>t.status!=="done"&&t.due_at&&new Date(t.due_at)<new Date();
  function statusSelector(task) {
    const control=el("select",undefined,"lead-status");
    control.setAttribute("aria-label","Tiến độ: "+task.title);
    for(const [value,label] of Object.entries(taskStatuses)) {
      const option=el("option",label);option.value=value;control.append(option);
    }
    control.value=task.status;
    control.addEventListener("change",async()=>{
      const old=task.status;control.disabled=true;
      try{
        const {error}=await client.from("inquiry_care_tasks").update({status:control.value}).eq("id",task.id);
        if(error)throw error;
        await Promise.all([refreshTasksBoard(),loadCustomerTasks(),loadMyTasks()]);
        message("dash-status","Đã cập nhật tiến độ công việc và ghi nhật ký.");
      }catch(error){
        control.value=old;message("dash-status","Không đổi được tiến độ: "+(error.message||"Lỗi hệ thống"),true);
      }finally{control.disabled=false}
    });
    return control;
  }
  // Accessible keyboard/touch Kanban actions reuse the same RLS-protected task update.
  const updatingTasks=new Set();
  async function advanceTask(task){
    if(updatingTasks.has(task.id))return;
    const next={todo:"in_progress",in_progress:"done",done:"todo"}[task.status];
    if(!next)return;
    updatingTasks.add(task.id);
    message("tasks-board-status","Đang cập nhật: "+task.title+"...");
    try{
      const {error}=await client.from("inquiry_care_tasks").update({status:next}).eq("id",task.id);
      if(error)throw error;
      await Promise.all([refreshTasksBoard(),loadCustomerTasks()]);
      message("tasks-board-status","Đã cập nhật: "+task.title+" → "+taskStatuses[next]+".");
    }catch(error){
      message("tasks-board-status","Không cập nhật được công việc: "+(error.message||"Lỗi hệ thống"),true);
    }finally{updatingTasks.delete(task.id);}
  }
  function setTaskView(mode){
    state.taskView=mode==="kanban"?"kanban":"table";
    $("tasks-table-wrap").classList.toggle("hide",state.taskView!=="table");
    $("tasks-kanban").classList.toggle("hide",state.taskView!=="kanban");
    $("task-view-table").setAttribute("aria-pressed",String(state.taskView==="table"));
    $("task-view-kanban").setAttribute("aria-pressed",String(state.taskView==="kanban"));
  }
  function renderTaskKanban(tasks){
    const groups={todo:[],in_progress:[],done:[]};
    for(const task of tasks) if(groups[task.status])groups[task.status].push(task);
    for(const [status,containerId,countId] of [
      ["todo","kanban-todo","kanban-todo-count"],
      ["in_progress","kanban-progress","kanban-progress-count"],
      ["done","kanban-done","kanban-done-count"]
    ]){
      const container=$(containerId);
      container.replaceChildren();
      $(countId).textContent=groups[status].length;
      if(!groups[status].length){
        container.append(el("p","Không có công việc ở trang này.","muted"));
        continue;
      }
      for(const task of groups[status]){
        const card=el("article",undefined,"kanban-card"+
          (task.priority==="urgent"?" priority-urgent":task.priority==="high"?" priority-high":"")+
          (isOverdue(task)?" overdue":""));
        const nextLabel={todo:"Bắt đầu",in_progress:"Hoàn thành",done:"Mở lại"}[status];
        card.append(
          el("strong",task.title),
          el("small","Khách hàng: "+(task.inquiries?.full_name||"—")),
          el("small","Phụ trách: "+task.assignee_name),
          el("small","Ưu tiên: "+(taskPriorities[task.priority]||task.priority)),
          el("small","Hạn: "+stamp(task.due_at)+(isOverdue(task)?" · QUÁ HẠN":""))
        );
        const actions=el("div",undefined,"actions");
        const advance=btn(nextLabel,()=>advanceTask(task));
        advance.setAttribute("aria-label",nextLabel+" công việc "+task.title);
        actions.append(advance);
        card.append(actions);
        container.append(card);
      }
    }
  }
  async function reassignCareTask(task){
    if(!state.staff.length)await loadStaff();
    const email=prompt("Nhập email của tài khoản nhân viên nhận việc:");
    if(email===null)return;
    const person=state.staff.find(p=>p.active&&p.email.toLowerCase()===email.trim().toLowerCase());
    if(!person){message("care-task-status","Không tìm thấy tài khoản đang hoạt động.",true);return;}
    if(person.user_id===task.assignee_user_id)return;
    const {error}=await client.from("inquiry_care_tasks").update({
      assignee_name:person.full_name,assignee_user_id:person.user_id
    }).eq("id",task.id);
    if(error){message("care-task-status","Không thể chuyển việc: "+error.message,true);return}
    await Promise.all([loadCustomerTasks(),refreshTasksBoard()]);
    message("care-task-status","Đã chuyển người phụ trách và lưu lịch sử.");
  }
  function resetCareTaskEditor(){
    state.editingTask=null;
    $("care-task-form").reset();
    $("care-task-create").textContent="Giao công việc";
    $("care-task-account").value="";
    $("care-task-cancel").classList.add("hide");
  }
  function editCareTask(task){
    if(state.busy||!state.activeProfile||task.inquiry_id!==state.activeProfile.id)return;
    state.editingTask={id:task.id, inquiry_id:task.inquiry_id};
    $("care-task-title").value=task.title;
    $("care-task-assignee").value=task.assignee_name;
    $("care-task-account").value=task.assignee_user_id||"";
    $("care-task-details").value=task.details||"";
    $("care-task-priority").value=task.priority;
    const date=task.due_at?new Date(task.due_at):null;
    if(date && !Number.isNaN(date.getTime())){
      const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
      $("care-task-due").value=local.toISOString().slice(0,16);
    }else $("care-task-due").value="";
    $("care-task-create").textContent="Lưu thay đổi";
    $("care-task-cancel").classList.remove("hide");
    $("care-task-form").scrollIntoView({behavior:"smooth",block:"center"});
    $("care-task-title").focus();
  }
  async function loadCustomerTasks(){
    const record=state.activeProfile;
    if(!record)return;
    const seq=++state.customerTaskSeq;
    const list=$("care-task-list"),history=$("care-task-events");
    list.replaceChildren(el("p","Đang tải công việc...","muted"));
    history.replaceChildren(el("li","Đang tải lịch sử giao việc..."));
    const [tasks,events]=await Promise.all([
      client.from("inquiry_care_tasks")
        .select("id,inquiry_id,title,details,assignee_name,assignee_user_id,status,priority,due_at,created_at,completed_at")
        .eq("inquiry_id",record.id).order("created_at",{ascending:false}).range(0,99),
      client.from("inquiry_care_task_events")
        .select("id,task_id,event_type,previous_value,current_value,created_at")
        .eq("inquiry_id",record.id).order("created_at",{ascending:false}).range(0,99)
    ]);
    if(seq!==state.customerTaskSeq || state.activeProfile?.id!==record.id)return;
    if(tasks.error||events.error){
      list.replaceChildren(el("p","Không đọc được công việc: "+(tasks.error?.message||events.error?.message||"Lỗi"),"error"));
      history.replaceChildren(el("li","Không tải được lịch sử."));
      return;
    }
    list.replaceChildren();history.replaceChildren();
    if(!tasks.data?.length)list.append(el("p","Chưa giao công việc nào.","muted"));
    for(const task of tasks.data||[]){
      const section=el("section",undefined,"task-taskline");
      section.append(el("strong",task.title),
        el("small","Phụ trách: "+task.assignee_name+" · "+taskPriorities[task.priority]+
          " · Hạn: "+stamp(task.due_at)+(isOverdue(task)?" · QUÁ HẠN":"")),
        el("p",task.details));
      const actions=el("div",undefined,"actions");
      actions.append(statusSelector(task),btn("Sửa công việc",()=>editCareTask(task)),btn("Chuyển người",()=>reassignCareTask(task)));
      section.append(actions);list.append(section);
    }
    if(!events.data?.length)history.append(el("li","Chưa có thay đổi tiến độ."));
    const names={created:"Giao công việc",status_changed:"Chuyển tiến độ",reassigned:"Chuyển người phụ trách",title_changed:"Sửa tên việc",details_changed:"Sửa mô tả",priority_changed:"Đổi mức ưu tiên",due_changed:"Đổi hạn xử lý"};
    for(const event of events.data||[]) {
      const li=el("li");
      const taskTitle=(tasks.data||[]).find(t=>t.id===event.task_id)?.title||"Công việc";
      li.append(el("strong",taskTitle+" · "+(names[event.event_type]||event.event_type)),
        el("small",stamp(event.created_at)),el("div",
          (event.previous_value?event.previous_value+" → ":"")+(event.current_value||"")));
      history.append(li);
    }
  }
  async function submitCareTask(event){
    event.preventDefault();
    if(state.busy||!state.activeProfile)return;
    const record=state.activeProfile;
    const edit=state.editingTask;
    if(edit && edit.inquiry_id!==record.id)return;
    const title=$("care-task-title").value.trim();
    const account=$("care-task-account").value;
    const person=state.staff.find(u=>u.user_id===account&&u.active);
    const assignee=person?.full_name||(edit && !account ? $("care-task-assignee").value.trim():"");
    const details=$("care-task-details").value.trim();
    const priority=$("care-task-priority").value;
    const dateValue=$("care-task-due").value;
    const due=dateValue?new Date(dateValue):null;
    if((!edit&&!person)||(account&&!person)||title.length<3||title.length>180||assignee.length<2||assignee.length>100||
      details.length>1500||!Object.hasOwn(taskPriorities,priority)||
      (due&&(Number.isNaN(due.getTime()) || due.getTime()>Date.now()+366*86400000))){
      message("care-task-status","Tên việc, người phụ trách hoặc hạn xử lý không hợp lệ (tối đa 12 tháng tới).",true);return;
    }
    const payload={title,assignee_name:assignee,assignee_user_id:account||null,details,priority,due_at:due?due.toISOString():null};
    setBusy(true);
    $("care-task-create").disabled=true;
    try{
      const request=edit
        ? client.from("inquiry_care_tasks").update(payload).eq("id",edit.id)
        : client.from("inquiry_care_tasks").insert({...payload,inquiry_id:record.id});
      const {error}=await request;
      if(error)throw error;
      resetCareTaskEditor();
      await Promise.all([loadCustomerTasks(),refreshTasksBoard()]);
      message("care-task-status",edit?"Đã cập nhật công việc và ghi nhật ký thay đổi.":"Đã giao công việc và tạo nhật ký.");
    }catch(error){message("care-task-status",(edit?"Không sửa được việc: ":"Không giao được việc: ")+(error.message||"Lỗi"),true)}
    finally{setBusy(false);$("care-task-create").disabled=false}
  }
  async function loadTaskBoard(){
    const seq=++state.taskBoardSeq;
    message("tasks-board-status","Đang tải công việc...");
    $("tasks-prev").disabled=true;$("tasks-next").disabled=true;
    let query=client.from("inquiry_care_tasks").select(taskColumns,{count:"exact"})
      .order("created_at",{ascending:false});
    if(state.taskStatusFilter!=="all")query=query.eq("status",state.taskStatusFilter);
    const owner=state.taskOwnerFilter.trim().replace(/[^\p{L}\p{N}\s-]/gu,"").slice(0,80);
    if(owner)query=query.ilike("assignee_name","%"+owner+"%");
    if(state.taskDueFilter==="overdue")query=query.neq("status","done").lt("due_at",new Date().toISOString());
    if(state.taskDueFilter==="7")query=query.gte("due_at",new Date().toISOString())
      .lte("due_at",new Date(Date.now()+7*86400000).toISOString());
    const start=state.taskBoardPage*taskPageSize;
    try{
      const {data,error,count}=await query.range(start,start+taskPageSize-1);
      if(seq!==state.taskBoardSeq)return;
      if(error)throw error;
      state.taskBoardTotal=typeof count==="number"?count:(data||[]).length;
      if(!data?.length&&state.taskBoardPage>0&&state.taskBoardTotal>0){
        state.taskBoardPage=Math.ceil(state.taskBoardTotal/taskPageSize)-1;
        return loadTaskBoard();
      }
      renderTaskKanban(data||[]);
      const body=$("tasks-board-table");body.replaceChildren();
      for(const task of data||[]){
        const tr=el("tr");
        cell(tr,el("strong",task.inquiries?.full_name||"Khách hàng"));
        cell(tr,el("strong",task.title));
        const staffCell=el("div");
        staffCell.append(el("span",task.assignee_name));
        if(state.currentRole==="manager"||state.currentRole==="admin")
          staffCell.append(btn("Chuyển tài khoản",()=>reassignCareTask(task)));
        cell(tr,staffCell);
        const due=el("div");
        due.append(el("strong",taskPriorities[task.priority]||task.priority),
          el("small",stamp(task.due_at)+(isOverdue(task)?" · Quá hạn":"")));
        cell(tr,due);cell(tr,statusSelector(task));
        body.append(tr);
      }
      if(!data?.length){
        const tr=el("tr"),td=el("td","Chưa có công việc phù hợp.","empty");td.colSpan=5;tr.append(td);body.append(tr);
      }
      $("tasks-page-label").textContent="Trang "+(state.taskBoardPage+1)+" / "+Math.max(1,Math.ceil(state.taskBoardTotal/taskPageSize));
      $("tasks-prev").disabled=state.taskBoardPage===0;
      $("tasks-next").disabled=(state.taskBoardPage+1)*taskPageSize>=state.taskBoardTotal;
      message("tasks-board-status","Hiển thị "+(data||[]).length+" / "+state.taskBoardTotal+" công việc phù hợp (25 việc/trang).");
    }catch(error){
      if(seq===state.taskBoardSeq)message("tasks-board-status","Lỗi tải công việc: "+(error.message||"Lỗi hệ thống"),true);
    }
  }
  async function loadTaskKpis(){
    const head=()=>client.from("inquiry_care_tasks").select("id",{count:"exact",head:true});
    const res=await Promise.all([
      head(),head().eq("status","todo"),head().eq("status","in_progress"),
      head().eq("status","done"),head().neq("status","done").lt("due_at",new Date().toISOString())
    ]);
    if(res.some(r=>r.error)){message("tasks-board-status","Không đọc được thống kê công việc.",true);return;}
    const vals=res.map(r=>r.count||0);
    for(const [id,count] of [["tasks-total",vals[0]],["tasks-todo",vals[1]],["tasks-progress",vals[2]],["tasks-done",vals[3]],["tasks-overdue",vals[4]]])$(id).textContent=count;
  }
  async function refreshTasksBoard(){
    if($("panel-tasks").classList.contains("hide")){
      if(state.currentRole==="admin")await loadPriorityHub();
      return;
    }
    await Promise.all([loadTaskBoard(),loadTaskKpis(),
      ...(state.currentRole==="admin"?[loadPriorityHub()]:[])]);
  }
  function newProject() {
    state.editingId=null;state.slugTouched=false;
    $("project-form").reset();$("p-order").value="0";
    $("edit-title").textContent="Thêm dự án mới";
    message("dash-status","");
  }
  function editProject(p) {
    state.editingId=p.id;state.slugTouched=true;
    $("p-title").value=p.title;$("p-slug").value=p.slug;
    $("p-category").value=p.category;$("p-area").value=p.area;
    $("p-style").value=p.style;$("p-image").value=p.image_url;
    $("p-summary").value=p.summary;$("p-order").value=p.sort_order;
    $("p-published").checked=p.published;
    $("edit-title").textContent="Chỉnh sửa dự án";
    $("project-form").scrollIntoView({behavior:"smooth",block:"center"});
    $("p-title").focus();
  }
  async function submitProject(event) {
    event.preventDefault();
    if(state.busy)return;
    const title=$("p-title").value.trim();
    const slug=$("p-slug").value.trim().toLowerCase();
    const url=$("p-image").value.trim();
    if(title.length<2 || !/^[a-z0-9-]{2,100}$/.test(slug) ||
      !/^https:\/\/[^\s]+$/i.test(url)) {
      message("dash-status","Tên, slug hoặc địa chỉ ảnh HTTPS không hợp lệ.",true);return;
    }
    const payload={title,slug,category:$("p-category").value,
      area:$("p-area").value.trim(),style:$("p-style").value.trim(),
      image_url:url,summary:$("p-summary").value.trim(),
      sort_order:Number($("p-order").value)||0,published:$("p-published").checked,
      updated_at:new Date().toISOString()};
    setBusy(true);
    try {
      const request=state.editingId
        ? client.from("projects").update(payload).eq("id",state.editingId)
        : client.from("projects").insert(payload);
      const {error}=await request;
      if(error)throw error;
      newProject();await loadProjects();
      message("dash-status","Đã lưu dự án. Dự án xuất bản sẽ xuất hiện trên website.",false);
    } catch(error) {
      message("dash-status","Không thể lưu dự án: "+(error.message||"Lỗi không xác định"),true);
    } finally {setBusy(false)}
  }
  async function deleteProject(p) {
    if(!confirm('Xóa dự án "'+p.title+'"? Không thể khôi phục.'))return;
    const {error}=await client.from("projects").delete().eq("id",p.id);
    if(error){message("dash-status","Không xóa được dự án: "+error.message,true);return}
    if(state.editingId===p.id)newProject();
    await loadProjects();message("dash-status","Đã xóa dự án.");
  }
  async function markInquiryContacted(record) {
    if (state.busy) return;
    // An explicit admin action records an actual contact, rather than assuming a status change means contact.
    if (!confirm('Xác nhận bạn vừa liên hệ với khách hàng "'+record.full_name+'"?')) return;
    setBusy(true);
    try {
      const {data,error}=await client.rpc("record_inquiry_contact",{p_inquiry_id:record.id});
      if (error) throw error;
      if (data !== true) throw new Error("Bạn không có quyền cập nhật hồ sơ hoặc hồ sơ đã được xóa.");
      await refreshInquiries();
      if(state.activeProfile?.id===record.id){
        record.last_contacted_at=new Date().toISOString();
        await openCustomerProfile(record);
      }
      message("dash-status","Đã ghi nhận liên hệ và thêm sự kiện vào lịch sử. Hạn lưu tính lại 12 tháng.");
    } catch(error) {
      message("dash-status","Không thể ghi nhận liên hệ: "+(error.message||"Lỗi hệ thống"),true);
    } finally {setBusy(false);}
  }
  async function updateInquiry(record,select) {
    const old=record.status;const next=select.value;select.disabled=true;
    try{
      const {data,error}=await client.rpc("update_inquiry_status_with_log",{
        p_inquiry_id:record.id,p_status:next
      });
      if(error)throw error;
      if(data!==true)throw new Error("Không tìm thấy hồ sơ hoặc không có quyền cập nhật.");
      record.status=next;
      await refreshInquiries();
      if(state.activeProfile?.id===record.id)await openCustomerProfile(record);
      message("dash-status","Đã cập nhật trạng thái và ghi vào lịch sử chăm sóc.");
    }catch(error){select.value=old;message("dash-status","Không đổi được trạng thái: "+(error.message||"Lỗi"),true)}
    finally {select.disabled=false}
  }
  async function deleteInquiry(i) {
    if(!confirm('Xóa yêu cầu tư vấn của "'+i.full_name+'"?'))return;
    const {error}=await client.from("inquiries").delete().eq("id",i.id);
    if(error){message("dash-status","Không xóa được yêu cầu: "+error.message,true);return}
    if(state.activeProfile?.id===i.id)closeCustomerProfile();
    await refreshInquiries();message("dash-status","Đã xóa yêu cầu.");
  }
  function closeCustomerProfile() {
    ++state.profileSeq;
    ++state.customerTaskSeq;
    state.activeProfile=null;
    $("lead-profile").classList.add("hide");
    $("profile-history").replaceChildren();
    $("profile-revisions").replaceChildren();
    $("care-task-list").replaceChildren();
    $("care-task-events").replaceChildren();
    resetCareTaskEditor();
    $("profile-note-input").value="";
    $("profile-reminder-at").value="";
    message("profile-status","");
  }
  function profileField(key,value) {
    const wrap=el("div"),label=el("small",key);
    wrap.append(label,el("strong",value||"—"));
    $("profile-fields").append(wrap);
  }
  async function editCareNote(item) {
    if(state.busy || !state.activeProfile || item.editable !== true || item.note_kind !== "note") return;
    const rows=Array.from($("profile-history").children);
    const row=rows.find(li=>li.dataset.noteId===item.id);
    if(!row)return;
    row.querySelector(".care-note-edit")?.remove();
    const editor=el("div",undefined,"care-note-edit");
    const input=el("textarea");
    input.value=item.body;
    input.maxLength=1500;
    input.setAttribute("aria-label","Nội dung chỉnh sửa ghi chú");
    const actions=el("div",undefined,"actions");
    const save=btn("Lưu chỉnh sửa",async()=>{
      if(state.busy || !state.activeProfile)return;
      const value=input.value.trim();
      if(!value || value.length>1500){
        message("profile-status","Nội dung ghi chú phải từ 1 đến 1500 ký tự.",true);return;
      }
      if(value===item.body){editor.remove();return;}
      setBusy(true);
      try {
        const {data,error}=await client.rpc("edit_inquiry_care_note",{
          p_note_id:item.id,p_body:value,p_expected_updated_at:item.updated_at
        });
        if(error)throw error;
        if(data!==true)throw new Error("Chỉ chỉnh sửa được ghi chú thường do Admin tạo.");
        await loadProfileNotes();
        message("profile-status","Đã cập nhật ghi chú. Phiên bản cũ được giữ trong nhật ký.");
      } catch(error) {
        const stale=(error.message||"").includes("STALE_NOTE");
        message("profile-status",stale
          ? "Ghi chú đã được thay đổi ở phiên khác. Hãy đóng/mở hồ sơ để tải phiên bản mới."
          : "Không thể sửa ghi chú: "+(error.message||"Lỗi hệ thống"),true);
      } finally {setBusy(false);}
    });
    save.classList.add("note-edit-save");
    const cancel=btn("Hủy",()=>editor.remove());
    actions.append(save,cancel);
    editor.append(input,actions);
    row.append(editor);
    input.focus();
  }
  async function loadProfileNotes() {
    const record=state.activeProfile;
    if(!record)return;
    const seq=++state.profileSeq;
    const list=$("profile-history"),history=$("profile-revisions");
    list.replaceChildren(el("li","Đang tải lịch sử..."));
    history.replaceChildren(el("li","Đang tải nhật ký chỉnh sửa..."));
    try {
      const [notes,revisions]=await Promise.all([
        client.from("inquiry_care_notes")
          .select("id,note_kind,body,scheduled_for,created_at,updated_at,editable")
          .eq("inquiry_id",record.id).order("created_at",{ascending:false}).range(0,99),
        client.from("inquiry_care_note_revisions")
          .select("id,note_id,previous_body,revised_body,edited_at")
          .eq("inquiry_id",record.id).order("edited_at",{ascending:false}).range(0,99)
      ]);
      if(seq!==state.profileSeq)return;
      if(notes.error)throw notes.error;
      if(revisions.error)throw revisions.error;
      list.replaceChildren();
      history.replaceChildren();
      if(!notes.data?.length)list.append(el("li","Chưa có ghi chú hoặc lịch nhắc."));
      for(const item of notes.data||[]) {
        const li=el("li");
        li.dataset.noteId=item.id;
        li.append(el("strong",item.note_kind==="reminder"?"Lịch nhắc":item.editable===true?"Ghi chú":"Nhật ký hệ thống"),
          el("div",item.body),el("span",stamp(item.created_at)+(item.scheduled_for?" · Hẹn: "+stamp(item.scheduled_for):"")));
        if(item.updated_at && item.updated_at!==item.created_at)
          li.append(el("small","Đã cập nhật: "+stamp(item.updated_at),"note-edit-badge"));
        if(item.editable===true && item.note_kind==="note") {
          const tools=el("div",undefined,"care-note-tools");
          tools.append(btn("Sửa ghi chú",()=>editCareNote(item)));
          li.append(tools);
        }
        list.append(li);
      }
      if(!revisions.data?.length)history.append(el("li","Chưa có chỉnh sửa nào."));
      for(const rev of revisions.data||[]) {
        const li=el("li");
        li.append(el("strong","Đã sửa ghi chú lúc "+stamp(rev.edited_at)),
          el("small","Trước: "+rev.previous_body),el("div","Sau: "+rev.revised_body));
        history.append(li);
      }
    } catch(error) {
      if(seq===state.profileSeq) {
        list.replaceChildren(el("li","Không tải được lịch sử: "+(error.message||"Lỗi truy vấn")));
        history.replaceChildren(el("li","Không tải được nhật ký."));
      }
    }
  }
  async function openCustomerProfile(record) {
    state.activeProfile=record;
    const fields=$("profile-fields");
    fields.replaceChildren();
    $("profile-name").textContent=record.full_name;
    profileField("Số điện thoại",record.phone);
    profileField("Dịch vụ",record.service);
    profileField("Không gian",record.space);
    profileField("Nhu cầu",record.details);
    profileField("Trạng thái",inquiryStates[record.status]||record.status);
    profileField("Ngày gửi",stamp(record.created_at));
    profileField("Ngày đồng ý chính sách",stamp(record.consented_at));
    profileField("Liên hệ gần nhất",stamp(record.last_contacted_at));
    profileField("Ngày dự kiến xóa",stamp(retentionUntil(record.last_contacted_at||record.created_at)));
    $("profile-reminder-current").textContent=record.follow_up_at
      ? "Lịch hiện tại: "+stamp(record.follow_up_at) : "Chưa đặt lịch liên hệ.";
    $("profile-reminder-at").value="";
    $("profile-reminder-done").disabled=!record.follow_up_at;
    $("lead-profile").classList.remove("hide");
    message("profile-status","");
    $("lead-profile").scrollIntoView({behavior:"smooth",block:"start"});
    await Promise.all([loadProfileNotes(),loadCustomerTasks()]);
  }
  async function saveCareNote(event) {
    event.preventDefault();
    if(state.busy||!state.activeProfile)return;
    const record=state.activeProfile;
    const body=$("profile-note-input").value.trim();
    if(!body||body.length>1500){message("profile-status","Ghi chú phải từ 1 đến 1500 ký tự.",true);return;}
    setBusy(true);
    try {
      const {error}=await client.from("inquiry_care_notes").insert({inquiry_id:record.id,body});
      if(error)throw error;
      $("profile-note-input").value="";
      await loadProfileNotes();
      message("profile-status","Đã lưu ghi chú vào lịch sử.");
    }catch(error){message("profile-status","Không lưu được ghi chú: "+(error.message||"Lỗi"),true)}
    finally {setBusy(false)}
  }
  async function saveFollowup(dateValue) {
    if(state.busy||!state.activeProfile)return;
    const record=state.activeProfile;
    const due=dateValue===null?null:new Date(dateValue);
    if(due && (Number.isNaN(due.getTime()) || due.getTime()<Date.now()-86400000 ||
      due.getTime()>Date.now()+366*86400000)){
      message("profile-status","Vui lòng chọn thời gian hợp lệ trong vòng 12 tháng tới.",true);return;
    }
    setBusy(true);
    try{
      const {data,error}=await client.rpc("schedule_inquiry_followup",{
        p_inquiry_id:record.id,p_due_at:due?due.toISOString():null
      });
      if(error)throw error;
      if(data!==true)throw new Error("Hồ sơ không tồn tại hoặc tài khoản không có quyền.");
      record.follow_up_at=due?due.toISOString():null;
      $("profile-reminder-current").textContent=due?"Lịch hiện tại: "+stamp(due):"Chưa đặt lịch liên hệ.";
      $("profile-reminder-at").value="";
      $("profile-reminder-done").disabled=!record.follow_up_at;
      await loadProfileNotes();
      await refreshInquiries();
      message("profile-status",due?"Đã đặt lịch nhắc, hiển thị trong Admin.":"Đã hủy lịch nhắc.");
    }catch(error){message("profile-status","Không cập nhật được lịch nhắc: "+(error.message||"Lỗi"),true)}
    finally{setBusy(false)}
  }
  async function completeFollowup() {
    if(state.busy||!state.activeProfile?.follow_up_at)return;
    const record=state.activeProfile;
    if(!confirm("Đánh dấu lịch nhắc này đã hoàn thành? Thao tác không tự xác nhận đã liên hệ khách hàng."))return;
    setBusy(true);
    try {
      const {data,error}=await client.rpc("complete_inquiry_followup",{p_inquiry_id:record.id});
      if(error)throw error;
      if(data!==true)throw new Error("Lịch nhắc đã được hoàn thành hoặc hồ sơ không tồn tại.");
      record.follow_up_at=null;
      $("profile-reminder-current").textContent="Chưa đặt lịch liên hệ.";
      $("profile-reminder-done").disabled=true;
      $("profile-reminder-at").value="";
      await loadProfileNotes();
      await refreshInquiries();
      message("profile-status","Đã đánh dấu hoàn thành công việc, lưu lịch sử và cập nhật danh sách nhắc.");
    }catch(error){message("profile-status","Không hoàn thành được công việc: "+(error.message||"Lỗi"),true)}
    finally{setBusy(false)}
  }
  $("p-title").addEventListener("input",()=>{
    if(!state.slugTouched)$("p-slug").value=slugify($("p-title").value);
  });
  $("p-slug").addEventListener("input",()=>{state.slugTouched=true});
  $("project-cancel").addEventListener("click",newProject);
  $("project-form").addEventListener("submit",submitProject);
  $("tab-projects").addEventListener("click",()=>switchTab("projects"));
  $("tab-inquiries").addEventListener("click",()=>switchTab("inquiries"));
  $("tab-tasks").addEventListener("click",()=>switchTab("tasks"));
  $("tab-reports").addEventListener("click",()=>switchTab("reports"));
  $("tab-my-tasks").addEventListener("click",()=>switchTab("my-tasks"));
  $("tab-staff").addEventListener("click",()=>switchTab("staff"));
  $("staff-refresh").addEventListener("click",loadStaff);
  $("staff-invite-form").addEventListener("submit",inviteStaff);
  $("my-tasks-refresh").addEventListener("click",loadMyTasks);
  $("care-task-account").addEventListener("change",()=>{
    const person=state.staff.find(u=>u.user_id===$("care-task-account").value&&u.active);
    if(person)$("care-task-assignee").value=person.full_name;
    else if(!state.editingTask)$("care-task-assignee").value="";
  });
  $("report-refresh").addEventListener("click",loadPerformanceReport);
  $("report-range").addEventListener("change",loadPerformanceReport);
  $("report-bucket").addEventListener("change",loadPerformanceReport);
  $("priority-refresh").addEventListener("click",loadPriorityHub);
  $("priority-task-overdue-open").addEventListener("click",()=>showTaskPriority("overdue"));
  $("priority-task-soon-open").addEventListener("click",()=>showTaskPriority("7"));
  $("priority-lead-overdue-open").addEventListener("click",()=>showLeadPriority("due"));
  $("priority-lead-soon-open").addEventListener("click",()=>showLeadPriority("upcoming"));
  $("reload-projects").addEventListener("click",loadProjects);
  $("reload-inquiries").addEventListener("click",refreshInquiries);
  let searchTimer;
  const leadFilters=[
    ["lead-search","leadSearch","input"],
    ["lead-filter-status","leadStatus","change"],
    ["lead-filter-service","leadService","change"],
    ["lead-filter-period","leadPeriod","change"],
    ["lead-filter-reminder","leadReminder","change"]
  ];
  for(const [id,key,event] of leadFilters) {
    $(id).addEventListener(event,()=>{
      state[key]=$(id).value;
      state.leadPage=0;
      clearTimeout(searchTimer);
      if(key==="leadSearch")searchTimer=setTimeout(loadInquiries,300);
      else loadInquiries();
    });
  }
  $("lead-clear-filters").addEventListener("click",()=>{
    clearTimeout(searchTimer);
    state.leadSearch=""; state.leadStatus="all"; state.leadService="all";state.leadPeriod="all";state.leadReminder="all";
    state.leadPage=0;
    for(const [id,key] of leadFilters) $(id).value=state[key];
    loadInquiries();
    $("lead-search").focus();
  });
  $("lead-prev-page").addEventListener("click",()=>{
    if(state.leadPage===0)return;
    state.leadPage--;
    loadInquiries();
  });
  $("lead-next-page").addEventListener("click",()=>{
    if((state.leadPage+1)*PAGE_SIZE>=state.leadTotal)return;
    state.leadPage++;
    loadInquiries();
  });
  function exportLeadCsv() {
    if(!state.inquiries.length)return;
    if(!confirm("Xuất "+state.inquiries.length+" hồ sơ của trang đang hiển thị? Tệp chứa dữ liệu cá nhân: chỉ tải trên thiết bị riêng, không chia sẻ công khai."))return;
    const quote=value=>{
      let text=String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim();
      // Neutralize CSV/Excel formula injection for customer-supplied fields.
      if(/^[=+@-]/.test(text))text="'"+text;
      return '"'+text.replace(/"/g,'""')+'"';
    };
    const head=["Tên khách hàng","Số điện thoại","Dịch vụ","Không gian","Nội dung","Trạng thái","Ngày nhận","Ngày liên hệ","Ngày đồng ý","Phiên bản chính sách"];
    const rows=state.inquiries.map(i=>[
      i.full_name,i.phone,i.service,i.space,i.details,inquiryStates[i.status]||i.status,
      i.created_at,i.last_contacted_at,i.consented_at,i.privacy_policy_version
    ]);
    const csv="\uFEFF"+[head,...rows].map(row=>row.map(quote).join(",")).join("\r\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const link=document.createElement("a");
    const uri=URL.createObjectURL(blob);
    link.href=uri;link.download="tan-design-khach-hang-trang-"+(state.leadPage+1)+".csv";
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(uri),10000);
  }
  $("care-task-form").addEventListener("submit",submitCareTask);
  $("care-task-cancel").addEventListener("click",resetCareTaskEditor);
  $("reload-tasks").addEventListener("click",refreshTasksBoard);
  $("task-view-table").addEventListener("click",()=>setTaskView("table"));
  $("task-view-kanban").addEventListener("click",()=>setTaskView("kanban"));
  for(const [id,field] of [["tasks-status-filter","taskStatusFilter"],["tasks-due-filter","taskDueFilter"]]){
    $(id).addEventListener("change",()=>{
      state[field]=$(id).value;state.taskBoardPage=0;refreshTasksBoard();
    });
  }
  let taskFilterTimer;
  $("tasks-owner-filter").addEventListener("input",()=>{
    state.taskOwnerFilter=$("tasks-owner-filter").value;state.taskBoardPage=0;
    clearTimeout(taskFilterTimer);taskFilterTimer=setTimeout(refreshTasksBoard,300);
  });
  $("tasks-prev").addEventListener("click",()=>{
    if(state.taskBoardPage>0){state.taskBoardPage--;refreshTasksBoard();}
  });
  $("tasks-next").addEventListener("click",()=>{
    if((state.taskBoardPage+1)*taskPageSize<state.taskBoardTotal){
      state.taskBoardPage++;refreshTasksBoard();
    }
  });
  $("lead-export-csv").addEventListener("click",exportLeadCsv);
  $("profile-close").addEventListener("click",closeCustomerProfile);
  $("profile-note-form").addEventListener("submit",saveCareNote);
  $("profile-reminder-form").addEventListener("submit",e=>{
    e.preventDefault();
    const date=$("profile-reminder-at").value;
    if(!date){message("profile-status","Vui lòng chọn ngày giờ nhắc.",true);return}
    saveFollowup(date);
  });
  $("profile-reminder-done").addEventListener("click",completeFollowup);
  $("profile-reminder-clear").addEventListener("click",()=>{
    if(state.activeProfile && confirm("Hủy lịch nhắc liên hệ hiện tại?"))saveFollowup(null);
  });
  $("crm-open-due").addEventListener("click",()=>{
    switchTab("inquiries");
    $("lead-filter-reminder").value="due";
    state.leadReminder="due";state.leadPage=0;
    loadInquiries();
  });
  $("logout").addEventListener("click",async()=>{await client.auth.signOut();loginVisible();});
  $("login-form").addEventListener("submit",async(event)=>{
    event.preventDefault();
    const email=$("email").value.trim();const password=$("password").value;
    message("login-status","Đang xác thực...");
    setBusy(true);
    try {
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      $("password").value="";
      await enterDashboard();
    } catch(error) {
      message("login-status","Đăng nhập không thành công. Kiểm tra tài khoản và mật khẩu.",true);
    } finally {setBusy(false)}
  });
  // Social and phone sign-in are authentication only. verify() enforces staff RLS/roles.
  $("google-login").addEventListener("click",async()=>{
    message("login-status","Đang chuyển sang Google…");
    const redirectTo=new URL("./admin.html",location.href).href;
    const {error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo}});
    if(error)message("login-status","Không mở được đăng nhập Google. Kiểm tra cấu hình nhà cung cấp.",true);
  });
  (async()=>{
    const user=await verify();
    if(user) await enterDashboard();
    else {
      const {data:{user:account}}=await client.auth.getUser();
      // Do not associate users by email. Identity linking must use Supabase's verified user ID.
      // Only a new Google-authenticated account without a staff role can complete a pending profile.
      if(account && !account.app_metadata?.role && account.app_metadata?.registration_status!=="rejected"
          && account.app_metadata?.providers?.includes("google")){
        location.replace("./complete-profile.html");return;
      }
      if(account)await client.auth.signOut();
      loginVisible();
    }
  })();
})();
