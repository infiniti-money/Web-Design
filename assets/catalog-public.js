(()=>{"use strict";
let items=[];

const cards=document.getElementById("cards"),search=document.getElementById("search"),style=document.getElementById("style"),sort=document.getElementById("sort"),count=document.getElementById("count");
let category="Tất cả";const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d");
const detail=document.getElementById("catalog-detail"),dialogTitle=document.getElementById("detail-title");
const roomAdvice={
"Phòng khách":"Bố trí lối đi thông thoáng, chọn sofa theo diện tích và sử dụng nhiều lớp ánh sáng.",
"Phòng ngủ":"Ưu tiên sự yên tĩnh, rèm cản sáng, vật liệu dễ vệ sinh và lưu trữ hợp lý.",
"Phòng bếp":"Phân chia khu rửa, sơ chế và nấu; lựa chọn bề mặt chống ẩm, dễ lau chùi.",
"Phòng ăn":"Xác định số ghế, khoảng trống kéo ghế và ánh sáng tại bàn ăn.",
"Phòng làm việc":"Tối ưu công thái học, ánh sáng chống chói và ổ cắm thiết bị.",
"Phòng trẻ em":"Dùng vật liệu an toàn, bo góc và thiết kế thay đổi theo độ tuổi.",
"Phòng tắm":"Quan tâm chống thấm, chống trượt, thoát nước và thông gió.",
"Căn hộ studio":"Tối ưu nội thất đa năng, phân vùng mềm và không gian lưu trữ.",
"Nhà phố":"Cân đối thông gió, ánh sáng tự nhiên và không gian chung từng tầng.",
"Biệt thự":"Đồng bộ ngôn ngữ thiết kế, chất liệu và kết nối trong–ngoài nhà.",
"Sảnh đón":"Tạo điểm nhấn nhận diện, đảm bảo lưu thông và dễ bảo trì.",
"Không gian thương mại":"Tối ưu trải nghiệm khách hàng, nhận diện thương hiệu và vận hành."};
const materialAdvice={
"Gỗ công nghiệp":"Đối chiếu loại cốt gỗ MDF/HDF/plywood, chuẩn phát thải, độ ẩm và lớp phủ.",
"Gỗ tự nhiên":"Kiểm tra nguồn gốc, độ ẩm, xử lý chống cong vênh và bề mặt hoàn thiện.",
"Đá tự nhiên":"Xem mẫu nguyên tấm, vân đá, độ rỗng, chống thấm và phương án thi công.",
"Đá nhân tạo":"Kiểm tra thành phần, khả năng chịu nhiệt, chống ố và đường ghép nối.",
"Gạch ốp lát":"Đối chiếu kích thước thực, độ chống trượt, độ hút nước và lô màu.",
"Sơn hoàn thiện":"Kiểm tra bảng màu dưới ánh sáng thật, độ bền, VOC và quy trình thi công.",
"Lam trang trí":"Đối chiếu vật liệu lõi, khoảng cách nan, liên kết và xử lý cháy.",
"Kính nội thất":"Kiểm tra loại kính an toàn, độ dày, cạnh mài và phụ kiện lắp đặt.",
"Kim loại":"Chọn vật liệu, xử lý chống gỉ và màu sơn/tĩnh điện đúng mẫu.",
"Da và vải bọc":"Xác minh màu, khả năng vệ sinh, độ bền mài mòn và chống phai.",
"Vật liệu tiêu âm":"Kiểm tra chỉ số hấp thụ âm, an toàn cháy và điều kiện lắp đặt.",
"Tấm ốp bề mặt":"Kiểm tra cấu tạo tấm, keo/phụ kiện, khả năng chống ẩm và vệ sinh."};
const equipmentAdvice={
"Đèn thả trần":"Kiểm tra chiều cao treo, nhiệt màu, công suất và nguồn điện.",
"Đèn âm trần":"Kiểm tra kích thước khoét lỗ, góc chiếu, CRI và bảo trì.",
"Thiết bị bếp":"Đối chiếu kích thước chờ, công suất điện, cấp thoát nước và bảo hành.",
"Phụ kiện tủ bếp":"Xác minh tải trọng, kích thước lọt lòng và tương thích bản lề/ray.",
"Thiết bị vệ sinh":"Kiểm tra kích thước, áp lực nước, cấp thoát và điều kiện bảo hành.",
"Khóa cửa thông minh":"Kiểm tra độ dày cửa, loại lõi khóa, nguồn dự phòng và bảo mật.",
"Rèm tự động":"Đo kích thước ô cửa, xác minh động cơ, đường điện và điều khiển.",
"Điều hòa":"Tính tải lạnh theo phòng, đường ống, thoát nước và vị trí bảo trì.",
"Thông gió":"Xác định lưu lượng, độ ồn, kích thước ống và đường thoát.",
"Máy hút mùi":"Đối chiếu lưu lượng, độ ồn, đường thoát và kích thước tủ.",
"Phụ kiện cửa":"Kiểm tra tải trọng, vật liệu, kích thước và tần suất sử dụng.",
"Thiết bị điện thông minh":"Xác minh giao thức kết nối, tương thích mạng, điều khiển cục bộ và bảo mật."};
function addPhoto(host,x){if(x.image_url){const image=document.createElement("img");image.src=x.image_url;image.loading="lazy";image.decoding="async";image.alt="Ảnh mẫu: "+x.name;image.onerror=()=>{image.replaceWith(makePlaceholder(x))};host.append(image)}else host.append(makePlaceholder(x))}
function makePlaceholder(x){const p=document.createElement("div");p.className="no-photo";p.textContent=x.category+" · "+x.name+" — Đang cập nhật ảnh đúng mẫu";return p}
const bookState={pages:[],index:0};
function pagesFor(x){
 const specific=roomAdvice[x.name]||materialAdvice[x.name]||equipmentAdvice[x.name]||"Đối chiếu công năng, kích thước và chất liệu trước khi lựa chọn.";
 const kind=x.category;
 const variants=kind==="Mẫu nội thất"?[
 ["Phương án tối giản","Bố trí gọn gàng, bảng màu trung tính, ưu tiên diện tích sử dụng."],
 ["Phương án tiện nghi","Bổ sung lưu trữ, chiếu sáng nhiều lớp và các điểm nhấn vật liệu."],
 ["Phương án cao cấp","Phối hợp vật liệu, hoàn thiện chi tiết và giải pháp thiết kế riêng."]
 ]:kind==="Vật liệu"?[
 ["Mẫu bề mặt tự nhiên","Tập trung vân, màu, độ tương phản và cảm nhận dưới ánh sáng thực."],
 ["Mẫu bề mặt hiện đại","Ưu tiên đặc tính dễ vệ sinh, phối ghép và độ đồng đều lô hàng."],
 ["Mẫu ứng dụng điểm nhấn","Sử dụng tại mảng trang trí, đồ rời hoặc khu vực có yêu cầu riêng."]
 ]:[
 ["Giải pháp cơ bản","Đáp ứng công năng chính với cấu hình phổ biến và bảo trì thuận tiện."],
 ["Giải pháp tiện nghi","Cân nhắc tính linh hoạt, điều khiển và trải nghiệm sử dụng."],
 ["Giải pháp nâng cao","Xem xét khả năng tích hợp, độ bền và chính sách bảo hành."]
 ];
 return variants.map(([label,description],i)=>({title:x.name+" — "+label,description:description+" "+specific,code:"Mẫu ý tưởng "+String(i+1).padStart(2,"0"),image_url:x.image_url||"",photo_note:x.photo_note||"Ảnh minh họa theo nhóm"}));
}
function renderBook(){
 const x=bookState.pages[bookState.index],el=document.getElementById("book-page");el.replaceChildren();
 const eyebrow=document.createElement("small");eyebrow.textContent=x.code+" · Ý tưởng minh họa, không phải mã sản phẩm";
 const title=document.createElement("h3");title.textContent=x.title;
 const desc=document.createElement("p");desc.textContent=x.description;
 el.append(eyebrow,title);
 if(x.image_url){const img=document.createElement("img");img.src=x.image_url;img.alt="Ảnh tham khảo theo nhóm "+x.title;img.loading="lazy";img.onerror=()=>img.replaceWith(makePlaceholder({name:x.title,category:"Mẫu tham khảo"}));el.append(img)}
 else el.append(makePlaceholder({name:x.title,category:"Mẫu tham khảo"}));
 el.append(desc);if(x.photo_note&&x.image_url){const p=document.createElement("small");p.textContent=x.photo_note;el.append(p)}
 document.getElementById("book-counter").textContent="Trang "+(bookState.index+1)+" / "+bookState.pages.length;
 document.getElementById("book-prev").disabled=bookState.index===0;document.getElementById("book-next").disabled=bookState.index===bookState.pages.length-1;
 el.style.animation="none";void el.offsetWidth;el.style.animation="";
}
function turnBook(delta){const next=bookState.index+delta;if(next<0||next>=bookState.pages.length)return;bookState.index=next;renderBook()}
document.getElementById("book-prev").onclick=()=>turnBook(-1);document.getElementById("book-next").onclick=()=>turnBook(1);
detail.addEventListener("keydown",e=>{if(e.target.closest("input,textarea,select,a"))return;if(e.key==="ArrowRight"){e.preventDefault();turnBook(1)}if(e.key==="ArrowLeft"){e.preventDefault();turnBook(-1)}});
let touchX=null;document.getElementById("book-page").addEventListener("touchstart",e=>{touchX=e.touches[0]?.clientX??null},{passive:true});document.getElementById("book-page").addEventListener("touchend",e=>{if(touchX===null)return;const diff=(e.changedTouches[0]?.clientX??touchX)-touchX;if(Math.abs(diff)>65)turnBook(diff<0?1:-1);touchX=null},{passive:true});
function renderDetail(x){bookState.pages=pagesFor(x);bookState.index=0;renderBook();dialogTitle.textContent=x.name;document.getElementById("detail-category").textContent=x.category+" · "+(x.style||"Đang cập nhật phong cách");document.getElementById("detail-description").textContent=x.desc||"Tham khảo phương án phù hợp với nhu cầu và điều kiện thực tế.";const media=document.getElementById("detail-media");media.replaceChildren();addPhoto(media,x);const tips=document.getElementById("detail-tips");tips.replaceChildren();const specific=roomAdvice[x.name]||materialAdvice[x.name]||equipmentAdvice[x.name];const points=[specific||"Trao đổi với ATELIER HOME về kích thước, chất liệu, vị trí lắp đặt và yêu cầu sử dụng.",x.category==="Mẫu nội thất"?"Khảo sát hiện trạng và dự trù ngân sách trước khi quyết định phương án.":x.category==="Vật liệu"?"Yêu cầu mẫu vật lý và đối chiếu kỹ thuật trước khi đặt hàng.":"Chọn sản phẩm có thông số kỹ thuật và bảo hành được xác nhận.","Ảnh và mô tả tham khảo không thay thế bản vẽ kỹ thuật hoặc báo giá chính thức."];for(const point of points){const li=document.createElement("li");li.textContent=point;tips.append(li)}if(!detail.open)detail.showModal()}
document.getElementById("detail-close").addEventListener("click",()=>detail.close());
detail.addEventListener("click",e=>{if(e.target===detail)detail.close()});

const PAGE_SIZE=12,groups=["Tất cả","Mẫu nội thất","Vật liệu","Thiết bị"],status=document.getElementById("catalog-status"),reload=document.getElementById("catalog-reload"),retry=document.getElementById("catalog-retry");
const previous=document.getElementById("catalog-prev"),next=document.getElementById("catalog-next"),pageLabel=document.getElementById("catalog-page"),share=document.getElementById("catalog-share-url"),shareStatus=document.getElementById("catalog-share-status");
let phase="loading",pageIndex=0,pending=false,currentId=null,suppressClose=false,returnFocusId=null;
const validId=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||"");
function safeImage(value){try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:"";}catch{return "";}}
function setStatus(message,kind="info"){status.textContent=message;status.dataset.state=kind;}
function urlFor(id){const url=new URL(location.href);url.search="";url.hash="";
 if(search.value.trim())url.searchParams.set("q",search.value.trim().slice(0,120));
 if(category!=="Tất cả")url.searchParams.set("group",category);
 if(style.value)url.searchParams.set("style",style.value);
 if(sort.value==="name")url.searchParams.set("sort","name");
 if(pageIndex>0)url.searchParams.set("page",String(pageIndex+1));
 if(id)url.searchParams.set("item",id);
 return url;
}
function writeURL(mode="replace",id=null){history[mode==="push"?"pushState":"replaceState"]({catalogDetail:mode==="push"},"",urlFor(id));}
function restoreFocus(){if(!returnFocusId)return;const target=[...cards.querySelectorAll("[data-item-id]")].find(el=>el.dataset.itemId===returnFocusId);(target||search).focus({preventScroll:true});returnFocusId=null;}
function show(){
 const ready=phase==="ready",q=norm(search.value.trim());
 let filtered=items.filter(x=>(category==="Tất cả"||x.category===category)&&(!style.value||x.style===style.value)&&(!q||norm(x.name+" "+x.category+" "+x.style+" "+x.desc).includes(q)));
 if(sort.value==="name")filtered.sort((a,b)=>a.name.localeCompare(b.name,"vi"));
 pageIndex=Math.min(pageIndex,Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1));cards.replaceChildren();
 const from=pageIndex*PAGE_SIZE,visible=filtered.slice(from,from+PAGE_SIZE);
 for(const x of visible){
  const article=document.createElement("article");article.className="item";
  const link=document.createElement("a");link.href=urlFor(x.id).href;link.dataset.itemId=x.id;addPhoto(link,x);
  const body=document.createElement("div");body.className="content";const tag=document.createElement("div");tag.className="tag";tag.textContent=x.category+" · "+(x.style||"Tham khảo");
  const heading=document.createElement("h3");heading.textContent=x.name;
  const desc=document.createElement("p");desc.textContent=(x.desc||roomAdvice[x.name]||materialAdvice[x.name]||equipmentAdvice[x.name]||"Xem thông tin tham khảo").slice(0,135);
  const more=document.createElement("span");more.className="read";more.textContent="Xem nội dung chi tiết →";body.append(tag,heading,desc,more);link.append(body);
  link.onclick=event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();writeURL("push",x.id);openDetail(x);};article.append(link);cards.append(article);
 }
 count.textContent=ready?(filtered.length?"Hiển thị "+(from+1)+"–"+(from+visible.length)+" / "+filtered.length+" mục phù hợp · "+items.length+" mục công khai đã tải":"Không có mục phù hợp bộ lọc."):"Chưa có danh sách đã xác nhận.";
 document.getElementById("empty").hidden=!ready||filtered.length!==0;previous.disabled=!ready||pageIndex===0;next.disabled=!ready||(pageIndex+1)*PAGE_SIZE>=filtered.length;pageLabel.textContent=ready?"Trang "+(pageIndex+1)+" / "+Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)):"—";restoreFocus();
}
function openDetail(x){currentId=x.id;renderDetail(x);share.value=urlFor(x.id).href;shareStatus.textContent="";}
function applyURL(){
 const params=new URLSearchParams(location.search);search.value=(params.get("q")||"").slice(0,120);category=groups.includes(params.get("group"))?params.get("group"):"Tất cả";
 const selected=(params.get("style")||"").slice(0,80);
 if(selected&&![...style.options].some(option=>option.value===selected)){const option=document.createElement("option");option.value=option.textContent=selected;style.append(option);}style.value=selected;sort.value=params.get("sort")==="name"?"name":"default";
 const requested=Number(params.get("page"));pageIndex=Number.isSafeInteger(requested)&&requested>0?Math.min(requested-1,10000):0;
 document.querySelectorAll("[data-group]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.group===category)));show();
 const id=params.get("item"),item=items.find(x=>x.id===id);
 if(phase==="ready"&&item)openDetail(item);else{
  if(detail.open){returnFocusId=currentId;suppressClose=true;detail.close();}currentId=null;
  if(phase==="ready"&&id)setStatus("Mục trong đường dẫn chưa có trong danh sách công khai hoặc đã được gỡ. Bạn có thể xem các mục khác.","warning");
 }
}
detail.addEventListener("close",()=>{const old=currentId;currentId=null;if(suppressClose){suppressClose=false;restoreFocus();return;}returnFocusId=old;if(new URL(location.href).searchParams.has("item")){if(history.state?.catalogDetail)history.back();else{writeURL();show();}}else restoreFocus();});
window.addEventListener("popstate",applyURL);
function filterChanged(){pageIndex=0;setStatus(phase==="ready"?"":status.textContent,phase==="error"?"error":"info");show();writeURL();}
document.querySelectorAll("[data-group]").forEach(button=>button.onclick=()=>{category=button.dataset.group;document.querySelectorAll("[data-group]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));filterChanged();});
for(const control of [search,style,sort])control.addEventListener(control===search?"input":"change",filterChanged);
document.getElementById("catalog-clear").onclick=()=>{search.value="";style.value="";sort.value="default";category="Tất cả";document.querySelectorAll("[data-group]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.group===category)));filterChanged();search.focus();};
previous.onclick=()=>{if(pageIndex>0){pageIndex--;show();writeURL();cards.scrollIntoView({block:"start"});}};
next.onclick=()=>{if(!next.disabled){pageIndex++;show();writeURL();cards.scrollIntoView({block:"start"});}};
document.getElementById("catalog-copy").onclick=async()=>{try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(share.value);shareStatus.textContent="Đã sao chép đường dẫn mục này.";}catch{share.focus();share.select();shareStatus.textContent="Hãy sao chép đường dẫn đang được chọn.";}};
async function load(){
 if(pending)return;pending=true;phase="loading";items=[];retry.hidden=true;reload.disabled=true;cards.setAttribute("aria-busy","true");setStatus("Đang tải danh sách công khai…");show();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const cfg=window.ATELIER_CONFIG||{},origin=new URL(cfg.supabaseUrl);
  if(origin.protocol!=="https:"||!origin.hostname.endsWith(".supabase.co")||origin.username||origin.password||!String(cfg.supabasePublishableKey||"").startsWith("sb_publishable_"))throw Error("config");
  const data=[],seen=new Set();
  for(let offset=0;offset<5000;offset+=100){
   const url=new URL("/rest/v1/catalog_items",origin);
   for(const [key,value] of Object.entries({select:"id,name,category,style,description,image_url,sort_order,published",published:"eq.true",order:"sort_order.asc,id.asc",limit:"100",offset:String(offset)}))url.searchParams.set(key,value);
   const response=await fetch(url,{headers:{apikey:cfg.supabasePublishableKey},signal:controller.signal});
   if(!response.ok)throw Error("HTTP");const rows=await response.json();if(!Array.isArray(rows)||rows.length>100)throw Error("response");
   for(const row of rows){if(row.published!==true)continue;if(!validId(row.id)||typeof row.name!=="string"||!groups.slice(1).includes(row.category))throw Error("row");if(seen.has(row.id))continue;seen.add(row.id);data.push({id:row.id,name:row.name,category:row.category,style:String(row.style||""),desc:String(row.description||""),image_url:safeImage(row.image_url),photo_note:"Ảnh tham khảo do quản trị viên cung cấp"});}
   if(rows.length<100){items=data;break;}if(offset===4900)throw Error("limit");
  }
  phase="ready";setStatus(items.length?"":"Catalog đang cập nhật, chưa có mục công khai. Bạn có thể liên hệ để trao đổi nhu cầu.");
  const styles=[...new Set(items.map(item=>item.style).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));style.replaceChildren();const all=document.createElement("option");all.value="";all.textContent="Tất cả phong cách";style.append(all);for(const value of styles){const option=document.createElement("option");option.value=option.textContent=value;style.append(option);}applyURL();
 }catch{
  phase="error";items=[];if(detail.open){suppressClose=true;detail.close();currentId=null;}setStatus("Chưa tải được catalog. Danh sách chưa được xác nhận; hãy thử tải lại hoặc liên hệ qua email.","error");retry.hidden=false;show();
 }finally{clearTimeout(timer);pending=false;reload.disabled=false;cards.setAttribute("aria-busy","false");}
}
reload.onclick=retry.onclick=load;applyURL();load();
})();
