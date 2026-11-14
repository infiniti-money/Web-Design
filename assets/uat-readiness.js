/* Admin-only UAT readiness workspace (shared Web + Windows).
 * Checkboxes are UNVERIFIED declarations, never certification of production.
 * No PII, database dumps, secrets, tokens or test data persist in the browser.
 */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AtelierUatReadiness=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const GATES=Object.freeze([
    {id:"backup",label:"Bản sao lưu production mới",help:"Lưu bản sao mã hóa ngoài GitHub; kiểm chứng SHA-256 trên máy được phép và ghi UTC."},
    {id:"restore",label:"Khôi phục cô lập và kiểm đếm",help:"Dùng đúng bản sao đã băm; so số dòng/ACL/RLS trên môi trường không kết nối hệ thống thật."},
    {id:"authstorage",label:"Khôi phục Auth và Storage",help:"Kiểm tra identities, đăng nhập trong môi trường thử an toàn và tệp Storage (nếu có)."},
    {id:"employee",label:"UAT Nhân viên thật",help:"Admin duyệt nhân viên được phép; thử tài khoản thật và HTTP 401/403, không chỉ nhìn menu ẩn."},
    {id:"revocation",label:"Kiểm tra thu hồi quyền và phiên cũ",help:"Hạ quyền/khóa hồ sơ và xác nhận JWT cũ không truy cập được RPC hoặc nghiệp vụ nhạy cảm."},
    {id:"desktop",label:"Nâng cấp Windows và phiên DPAPI",help:"Cài đè bản hiện hành trên máy Windows được phép, bảo toàn dữ liệu và kiểm tra rollback."},
    {id:"password",label:"Bảo vệ mật khẩu bị lộ",help:"Kiểm tra Supabase Advisor hết cảnh báo; trên Free cần kế hoạch được duyệt nếu chưa hỗ trợ."},
    {id:"public",label:"Nội dung thật, Search Console/CWV",help:"Chỉ duyệt ảnh, thông tin pháp lý, dữ liệu SEO và số liệu thực địa đã được doanh nghiệp xác nhận."}
  ]);
  const IDS=new Set(GATES.map(x=>x.id));
  function isApprovedRole(user,profile){
    return !!(user?.id&&user.app_metadata?.role==="admin"&&profile?.active===true&&profile.role==="admin");
  }
  async function authorize(client){
    const result=await client.auth.getUser();
    const user=result?.data?.user;
    if(result?.error||!user?.id||user.app_metadata?.role!=="admin")throw Error("UAT_FORBIDDEN");
    const profile=await client.from("staff_profiles").select("role,active").eq("user_id",user.id).single();
    if(profile?.error||!isApprovedRole(user,profile?.data))throw Error("UAT_FORBIDDEN");
    return {id:user.id,role:"admin"};
  }
  function makeEvidence(checked,when=new Date()){
    const ids=[...new Set(Array.isArray(checked)?checked:[])].filter(id=>IDS.has(id)).sort();
    const date=when instanceof Date?when:new Date(when);
    if(!Number.isFinite(date.getTime()))throw Error("UAT_DATE_INVALID");
    return {
      kind:"atelier-uat-readiness-self-report-v1",
      generated_utc:date.toISOString(),
      declared_gates:ids,
      gate_count:GATES.length,
      declared_count:ids.length,
      verification:"OPERATOR_DECLARATION_ONLY",
      production_uat:"NOT_CERTIFIED",
      warning:"Checkboxes do not prove Auth login, isolated backup restore, RLS denial, password protection or hardware installation."
    };
  }
  function mount(doc,win){
    const el=id=>doc.getElementById(id);
    const status=el("uat-status"),panel=el("uat-panel");
    const exportBtn=el("uat-export"),reloadBtn=el("uat-refresh");
    const config=win.ATELIER_CONFIG;
    if(!config?.supabaseUrl||!config?.supabasePublishableKey||!win.supabase?.createClient){
      status.textContent="Không thể xác minh Supabase Auth. Không hiển thị nghiệm thu.";return null;
    }
    const client=win.supabase.createClient(config.supabaseUrl,
      config.supabasePublishableKey,win.ATELIER_CLIENT_OPTIONS||{});
    let serial=0,account=null,checked=new Set();
    const isCurrent=n=>n===serial;
    function clear(message){
      checked.clear();account=null;panel.hidden=true;panel.setAttribute("aria-busy","false");
      el("uat-gates").replaceChildren();exportBtn.disabled=true;
      status.textContent=message;
      el("uat-progress").textContent="0 / "+GATES.length+" khai báo; chưa có bằng chứng nghiệm thu";
    }
    function invalidate(message){serial++;reloadBtn.disabled=false;clear(message);}
    function redraw(){
      const n=checked.size;
      el("uat-progress").textContent=n+" / "+GATES.length+" mục được tích thủ công — KHÔNG phải kết quả nghiệm thu.";
      exportBtn.disabled=!account;
    }
    function render(){
      const grid=el("uat-gates");grid.replaceChildren();
      for(const gate of GATES){
        const item=doc.createElement("label");item.className="uat-gate";
        const check=doc.createElement("input");check.type="checkbox";
        check.value=gate.id;check.checked=checked.has(gate.id);
        check.addEventListener("change",()=>{
          if(!account)return;
          if(check.checked)checked.add(gate.id);else checked.delete(gate.id);
          redraw();
        });
        const info=doc.createElement("span");info.className="uat-gate-copy";
        const title=doc.createElement("strong");title.textContent=gate.label;
        const detail=doc.createElement("small");detail.textContent=gate.help;
        info.append(title,detail);item.append(check,info);grid.append(item);
      }
      redraw();
    }
    async function timed(promise,ms=15000){
      let timer;
      try{return await Promise.race([promise,new Promise((_,reject)=>{
        timer=win.setTimeout(()=>reject(Error("UAT_TIMEOUT")),ms);
      })]);}
      finally{win.clearTimeout(timer);}
    }
    async function refresh(){
      const n=++serial;
      clear("Đang xác minh tài khoản Admin đang hoạt động…");
      reloadBtn.disabled=true;panel.setAttribute("aria-busy","true");
      try{
        if(win.navigator?.onLine===false)throw Error("UAT_OFFLINE");
        const verified=await timed(authorize(client));
        if(!isCurrent(n))return;
        account=verified;panel.hidden=false;render();
        status.textContent="Đã xác minh phiên Admin. Đây chỉ là bảng khai báo nghiệm thu thủ công.";
      }catch(error){
        if(!isCurrent(n))return;
        clear(error.message==="UAT_FORBIDDEN"
          ?"Không đủ quyền: chỉ Admin đang hoạt động được mở bảng nghiệm thu."
          :error.message==="UAT_TIMEOUT"
          ?"Hết thời gian kiểm tra tài khoản. Thử Làm mới khi có kết nối."
          :"Không xác minh được quyền. Không có dữ liệu nghiệm thu nào được lưu.");
      }finally{if(isCurrent(n)){reloadBtn.disabled=false;panel.setAttribute("aria-busy","false");}}
    }
    exportBtn.addEventListener("click",async()=>{
      if(!account||exportBtn.disabled)return;
      const n=serial,expected=account;
      exportBtn.disabled=true;
      try{
        const now=await timed(authorize(client));
        if(!isCurrent(n))return;
        if(now.id!==expected.id||now.role!==expected.role){
          invalidate("Phiên hoặc quyền đã thay đổi. Dữ liệu khai báo bị xóa.");return;
        }
        const payload=makeEvidence([...checked]);
        const blob=new Blob([JSON.stringify(payload,null,2)+"\n"],{type:"application/json"});
        const href=win.URL.createObjectURL(blob),a=doc.createElement("a");
        a.href=href;a.download="atelier-uat-self-report-NOT-VERIFIED.json";
        a.click();win.setTimeout(()=>win.URL.revokeObjectURL(href),5000);
      }catch{
        if(isCurrent(n))invalidate("Không xác minh lại được quyền xuất. Bảng đã được xóa.");
      }finally{if(isCurrent(n))exportBtn.disabled=!account;}
    });
    reloadBtn.addEventListener("click",refresh);
    client.auth.onAuthStateChange?.(event=>{
      if(event==="SIGNED_OUT")invalidate("Đã đăng xuất: bảng nghiệm thu đã được xóa.");
      else if(["SIGNED_IN","TOKEN_REFRESHED","USER_UPDATED"].includes(event)){
        invalidate("Phiên đã thay đổi. Đang xác minh lại quyền…");
        const n=serial;win.setTimeout(()=>{if(isCurrent(n))refresh();},0);
      }
    });
    win.addEventListener("offline",()=>invalidate("Mất mạng: bảng nghiệm thu đã được xóa."));
    win.addEventListener("online",refresh);
    doc.addEventListener("visibilitychange",()=>{
      if(doc.visibilityState==="hidden")invalidate("Đã ẩn bảng khi rời trang.");
      else refresh();
    });
    win.addEventListener("pagehide",()=>invalidate("Phiên nghiệm thu đã đóng."));
    clear("Đang xác minh quyền Admin…");refresh();
    return {refresh,invalidate};
  }
  return {GATES,isApprovedRole,authorize,makeEvidence,mount};
});
