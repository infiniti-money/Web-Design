/* Read-only operations hub. Database authority stays with Supabase Auth/RLS. */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root.document?.getElementById("ops-refresh"))api.mount(root);
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const roles=new Set(["admin","manager"]);
  const definitions=[
    {id:"tasks-overdue",table:"inquiry_care_tasks",type:"overdue"},
    {id:"tasks-next",table:"inquiry_care_tasks",type:"next"},
    {id:"quotes-review",table:"customer_quotes",type:"quoted"},
    {id:"posts-review",table:"cms_posts",type:"posts"},
    {id:"staff-active",table:"staff_profiles",type:"staff",adminOnly:true}
  ];
  const roleName={admin:"Quản trị viên",manager:"Quản lý"};
  async function authorize(client,signal){
    try{
      const auth=await client.auth.getUser();
      const user=auth?.data?.user,role=user?.app_metadata?.role;
      if(signal?.aborted||auth?.error||!user?.id||!roles.has(role))return null;
      let query=client.from("staff_profiles").select("role,active,full_name").eq("user_id",user.id);
      if(signal)query=query.abortSignal(signal);
      const {data:profile,error}=await query.single();
      if(error||!profile?.active||profile.role!==role)return null;
      return {id:user.id,role,name:profile.full_name||roleName[role]};
    }catch{return null;}
  }
  async function oneCount(client,spec,now,next,signal){
    try{
      let request=client.from(spec.table).select("id",{count:"exact",head:true});
      if(spec.type==="overdue")request=request.in("status",["todo","in_progress"]).lt("due_at",now);
      else if(spec.type==="next")request=request.in("status",["todo","in_progress"]).gte("due_at",now).lt("due_at",next);
      else if(spec.type==="quoted")request=request.eq("status","submitted");
      else if(spec.type==="posts")request=request.eq("status","review");
      else if(spec.type==="staff")request=request.eq("active",true);
      if(signal)request=request.abortSignal(signal);
      const result=await request;
      return result?.error||!Number.isSafeInteger(result?.count)||result.count<0
        ?{ok:false,count:null}:{ok:true,count:result.count};
    }catch{return {ok:false,count:null};}
  }
  async function readCounts(client,role,at=new Date(),signal){
    if(!roles.has(role))throw new Error("FORBIDDEN_OPERATIONS_VIEW");
    const now=at.toISOString(),next=new Date(at.getTime()+7*86400000).toISOString();
    const visible=definitions.filter(item=>!item.adminOnly||role==="admin");
    const results=await Promise.all(visible.map(spec=>oneCount(client,spec,now,next,signal)));
    return Object.fromEntries(visible.map((item,i)=>[item.id,results[i]]));
  }
  async function loadSnapshot(client,{signal,timeoutMs=15000}={}){
    const controller=new AbortController();let timer,abort;
    const stopped=new Promise((_,reject)=>{
      abort=()=>{controller.abort();reject(new Error("SNAPSHOT_CANCELLED"));};
      if(signal?.aborted)abort();else signal?.addEventListener("abort",abort,{once:true});
      timer=setTimeout(()=>{controller.abort();reject(new Error("SNAPSHOT_TIMEOUT"));},timeoutMs);
    });
    const work=(async()=>{
      if(controller.signal.aborted)throw new Error("SNAPSHOT_CANCELLED");
      const account=await authorize(client,controller.signal);
      if(!account)throw new Error("FORBIDDEN_OPERATIONS_VIEW");
      const snapshot=await readCounts(client,account.role,new Date(),controller.signal);
      if(controller.signal.aborted)throw new Error("SNAPSHOT_CANCELLED");
      const current=await authorize(client,controller.signal);
      if(!current||current.id!==account.id||current.role!==account.role)throw new Error("AUTHORIZATION_CHANGED");
      return{account:current,snapshot};
    })();
    try{return await Promise.race([work,stopped]);}
    finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);controller.abort();}
  }
  function mount(win){
    const doc=win.document,byId=id=>doc.getElementById(id),button=byId("ops-refresh"),status=byId("ops-status"),app=byId("ops-app");
    const cfg=win.ATELIER_CONFIG;
    if(!cfg?.supabaseUrl||!cfg?.supabasePublishableKey||!win.supabase?.createClient){
      status.textContent="Chưa kết nối được hệ thống xác thực. Kiểm tra cấu hình và kết nối mạng.";
      status.className="ops-status error";
      button.disabled=true;
      return;
    }
    const client=win.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,win.ATELIER_CLIENT_OPTIONS||{});
    let requestId=0,activeRequest;
    const clear=()=>{
      app.hidden=true;
      byId("ops-staff-card").hidden=true;
      byId("ops-role-scope").textContent="";
      for(const item of definitions){byId("ops-"+item.id).textContent="–";byId("ops-"+item.id+"-state").textContent="Chưa tải";}
    };
    const deny=(message)=>{
      clear();
      status.className="ops-status error";
      status.textContent=message;
    };
    async function refresh(){
      const token=++requestId;
      activeRequest?.abort();
      activeRequest=new AbortController();
      clear();
      app.setAttribute("aria-busy","true");
      button.disabled=true;
      status.className="ops-status";
      status.textContent="Đang xác minh tài khoản và tải số liệu theo quyền truy cập…";
      try{
        if(win.navigator?.onLine===false)throw new Error("OFFLINE");
        const {account,snapshot}=await loadSnapshot(client,{signal:activeRequest.signal});
        if(token!==requestId)return;
        const errors=Object.values(snapshot).filter(item=>!item.ok).length;
        for(const item of definitions){
          const counter=byId("ops-"+item.id),note=byId("ops-"+item.id+"-state"),value=snapshot[item.id];
          if(!counter||!note)continue;
          counter.textContent=value?.ok?new Intl.NumberFormat("vi-VN").format(value.count):"–";
          note.textContent=value?.ok?"Đã truy vấn theo quyền":(item.adminOnly&&account.role!=="admin"?"Không áp dụng":"Không tải được dữ liệu");
          note.classList.toggle("ops-error",!value?.ok&&(!item.adminOnly||account.role==="admin"));
        }
        byId("ops-staff-card").hidden=account.role!=="admin";
        byId("ops-role-scope").textContent="Phiên đang dùng: "+account.name+" · "+roleName[account.role]+".";
        app.hidden=false;
        status.className=errors?"ops-status warning":"ops-status";
        status.textContent=(errors?"Có "+errors+" nhóm số liệu chưa tải được; dấu “–” không có nghĩa là 0. ":"Đã tải tất cả nhóm số liệu có quyền xem. ")+
          "Thời điểm: "+new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",dateStyle:"short",timeStyle:"short"}).format(new Date())+".";
      }catch(error){
        if(token===requestId)deny(error.message==="FORBIDDEN_OPERATIONS_VIEW"||error.message==="AUTHORIZATION_CHANGED"
          ?"Không có quyền xem trung tâm vận hành hoặc tài khoản vừa thay đổi. Đăng nhập với tài khoản Admin hoặc Quản lý đang hoạt động."
          :error.message==="SNAPSHOT_TIMEOUT"?"Hết thời gian chờ tải số liệu. Dữ liệu chưa được xác nhận; bấm Làm mới để thử lại."
          :"Không thể tải trung tâm vận hành. Dữ liệu chưa được xác nhận; kiểm tra kết nối rồi thử lại.");
      }finally{
        if(token===requestId){button.disabled=false;app.setAttribute("aria-busy","false");}
      }
    }
    button.addEventListener("click",refresh);
    client.auth.onAuthStateChange?.((event)=>{
      if(event==="SIGNED_OUT"){
        requestId++;
        activeRequest?.abort();
        app.setAttribute("aria-busy","false");
        button.disabled=false;
        deny("Đã đăng xuất. Đăng nhập lại để tiếp tục.");
        win.dispatchEvent?.(new CustomEvent("atelier:session",{detail:null}));
      }else if(["SIGNED_IN","TOKEN_REFRESHED","USER_UPDATED"].includes(event)){
        // Leave the synchronous Auth callback before invoking Supabase again.
        const token=++requestId;activeRequest?.abort();clear();
        status.textContent="Tài khoản vừa thay đổi. Đang xác minh lại quyền…";
        win.setTimeout(()=>{if(token===requestId)refresh();},0);
      }
    });
    win.addEventListener("offline",()=>{requestId++;activeRequest?.abort();button.disabled=false;app.setAttribute("aria-busy","false");deny("Mất kết nối. Số liệu đã được ẩn; kết nối lại rồi bấm Làm mới.");});
    win.addEventListener("online",refresh);
    refresh();
  }
  return {authorize,readCounts,loadSnapshot,mount};
});
