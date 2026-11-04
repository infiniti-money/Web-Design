/* Shared administration navigation; database authorization remains in Supabase RLS. */
(() => {
  "use strict";
  const tabs = [["overview","Tổng quan","admin"],["projects","Dự án","admin"],["inquiries","Khách hàng","admin"],["tasks","Công việc nhóm","manager"],["my-tasks","Công việc của tôi","employee"],["reports","Báo cáo","manager"],["staff","Nhân sự & tài khoản","admin"]];
  const modules = [["admin-posts.html","Bài viết","manager"],["admin-catalog.html","Catalog & vật liệu","admin"],["commercial.html","Báo giá & hợp đồng","manager"],["notifications.html","Thông báo nội bộ","employee"]];
  const level = { admin:3, manager:2, employee:1 };
  const roleNames = { admin:"Quản trị viên", manager:"Quản lý", employee:"Nhân viên" };
  const rootAdmin = !!document.getElementById("dashboard");
  const cfg = window.ATELIER_CONFIG;
  const normalize=value=>String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d").trim();
  const preferences={read(key){try{return localStorage.getItem("atelier-workspace-"+key);}catch{return null;}},write(key,value){try{localStorage.setItem("atelier-workspace-"+key,value);}catch{/* Preferences are optional. */}}};
  let sidebar, topbar, mask, command, settings, tabHome, user, client, updateCleanup, networkCleanup;
  const node = (tag, text, cls) => { const el=document.createElement(tag); if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el; };
  const icon = (key="overview") => {
    const paths={overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',projects:'<path d="M3 21V6l9-3 9 3v15M8 8v2m8-2v2M8 14v2m8-2v2M10 21v-3h4v3"/>',inquiries:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m4 10v-3a6 6 0 0 0-3-5"/>',tasks:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 3h6v4H9zm-2 9 2 2 4-4m-6 8h10"/>',reports:'<path d="M4 3v17h17M8 16v-5m5 5V6m5 10V9"/>',staff:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',posts:'<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8m-8 4h6"/>',catalog:'<path d="m12 3 9 5-9 5-9-5zm-9 9 9 5 9-5m-18 5 9 5 9-5"/>',commercial:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18m-12 5h3m4 0h2"/>',notifications:'<path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8m3 11a3 3 0 0 0 6 0"/>'};
    const span=node("span",undefined,"workspace-icon");span.setAttribute("aria-hidden","true");span.innerHTML='<svg viewBox="0 0 24 24">'+(paths[key]||paths.tasks)+'</svg>';return span;
  };
  const moduleKey=file=>({"admin-posts.html":"posts","admin-catalog.html":"catalog","commercial.html":"commercial","notifications.html":"notifications"}[file]);
  const currentFile = () => location.pathname.split("/").pop() || "admin.html";
  function setDrawer(open){
    const mobile=matchMedia("(max-width:760px)").matches;
    document.body.classList.toggle("workspace-drawer-open",open&&mobile);
    if(sidebar)sidebar.inert=mobile&&!open;
    document.querySelector(".workspace-menu")?.setAttribute("aria-expanded",String(open&&mobile));
    if(open&&mobile)sidebar.querySelector("button:not(.hide),a")?.focus();
  }
  function clear(){
    if(tabHome&&sidebar?.querySelector(".tabs"))tabHome.before(sidebar.querySelector(".tabs"));
    for(const el of [sidebar,topbar,mask,command,settings])el?.remove();
    updateCleanup?.();updateCleanup=null;
    networkCleanup?.();networkCleanup=null;
    document.body.classList.remove("workspace-ready","workspace-drawer-open");user=null;
  }
  function navigate(href){
    setDrawer(false);
    const url=new URL(href,location.href);
    if(rootAdmin&&url.pathname.endsWith("/admin.html")&&url.hash){document.querySelector(`#tab-${url.hash.slice(1)}`)?.click();return;}
    location.href=url.href;
  }
  function makeDialog(title){
    const dialog=node("dialog",undefined,"workspace-dialog");const head=node("header");head.append(node("h2",title));const close=node("button","✕");close.type="button";close.setAttribute("aria-label","Đóng");close.onclick=()=>dialog.close();head.append(close);dialog.append(head);document.body.append(dialog);return dialog;
  }
  function build(profile){
    clear();user=profile;
    document.body.classList.add("workspace-ready");
    document.body.classList.toggle("workspace-compact",preferences.read("density")==="compact");
    document.body.classList.toggle("workspace-collapsed",preferences.read("sidebar")==="collapsed");
    sidebar=node("aside",undefined,"workspace-sidebar");sidebar.setAttribute("aria-label","Điều hướng quản trị");
    const logo=node("a","ATELIER", "workspace-logo");logo.href="./admin.html";logo.append(node("small","HOME · MANAGER"));sidebar.append(logo,node("p","Không gian làm việc","workspace-group"));
    const links=[];
    const rootTabs=document.querySelector("#dashboard .tabs");
    if(rootTabs){
      if(!tabHome){tabHome=document.createComment("workspace tabs home");rootTabs.before(tabHome);}
      rootTabs.setAttribute("aria-orientation","vertical");
      for(const button of rootTabs.querySelectorAll(".tab")){const label=button.textContent;button.title=label;if(!button.querySelector(".workspace-icon")){button.textContent="";button.append(icon(button.id.slice(4)),node("span",label,"workspace-nav-label"));}links.push([`./admin.html#${button.id.slice(4)}`,label]);}
      sidebar.append(rootTabs);
      rootTabs.onkeydown=event=>{if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;const buttons=[...rootTabs.querySelectorAll(".tab:not(.hide)")];let index=buttons.indexOf(document.activeElement);index=event.key==="Home"?0:event.key==="End"?buttons.length-1:(index+(event.key==="ArrowDown"?1:-1)+buttons.length)%buttons.length;event.preventDefault();buttons[index]?.focus();buttons[index]?.click();};
    }else{
      for(const [id,label,min] of tabs){if(level[profile.role]<level[min])continue;const a=node("a",undefined,"workspace-link");a.href=`./admin.html#${id}`;a.title=label;a.append(icon(id),node("span",label,"workspace-nav-label"));sidebar.append(a);links.push([a.getAttribute("href"),label]);}
    }
    sidebar.append(node("p","Website & kinh doanh","workspace-group"));
    for(const [file,label,min] of modules){if(level[profile.role]<level[min])continue;const a=node("a",undefined,"workspace-link");a.href="./"+file;a.title=label;a.append(icon(moduleKey(file)),node("span",label,"workspace-nav-label"));if(currentFile()===file)a.setAttribute("aria-current","page");sidebar.append(a);links.push(["./"+file,label]);}
    const collapse=node("button","Thu gọn menu","workspace-collapse");collapse.type="button";collapse.title="Thu gọn / mở rộng menu";collapse.setAttribute("aria-label",collapse.title);const syncCollapse=()=>{const compact=document.body.classList.contains("workspace-collapsed");collapse.textContent=compact?"»":"« Thu gọn menu";collapse.setAttribute("aria-expanded",String(!compact));};collapse.onclick=()=>{document.body.classList.toggle("workspace-collapsed");preferences.write("sidebar",document.body.classList.contains("workspace-collapsed")?"collapsed":"expanded");syncCollapse();};syncCollapse();sidebar.append(collapse);
    const footer=node("div",undefined,"workspace-user");footer.append(node("span",profile.name||profile.email,"workspace-user-name"),node("p",roleNames[profile.role],"workspace-user-role"));const logout=node("button","Đăng xuất");logout.type="button";logout.onclick=async()=>{if(rootAdmin)document.getElementById("logout").click();else{await client.auth.signOut();location.href="./admin.html";}};footer.append(logout);sidebar.append(footer);document.body.append(sidebar);
    mask=node("button",undefined,"workspace-mask");mask.type="button";mask.setAttribute("aria-label","Đóng menu quản trị");mask.onclick=()=>setDrawer(false);document.body.append(mask);
    topbar=node("header",undefined,"workspace-topbar");const menu=node("button","☰","workspace-menu");menu.type="button";menu.setAttribute("aria-label","Mở menu quản trị");menu.setAttribute("aria-expanded","false");menu.onclick=()=>setDrawer(!document.body.classList.contains("workspace-drawer-open"));topbar.append(menu,node("span","ATELIER HOME / Quản lý","workspace-location"));const actions=node("div",undefined,"workspace-top-actions");const search=node("button",undefined,"workspace-search");search.type="button";search.append(document.createTextNode("Đi đến chức năng…"),node("kbd","Ctrl K"));search.onclick=()=>command.showModal();const connection=node("span",undefined,"workspace-connection");const online=()=>{connection.textContent=navigator.onLine?"Trực tuyến":"Mất kết nối";connection.classList.toggle("offline",!navigator.onLine);};online();window.addEventListener("online",online);window.addEventListener("offline",online);networkCleanup=()=>{window.removeEventListener("online",online);window.removeEventListener("offline",online);};const prefs=node("button","Ứng dụng","workspace-settings-button");prefs.type="button";prefs.onclick=()=>settings.showModal();actions.append(search,connection,prefs);topbar.append(actions);document.body.append(topbar);
    command=makeDialog("Đi đến chức năng");const input=node("input");input.type="search";input.placeholder="Tìm dự án, bài viết, nhân sự…";input.setAttribute("aria-label","Tìm chức năng");command.append(input);const choices=node("div",undefined,"workspace-command-links");command.append(choices);
    let commandIndex=0;
    const selectCommand=index=>{const items=[...choices.querySelectorAll("a")];commandIndex=items.length?(index+items.length)%items.length:0;items.forEach((a,i)=>a.classList.toggle("workspace-command-active",i===commandIndex));items[commandIndex]?.scrollIntoView({block:"nearest"});};
    const render=()=>{choices.replaceChildren();for(const [href,label] of links){const tab=href.includes("#")?document.getElementById("tab-"+href.split("#")[1]):null;if(tab?.classList.contains("hide")||!normalize(label).includes(normalize(input.value)))continue;const a=node("a",label);a.href=href;a.onclick=e=>{e.preventDefault();command.close();navigate(href);};choices.append(a);}if(!choices.children.length)choices.append(node("p","Không có chức năng phù hợp.","workspace-empty"));selectCommand(0);};input.oninput=render;input.onkeydown=e=>{if(["ArrowDown","ArrowUp"].includes(e.key)){e.preventDefault();selectCommand(commandIndex+(e.key==="ArrowDown"?1:-1));}if(e.key==="Enter"){e.preventDefault();choices.querySelectorAll("a")[commandIndex]?.click();}};command.append(node("p","↑ ↓ Chọn chức năng · Enter Mở · Esc Đóng","workspace-command-hint"));render();
    settings=makeDialog("Ứng dụng & tài khoản");settings.append(node("p",`${profile.name||profile.email} · ${roleNames[profile.role]}`));const update=node("section",undefined,"workspace-update");update.append(node("strong",window.atelierDesktop?"ATELIER HOME Manager":"Phiên bản trình duyệt"));const status=node("p","Bạn đang sử dụng giao diện quản trị web.");status.setAttribute("role","status");const progress=node("progress");progress.max=100;progress.hidden=true;update.append(status,progress);
    if(window.atelierDesktop){
      const check=node("button","Kiểm tra cập nhật","btn ghost"),install=node("button","Cài đặt và khởi động lại","btn");check.type=install.type="button";install.hidden=true;check.onclick=async()=>{try{await window.atelierDesktop.checkForUpdates();}catch{status.textContent="Chưa kiểm tra được cập nhật. Thử lại sau.";}};install.onclick=()=>window.atelierDesktop.installUpdate();update.append(check,install);
      const show=state=>{status.textContent=`Phiên bản ${state.currentVersion} · ${state.message}`;progress.hidden=state.status!=="downloading";progress.value=state.progress||0;install.hidden=state.status!=="downloaded";check.disabled=["checking","downloading"].includes(state.status);};window.atelierDesktop.getUpdateState().then(show);updateCleanup=window.atelierDesktop.onUpdateState(show);
    }else{const site=node("a","Xem website công khai ↗","text-link");site.href="https://infiniti-money.github.io/Web-Design/";site.target="_blank";site.rel="noopener noreferrer";update.append(site);}
    settings.append(update);setDrawer(false);
    const appearance=node("section",undefined,"workspace-update");appearance.append(node("strong","Cách hiển thị"),node("p","Chọn khoảng cách phù hợp với màn hình làm việc của bạn."));const density=node("button",undefined,"btn ghost");density.type="button";const syncDensity=()=>{const compact=document.body.classList.contains("workspace-compact");density.textContent=compact?"Mật độ: Gọn":"Mật độ: Thoáng";density.setAttribute("aria-pressed",String(compact));};density.onclick=()=>{document.body.classList.toggle("workspace-compact");preferences.write("density",document.body.classList.contains("workspace-compact")?"compact":"comfortable");syncDensity();};syncDensity();appearance.append(density);settings.append(appearance);
    const current=rootAdmin?tabs.find(tab=>document.getElementById("tab-"+tab[0])?.getAttribute("aria-selected")==="true")?.[1]:modules.find(module=>module[0]===currentFile())?.[1];topbar.querySelector(".workspace-location").textContent="ATELIER HOME / "+(current||"Không gian làm việc");
    const main=document.querySelector("body>main");if(main&&!document.querySelector(".workspace-skip")){main.id=main.id||"workspace-main";main.tabIndex=-1;const skip=node("a","Đến nội dung chính","workspace-skip");skip.href="#"+main.id;skip.onclick=event=>{event.preventDefault();main.focus();};document.body.prepend(skip);}
  }
  window.addEventListener("atelier:session",event=>{if(event.detail)build(event.detail);else clear();});
  window.addEventListener("atelier:tabchange",event=>{const locationLabel=document.querySelector(".workspace-location");if(locationLabel)locationLabel.textContent="ATELIER HOME / "+(tabs.find(t=>t[0]===event.detail)?.[1]||"Quản lý");setDrawer(false);});
  document.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"&&user){event.preventDefault();command.showModal();}if(event.key==="Escape")setDrawer(false);if(event.key==="Tab"&&document.body.classList.contains("workspace-drawer-open")){const focusable=[...sidebar.querySelectorAll('a,button:not(.hide)')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  matchMedia("(max-width:760px)").addEventListener("change",()=>setDrawer(false));
  if(window.atelierDesktop)document.getElementById("google-login")?.setAttribute("hidden","");
  if(!rootAdmin&&cfg&&window.supabase?.createClient){
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,window.ATELIER_CLIENT_OPTIONS||{});
    (async()=>{try{const {data:{user:account},error}=await client.auth.getUser();if(error||!account)return;const {data:profile,error:profileError}=await client.from("staff_profiles").select("role,active,full_name").eq("user_id",account.id).single();if(profileError||!profile?.active||profile.role!==account.app_metadata?.role||!level[profile.role])return;build({role:profile.role,name:profile.full_name,email:account.email});}catch{/* Page retains its own authentication/error state. */}})();
  }
})();
