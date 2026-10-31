/* ATELIER HOME v1.5.0 Admin.
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
    leadQuerySeq:0, leadStatsSeq:0 };

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
    const time = new Date(date);
    return Number.isNaN(time.getTime()) ? "—" : time.toLocaleString("vi-VN");
  }
  function slugify(t) {
    return t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")
      .replace(/Đ/g,"d").toLowerCase().replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"").slice(0,100);
  }
  function switchTab(name) {
    for(const kind of ["projects","inquiries"]) {
      const active = kind === name;
      $("panel-"+kind).classList.toggle("hide", !active);
      $("tab-"+kind).setAttribute("aria-selected", String(active));
    }
  }
  function setBusy(b) {
    state.busy=b;
    for(const id of ["project-save","login-button","reload-projects","reload-inquiries"]) $(id).disabled=b;
  }
  function loginVisible() {
    $("login-panel").classList.remove("hide");$("dashboard").classList.add("hide");
  }
  async function verify() {
    const {data,error}=await client.auth.getUser();
    if(error || !data?.user) return null;
    return data.user.app_metadata?.role==="admin" ? data.user : null;
  }
  async function enterDashboard() {
    const user=await verify();
    if(!user) {
      await client.auth.signOut();
      loginVisible();
      message("login-status","Tài khoản chưa được cấp quyền quản trị. Liên hệ người quản lý để được phân quyền.",true);
      return;
    }
    $("login-panel").classList.add("hide");
    $("dashboard").classList.remove("hide");
    $("signed-in-email").textContent=user.email || "Administrator";
    await loadAll();
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
  const inquiryColumns="id,full_name,phone,service,space,details,status,created_at,consented_at,privacy_policy_version,last_contacted_at,legal_hold_until";
  const vietnamDayStartUTC=() => {
    const date = new Date(Date.now() + 7 * 3600000).toISOString().slice(0,10);
    return new Date(Date.parse(date+"T00:00:00Z") - 7 * 3600000).toISOString();
  };
  function applyInquiryQuery(query) {
    if(state.leadStatus!=="all") query=query.eq("status",state.leadStatus);
    if(state.leadService!=="all") query=query.eq("service",state.leadService);
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
    const from=state.leadPage*PAGE_SIZE;
    let query=client.from("inquiries").select(inquiryColumns,{count:"exact"})
      .order("created_at",{ascending:false}).order("id",{ascending:false});
    query=applyInquiryQuery(query);
    const {data,error,count}=await query.range(from,from+PAGE_SIZE-1);
    if(seq!==state.leadQuerySeq)return;
    if(error){
      message("dash-status","Không đọc được yêu cầu tư vấn: "+(error.message||"Lỗi truy vấn"),true);
      $("lead-match-count").textContent="Không tải được hồ sơ.";
      return;
    }
    state.leadTotal=typeof count==="number" ? count : (data||[]).length;
    // When a record is deleted or filters change, move to the last existing page.
    if(!data?.length && state.leadPage>0 && state.leadTotal>0){
      state.leadPage=Math.ceil(state.leadTotal/PAGE_SIZE)-1;
      return loadInquiries();
    }
    state.inquiries=data||[];
    renderInquiries();
  }
  async function loadLeadStats() {
    const seq=++state.leadStatsSeq;
    const head=() => client.from("inquiries").select("id",{count:"exact",head:true});
    const requests=[
      head(),head().gte("created_at",vietnamDayStartUTC()),
      head().eq("status","contacted"),head().eq("status","quoted"),
      head().eq("status","new")
    ];
    const results=await Promise.all(requests);
    if(seq!==state.leadStatsSeq)return;
    if(results.some(x=>x.error)){
      message("dash-status","Không tải được thống kê tư vấn.",true);
      return;
    }
    const [total,today,contacted,quoted,newCount]=results.map(x=>Number(x.count)||0);
    $("crm-total").textContent=total;
    $("crm-today").textContent=today;
    $("crm-contacted").textContent=contacted;
    $("crm-quoted").textContent=quoted;
    $("metric-inquiries").textContent=newCount;
  }
  async function refreshInquiries() {
    await Promise.all([loadInquiries(),loadLeadStats()]);
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
      inquiryTools.append(btn("Ghi nhận liên hệ",()=>markInquiryContacted(i)),
                          btn("Xóa",()=>deleteInquiry(i),"danger"));
      cell(tr,inquiryTools);
      body.append(tr);
    });
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
      message("dash-status","Đã ghi nhận liên hệ. Thời hạn lưu dữ liệu được tính lại 12 tháng.");
    } catch(error) {
      message("dash-status","Không thể ghi nhận liên hệ: "+(error.message||"Lỗi hệ thống"),true);
    } finally {setBusy(false);}
  }
  async function updateInquiry(record,select) {
    const old=record.status;const next=select.value;select.disabled=true;
    const {error}=await client.from("inquiries").update({status:next}).eq("id",record.id);
    select.disabled=false;
    if(error){select.value=old;message("dash-status","Không đổi được trạng thái: "+error.message,true);return}
    await refreshInquiries();message("dash-status","Đã cập nhật trạng thái yêu cầu.");
  }
  async function deleteInquiry(i) {
    if(!confirm('Xóa yêu cầu tư vấn của "'+i.full_name+'"?'))return;
    const {error}=await client.from("inquiries").delete().eq("id",i.id);
    if(error){message("dash-status","Không xóa được yêu cầu: "+error.message,true);return}
    await refreshInquiries();message("dash-status","Đã xóa yêu cầu.");
  }
  $("p-title").addEventListener("input",()=>{
    if(!state.slugTouched)$("p-slug").value=slugify($("p-title").value);
  });
  $("p-slug").addEventListener("input",()=>{state.slugTouched=true});
  $("project-cancel").addEventListener("click",newProject);
  $("project-form").addEventListener("submit",submitProject);
  $("tab-projects").addEventListener("click",()=>switchTab("projects"));
  $("tab-inquiries").addEventListener("click",()=>switchTab("inquiries"));
  $("reload-projects").addEventListener("click",loadProjects);
  $("reload-inquiries").addEventListener("click",refreshInquiries);
  let searchTimer;
  const leadFilters=[
    ["lead-search","leadSearch","input"],
    ["lead-filter-status","leadStatus","change"],
    ["lead-filter-service","leadService","change"],
    ["lead-filter-period","leadPeriod","change"]
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
    state.leadSearch=""; state.leadStatus="all"; state.leadService="all";state.leadPeriod="all";
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
  $("lead-export-csv").addEventListener("click",exportLeadCsv);
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
  (async()=>{
    const user=await verify();
    if(user) await enterDashboard();
    else loginVisible();
  })();
})();
