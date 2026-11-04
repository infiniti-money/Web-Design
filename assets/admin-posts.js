(() => {
  "use strict";
  const $=id=>document.getElementById(id), cfg=window.ATELIER_CONFIG;
  let db,user,role,editing=null,dirty=false,pending=false,page=0,total=0,request=0,openRequest=0,slugTouched=false;
  const pageSize=25,statusNames={draft:"Bản nháp",review:"Chờ duyệt",published:"Đã xuất bản / lên lịch",archived:"Lưu trữ"};
  const status=(text,error=false)=>{$("cms-status").textContent=text;$("cms-status").classList.toggle("error",error);};
  const slugify=value=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100);
  const fields={title:"post-title",slug:"post-slug",excerpt:"post-excerpt",body_markdown:"post-body",category:"post-category",cover_image_url:"post-cover",image_alt:"post-alt",seo_title:"post-seo-title",seo_description:"post-seo-description",status:"post-status"};
  function setDirty(value){dirty=value;$("post-save-state").textContent=value?"Có thay đổi chưa lưu":editing?"Đã lưu · phiên bản "+editing.version:"Chưa lưu";}
  function lockEditor(locked){$("post-form").querySelectorAll("input,select,textarea,button").forEach(control=>control.disabled=locked);$("post-new").disabled=locked;document.querySelectorAll(".cms-post,#post-history button").forEach(control=>control.disabled=locked);$("post-history-load").disabled=locked||!editing;}
  function canLeave(){return !dirty||confirm("Nội dung chưa lưu. Rời khỏi bản chỉnh sửa này?");}
  function preview(show){$("post-edit-area").classList.toggle("hide",show);$("post-preview").classList.toggle("hide",!show);$("post-preview-tab").setAttribute("aria-pressed",String(show));$("post-edit-tab").setAttribute("aria-pressed",String(!show));if(show)window.AtelierMarkdown.render($("post-preview"),$("post-body").value);}
  function fill(post,restored=false){
    for(const [key,id] of Object.entries(fields))$(id).value=post[key]??(key==="category"?"Kinh nghiệm":key==="status"?"draft":"");
    $("post-image-rights").checked=!!post.image_rights_confirmed;
    const date=post.published_at?new Date(post.published_at):null;
    $("post-published-at").value=date&&!Number.isNaN(date.getTime())?new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16):"";
    $("post-editor-title").textContent=editing?"Chỉnh sửa bài viết":"Bài viết mới";$("post-history-load").disabled=!editing;
    $("post-view-live").classList.toggle("hide",post.status!=="published");$("post-view-live").href="https://infiniti-money.github.io/Web-Design/bai-viet.html?slug="+encodeURIComponent(post.slug||"");
    $("post-history").replaceChildren();slugTouched=!!post.slug;preview(false);setDirty(restored);
  }
  function fresh(){if(pending||!canLeave())return;++openRequest;editing=null;fill({status:"draft",category:"Kinh nghiệm"});$("post-title").focus();}
  async function open(id){
    if(pending||!canLeave())return;const seq=++openRequest;status("Đang tải bài viết…");
    try{const {data,error}=await db.from("cms_posts").select("*").eq("id",id).single();if(seq!==openRequest||pending)return;if(error||!data)throw error||new Error();editing=data;fill(data);status("Đã mở bài viết. Các thay đổi chỉ được ghi khi bấm Lưu.");document.querySelectorAll(".cms-post").forEach(card=>card.classList.toggle("active",card.dataset.id===id));}catch{if(seq===openRequest)status("Không mở được bài viết. Kiểm tra kết nối hoặc quyền truy cập.",true);}
  }
  async function list(){
    const seq=++request;$("post-reload").disabled=true;
    try{
      let query=db.from("cms_posts").select("id,title,status,version,updated_at,published_at",{count:"exact"});
      if(role==="manager")query=query.eq("author_id",user.id).in("status",["draft","review"]);
      if($("post-filter").value!=="all")query=query.eq("status",$("post-filter").value);
      const term=$("post-search").value.trim().replace(/[\\%_]/g,"\\$&");if(term)query=query.ilike("title","%"+term+"%");
      const {data,error,count}=await query.order("updated_at",{ascending:false}).range(page*pageSize,(page+1)*pageSize-1);
      if(seq!==request)return;if(error)throw error;total=count||0;
      const target=$("post-list");target.replaceChildren();for(const post of data||[]){const card=document.createElement("button");card.type="button";card.className="cms-post"+(editing?.id===post.id?" active":"");card.dataset.id=post.id;card.disabled=pending;const title=document.createElement("strong");title.textContent=post.title;const info=document.createElement("small");info.textContent="Phiên bản "+post.version+" · "+new Date(post.updated_at).toLocaleString("vi-VN");const badge=document.createElement("span");badge.className="badge";badge.textContent=statusNames[post.status];card.append(title,info,badge);card.onclick=()=>open(post.id);target.append(card);}
      if(!data?.length){const empty=document.createElement("p");empty.className="workspace-empty";empty.textContent="Chưa có bài viết phù hợp. Bắt đầu bằng một bản nháp mới.";target.append(empty);}
      $("post-count").textContent=total+" bài viết phù hợp";$("post-page").textContent="Trang "+(page+1)+" / "+Math.max(1,Math.ceil(total/pageSize));$("post-prev").disabled=page===0;$("post-next").disabled=(page+1)*pageSize>=total;
    }catch{if(seq===request)status("Không tải được danh sách bài viết. Thử làm mới khi kết nối ổn định.",true);}finally{if(seq===request)$("post-reload").disabled=false;}
  }
  async function save(event){
    event.preventDefault();if(pending||!$("post-form").reportValidity())return;
    const payload=Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,$(id).value.trim()]));payload.image_rights_confirmed=$("post-image-rights").checked;
    if(payload.cover_image_url){try{const imageUrl=new URL(payload.cover_image_url);if(imageUrl.protocol!=="https:"||imageUrl.username||imageUrl.password||/[\s<>"']/.test(payload.cover_image_url))throw new Error();}catch{status("Ảnh đại diện cần URL HTTPS công khai hợp lệ.",true);return;}}
    if(role==="admin"){const value=$("post-published-at").value;payload.published_at=value?new Date(value).toISOString():null;}
    if(payload.status==="published"&&(payload.excerpt.length<40||payload.body_markdown.length<80)){status("Khi xuất bản, cần mô tả ngắn ít nhất 40 ký tự và nội dung ít nhất 80 ký tự.",true);return;}
    if(payload.status==="published"&&payload.cover_image_url&&(!payload.image_rights_confirmed||!payload.image_alt)){status("Hãy bổ sung mô tả ảnh và xác nhận quyền sử dụng trước khi xuất bản.",true);return;}
    pending=true;++openRequest;lockEditor(true);status("Đang lưu bài viết…");
    try{const query=editing?db.from("cms_posts").update(payload).eq("id",editing.id).eq("version",editing.version).select().maybeSingle():db.from("cms_posts").insert(payload).select().single();const {data,error}=await query;if(error)throw error;if(!data){status("Bài viết đã được người khác thay đổi. Nội dung của bạn vẫn còn trong trình soạn thảo; tải lại bản mới trước khi lưu.",true);return;}editing=data;fill(data);status("Đã lưu bài viết · "+statusNames[data.status]+" · phiên bản "+data.version);await list();}
    catch(error){status(error?.code==="23505"?"Slug này đã được sử dụng. Chọn đường dẫn khác.":error?.code==="42501"?"Tài khoản không có quyền thực hiện thay đổi này.":"Chưa lưu được bài viết. Nội dung vẫn còn; kiểm tra kết nối và thử lại.",true);}
    finally{pending=false;lockEditor(false);}
  }
  async function history(){
    if(pending||!editing)return;const id=editing.id;status("Đang tải lịch sử…");
    try{const {data,error}=await db.from("cms_post_revisions").select("version,created_at,snapshot").eq("post_id",id).order("version",{ascending:false}).limit(30);if(error)throw error;if(editing?.id!==id)return;const target=$("post-history");target.replaceChildren();for(const revision of data||[]){const button=document.createElement("button");button.type="button";button.textContent="Dùng nội dung phiên bản "+revision.version+" · "+new Date(revision.created_at).toLocaleString("vi-VN");button.onclick=()=>{if(!canLeave())return;fill({...revision.snapshot,status:"draft",published_at:null},true);status("Đã đưa nội dung phiên bản cũ vào bản nháp. Bấm Lưu để tạo phiên bản mới.");};target.append(button);}status("Hiển thị tối đa 30 phiên bản gần nhất.");}catch{status("Không tải được lịch sử bài viết.",true);}
  }
  $("post-form").addEventListener("submit",save);$("post-form").addEventListener("input",()=>setDirty(true));$("post-new").onclick=fresh;$("post-reload").onclick=list;$("post-history-load").onclick=history;$("post-edit-tab").onclick=()=>preview(false);$("post-preview-tab").onclick=()=>preview(true);
  $("post-title").oninput=()=>{if(!slugTouched)$("post-slug").value=slugify($("post-title").value);};$("post-slug").oninput=()=>slugTouched=true;
  let searchTimer;$("post-search").oninput=()=>{clearTimeout(searchTimer);page=0;searchTimer=setTimeout(list,300);};$("post-filter").onchange=()=>{page=0;list();};$("post-prev").onclick=()=>{if(page>0){page--;list();}};$("post-next").onclick=()=>{if((page+1)*pageSize<total){page++;list();}};
  document.querySelectorAll("[data-format]").forEach(button=>button.onclick=()=>{const textarea=$("post-body"),start=textarea.selectionStart,end=textarea.selectionEnd,selected=textarea.value.slice(start,end)||"Nội dung",format=button.dataset.format;const text=format==="heading"?"\n## "+selected+"\n":format==="bold"?"**"+selected+"**":format==="list"?"\n- "+selected+"\n":"["+selected+"](https://)";textarea.setRangeText(text,start,end,"end");textarea.focus();setDirty(true);});
  window.addEventListener("beforeunload",event=>{if(dirty||pending){event.preventDefault();event.returnValue="";}});
  document.addEventListener("click",event=>{const link=event.target.closest("a[href]");if(link&&link.target!=="_blank"&&!link.getAttribute("href").startsWith("#")){if(pending){event.preventDefault();status("Đang lưu bài viết. Vui lòng chờ thao tác hoàn tất.");}else if(dirty){if(!canLeave())event.preventDefault();else setDirty(false);}}},true);
  (async()=>{try{if(!cfg||!window.supabase?.createClient)throw new Error();db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,window.ATELIER_CLIENT_OPTIONS||{});const auth=await db.auth.getUser();user=auth.data?.user;if(auth.error||!user){status("Bạn cần đăng nhập tại Trung tâm quản lý.",true);return;}const {data:profile,error}=await db.from("staff_profiles").select("role,active").eq("user_id",user.id).single();role=profile?.role;if(error||!profile?.active||role!==user.app_metadata?.role||!["admin","manager"].includes(role)){status("Tài khoản không có quyền quản lý bài viết.",true);return;}if(role==="manager"){document.querySelectorAll('#post-status option[value="published"],#post-status option[value="archived"],#post-filter option[value="published"],#post-filter option[value="archived"]').forEach(option=>option.remove());$("post-schedule-field").classList.add("hide");}$("post-role-note").textContent=role==="admin"?"Admin có thể xuất bản, lên lịch, lưu trữ và xem lịch sử mọi bài viết.":"Bạn có thể soạn và chỉnh sửa bài nháp của mình. Gửi chờ duyệt để Admin xuất bản.";$("cms-app").classList.remove("hide");$("post-new").disabled=false;fill({status:"draft",category:"Kinh nghiệm"});await list();status("Sẵn sàng quản lý nội dung.");}catch{status("Không kết nối được hệ thống. Kiểm tra mạng và tải lại trang.",true);}})();
})();
