/* ATELIER HOME / shared Web + Windows advanced reporting.
 * Display filtering is only a convenience; Supabase RLS enforces real permissions.
 * No business data is stored in localStorage, logged, or sent to third parties.
 */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AtelierAdvancedReports=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const LIMIT=500, TIMEOUT=15000;
  const allowedRoles=new Set(["admin","manager"]);
  const normalize=value=>String(value??"").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase().trim();
  const done=row=>!!(row.completed_at||row.status==="completed");
  const overdue=(row,now=Date.now())=>!done(row)&&!!row.due_at&&Date.parse(row.due_at)<now;
  const csvCell=value=>{
    const str=String(value??"").replace(/\u0000/g,"");
    // Spreadsheet engines can interpret a cell as a formula even after whitespace.
    const safe=/^[\u0001-\u0020\u00a0\u1680\u2000-\u200f\u2028\u2029\u202f\u205f\u3000\ufeff]*[=+\-@]/u.test(str)?"'"+str:str;
    return '"'+safe.replace(/"/g,'""')+'"';
  };
  const serializeCsv=rows=>"\ufeff"+[
    ["Tên công việc","Trạng thái","Ngày tạo","Ngày hạn"],
    ...rows.map(r=>[r.title,r.status,r.created_at,r.due_at])
  ].map(row=>row.map(csvCell).join(",")).join("\r\n");

  function filterRows(rows,{search="",status="all",now=Date.now()}={}){
    const q=normalize(search);
    return rows.filter(r=>{
      if(q&&!normalize(r.title).includes(q))return false;
      if(status==="late")return overdue(r,now);
      if(status==="completed")return done(r);
      if(status==="active")return !done(r)&&!overdue(r,now);
      return true;
    });
  }
  function summary(rows,now=Date.now()){
    return {
      total:rows.length,
      completed:rows.filter(done).length,
      late:rows.filter(r=>overdue(r,now)).length,
      active:rows.filter(r=>!done(r)&&!overdue(r,now)).length
    };
  }
  const cancelled=signal=>{if(signal?.aborted)throw Error("REPORT_CANCELLED");};
  async function authorize(client,signal){
    cancelled(signal);
    const auth=await client.auth.getUser();
    cancelled(signal);
    const user=auth?.data?.user;
    if(auth?.error||!user?.id||!allowedRoles.has(user.app_metadata?.role))
      throw Error("REPORT_FORBIDDEN");
    const response=await client.from("staff_profiles").select("role,active")
      .eq("user_id",user.id).single();
    cancelled(signal);
    const profile=response?.data;
    if(response?.error||!profile?.active||!allowedRoles.has(profile.role)
      ||profile.role!==user.app_metadata.role)throw Error("REPORT_FORBIDDEN");
    return {id:user.id,role:profile.role};
  }
  async function loadSnapshot(client,{days=7,signal,timeoutMs=TIMEOUT}={}){
    if(days!==7&&days!==30)throw Error("REPORT_PERIOD_INVALID");
    cancelled(signal);
    const controller=new AbortController();
    let timeout,abortExternal;
    const timeoutPromise=new Promise((_,reject)=>{
      timeout=setTimeout(()=>{controller.abort();reject(Error("REPORT_TIMEOUT"));},timeoutMs);
    });
    const abortPromise=new Promise((_,reject)=>{
      abortExternal=()=>{controller.abort();reject(Error("REPORT_CANCELLED"));};
      if(signal){signal.addEventListener("abort",abortExternal,{once:true});
        if(signal.aborted)abortExternal();}
    });
    const work=(async()=>{
      const before=await authorize(client,controller.signal);
      const since=new Date(Date.now()-days*86400000).toISOString();
      let query=client.from("inquiry_care_tasks")
        .select("id,title,status,due_at,completed_at,created_at,assignee_user_id")
        .gte("created_at",since).order("created_at",{ascending:false});
      if(typeof query.abortSignal==="function")query=query.abortSignal(controller.signal);
      const result=await query.limit(LIMIT);
      cancelled(controller.signal);
      if(result?.error||!Array.isArray(result?.data))throw Error("REPORT_READ_FAILED");
      const after=await authorize(client,controller.signal);
      cancelled(controller.signal);
      if(before.id!==after.id||before.role!==after.role)throw Error("REPORT_AUTH_CHANGED");
      return {account:after,rows:result.data,truncated:result.data.length===LIMIT,
        loadedAt:new Date().toISOString()};
    })();
    try{return await Promise.race([work,timeoutPromise,abortPromise]);}
    finally{clearTimeout(timeout);signal?.removeEventListener("abort",abortExternal);}
  }

  function mount(doc,win){
    const el=id=>doc.getElementById(id),status=el("notice"),report=el("report");
    const exportButton=el("export"),refreshButton=el("report-refresh");
    const config=win.ATELIER_CONFIG;
    if(!config?.supabaseUrl||!config?.supabasePublishableKey||!win.supabase?.createClient){
      status.textContent="Chưa kết nối được hệ thống quản trị.";return null;
    }
    const client=win.supabase.createClient(config.supabaseUrl,
      config.supabasePublishableKey,win.ATELIER_CLIENT_OPTIONS||{});
    let serial=0,controller=null,account=null,rows=[],filtered=[],truncated=false;
    let loadedAt=null,exportBusy=false;
    function hide(message){
      account=null;rows=[];filtered=[];truncated=false;loadedAt=null;
      report.hidden=true;report.setAttribute("aria-busy","false");
      exportButton.disabled=true;
      for(const id of ["total","done","late"])el(id).textContent="–";
      el("rows").replaceChildren();el("bars").replaceChildren();
      status.textContent=message;
    }
    function invalidate(message){
      ++serial;controller?.abort();controller=null;
      refreshButton.disabled=false;exportBusy=false;hide(message);
    }
    function show(){
      if(!account)return;
      const now=Date.now();
      filtered=filterRows(rows,{search:el("report-search").value,
        status:el("report-status").value,now});
      const values=summary(filtered,now);
      el("total").textContent=String(values.total);
      el("done").textContent=String(values.completed);
      el("late").textContent=String(values.late);
      const bars=el("bars");bars.replaceChildren();
      for(const [label,value] of [["Hoàn thành",values.completed],
        ["Quá hạn",values.late],["Đang xử lý",values.active]]){
        const p=doc.createElement("p");p.textContent=label+" — "+value;
        const bar=doc.createElement("div");bar.className="bar";
        bar.style.width=(values.total?100*value/values.total:0)+"%";
        bars.append(p,bar);
      }
      const body=el("rows");body.replaceChildren();
      for(const row of filtered){
        const tr=doc.createElement("tr");
        for(const value of [row.title||"—",row.status||"—",
          row.created_at?new Date(row.created_at).toLocaleDateString("vi-VN"):"—",
          row.due_at?new Date(row.due_at).toLocaleDateString("vi-VN"):"—"]){
          const td=doc.createElement("td");td.textContent=value;tr.append(td);
        }
        body.append(tr);
      }
      exportButton.disabled=exportBusy||truncated||!filtered.length;
      status.textContent="Báo cáo theo quyền "+(account.role==="admin"?"Admin":"Quản lý")
        +" · "+filtered.length+" / "+rows.length+" công việc đã tải"
        +(truncated?" · Chạm giới hạn 500 dòng: thu hẹp kỳ lọc trước khi xuất CSV.":"")
        +" · Cập nhật "+new Date(loadedAt).toLocaleString("vi-VN")+".";
    }
    async function refresh(){
      const version=++serial;controller?.abort();
      controller=new AbortController();
      hide("Đang xác minh quyền và tải báo cáo…");
      refreshButton.disabled=true;report.setAttribute("aria-busy","true");
      try{
        if(win.navigator?.onLine===false)throw Error("REPORT_OFFLINE");
        const days=el("period").value==="week"?7:30;
        const snapshot=await loadSnapshot(client,{days,signal:controller.signal});
        if(version!==serial)return;
        account=snapshot.account;rows=snapshot.rows;
        truncated=snapshot.truncated;loadedAt=snapshot.loadedAt;
        report.hidden=false;show();
      }catch(error){
        if(version!==serial)return;
        hide(error.message==="REPORT_FORBIDDEN"||error.message==="REPORT_AUTH_CHANGED"
          ?"Tài khoản không được phép xem báo cáo hoặc quyền vừa thay đổi."
          :error.message==="REPORT_TIMEOUT"
          ?"Hết thời gian chờ báo cáo. Dữ liệu cũ đã được xóa; thử Làm mới."
          :"Không thể xác minh báo cáo. Dữ liệu cũ đã được xóa; thử lại khi có mạng.");
      }finally{
        if(version===serial){
          refreshButton.disabled=false;report.setAttribute("aria-busy","false");
        }
      }
    }
    el("report-status").addEventListener("change",show);
    el("report-search").addEventListener("input",show);
    el("period").addEventListener("change",refresh);
    refreshButton.addEventListener("click",refresh);
    exportButton.addEventListener("click",async()=>{
      if(!account||exportButton.disabled||truncated||!filtered.length)return;
      const version=serial,expected=account;
      exportBusy=true;exportButton.disabled=true;
      try{
        const auth=await Promise.race([
          authorize(client),
          new Promise((_,reject)=>win.setTimeout(()=>reject(Error("REPORT_TIMEOUT")),TIMEOUT))
        ]);
        if(serial!==version)return;
        if(auth.id!==expected.id||auth.role!==expected.role){
          invalidate("Quyền truy cập vừa thay đổi. Hãy tải lại báo cáo.");return;
        }
        const blob=new Blob([serializeCsv(filtered)],{type:"text/csv;charset=utf-8"});
        const url=win.URL.createObjectURL(blob);
        const a=doc.createElement("a");a.href=url;a.download="atelier-home-bao-cao.csv";
        a.click();win.setTimeout(()=>win.URL.revokeObjectURL(url),5000);
      }catch{
        if(serial===version)invalidate("Không thể xác minh phiên để xuất CSV; dữ liệu đã được ẩn.");
      }finally{
        if(serial===version){exportBusy=false;show();}
      }
    });
    client.auth.onAuthStateChange?.((event)=>{
      if(event==="SIGNED_OUT"){
        invalidate("Đã đăng xuất. Báo cáo và dữ liệu xuất đã được xóa.");
      }else if(["SIGNED_IN","TOKEN_REFRESHED","USER_UPDATED"].includes(event)){
        invalidate("Phiên vừa thay đổi. Đang xác minh lại quyền…");
        const version=serial;
        win.setTimeout(()=>{if(version===serial)refresh();},0);
      }
    });
    win.addEventListener("offline",()=>invalidate("Mất kết nối. Dữ liệu báo cáo đã được ẩn."));
    win.addEventListener("online",refresh);
    doc.addEventListener("visibilitychange",()=>{
      if(doc.visibilityState==="hidden")invalidate("Báo cáo đã ẩn để bảo vệ phiên.");
      else refresh();
    });
    win.addEventListener("pagehide",()=>invalidate("Phiên báo cáo đã đóng."));
    hide("Đang kiểm tra quyền truy cập…");
    refresh();
    return {refresh,invalidate};
  }
  return {LIMIT,normalize,filterRows,summary,csvCell,serializeCsv,authorize,loadSnapshot,mount};
});