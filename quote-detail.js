/* Tân Design v1.18: editable quote line items and safe print preview.
 * Monetary values displayed here are previews. Supabase RPC recomputes all totals.
 */
(function(root){
"use strict";
const number=new Intl.NumberFormat("vi-VN",{maximumFractionDigits:0});
const money=x=>number.format(x)+" ₫";
function calculate(items,discount=0,vatRate=0){
 if(!Array.isArray(items)||items.length<1||items.length>80)throw Error("Báo giá cần từ 1 đến 80 hạng mục.");
 let subtotal=0;
 for(const [i,item] of items.entries()){
  const name=String(item.name||"").trim(),unit=String(item.unit||"").trim(),group=String(item.group||"").trim();
  const qtyText=String(item.quantity??""),priceText=String(item.unit_price??"");
  if(name.length<2||name.length>160||unit.length<1||unit.length>30||group.length>100||
    !/^[0-9]{1,6}(\.[0-9]{1,3})?$/.test(qtyText)||
    !/^(0|[1-9][0-9]{0,11})$/.test(priceText))throw Error("Kiểm tra hạng mục "+(i+1)+": tên, đơn vị, số lượng hoặc đơn giá không hợp lệ.");
  const quantity=Number(qtyText),price=Number(priceText);
  if(quantity<=0||quantity>100000)throw Error("Số lượng không hợp lệ ở hạng mục "+(i+1));
  subtotal+=Math.round(quantity*price);
  if(!Number.isSafeInteger(subtotal)||subtotal>99999999999999)throw Error("Tổng báo giá vượt giới hạn.");
 }
 const d=Number(discount),r=Number(vatRate);
 if(!Number.isSafeInteger(d)||d<0||d>subtotal)throw Error("Giảm giá phải từ 0 đến tổng trước thuế.");
 if(![0,5,8,10].includes(r))throw Error("Thuế suất không hợp lệ.");
 const vatAmount=Math.round((subtotal-d)*r/100),total=subtotal-d+vatAmount;
 if(!Number.isSafeInteger(total)||total>99999999999999)throw Error("Tổng báo giá vượt giới hạn.");
 return{items,subtotal,discount:d,vat_rate:r,vat_amount:vatAmount,total,line_count:items.length};
}
const el=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const field=(label,type,value="",placeholder="")=>{
 const wrap=el("label","detail-field"),input=el(type==="select"?"select":"input");
 wrap.append(el("span","",label),input);
 if(input.tagName==="INPUT"){input.type=type;input.value=String(value);input.placeholder=placeholder;}
 return{wrap,input};
};
function openEditor({title,initial,onSave}){
 if(!document?.body)throw Error("Không thể mở biểu mẫu trên trình duyệt này.");
 document.querySelector("#tan-quote-editor")?.remove();
 const overlay=el("div","tan-modal-backdrop");overlay.id="tan-quote-editor";
 const dialog=el("div","tan-modal");dialog.setAttribute("role","dialog");
 dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label","Chi tiết báo giá");
 const header=el("div","tan-modal-header");
 header.append(el("h2","","Chi tiết hạng mục · "+title));
 const close=el("button","tan-quiet","Đóng");close.type="button";
 header.append(close);dialog.append(header);
 const intro=el("p","tan-hint","Nhập từng hạng mục vật tư hoặc công việc. Hệ thống tự kiểm tra và tính lại tổng tiền khi lưu.");
 dialog.append(intro);
 const rows=el("div","tan-rows");dialog.append(rows);
 const actions=el("div","tan-modal-actions");
 const add=el("button","tan-secondary","+ Thêm hạng mục"),save=el("button","","Lưu phiên bản báo giá");
 add.type="button";save.type="button";actions.append(add,save);
 const taxBox=el("div","tan-cost-summary");
 const discountField=field("Giảm giá (VNĐ)","number",initial?.discount??0);
 const vatField=field("Thuế VAT áp dụng (%)","select");
 for(const rate of [0,5,8,10]){
  const option=el("option","",rate+"%");
  option.value=String(rate);vatField.input.append(option);
 }
 vatField.input.value=String(initial?.vat_rate??0);
 taxBox.append(discountField.wrap,vatField.wrap);
 const total=el("p","tan-grand-total","Tổng: 0 ₫"),status=el("p","tan-validation");
 status.setAttribute("role","status");
 taxBox.append(total,status);dialog.append(taxBox,actions);
 overlay.append(dialog);document.body.append(overlay);
 close.onclick=()=>overlay.remove();
 const onEscape=e=>{if(e.key==="Escape"){overlay.remove();document.removeEventListener("keydown",onEscape)}};
 document.addEventListener("keydown",onEscape);
 const controls=[];
 function addRow(initialRow={}){
  if(controls.length>=80){status.textContent="Tối đa 80 hạng mục.";return;}
  const row=el("div","tan-detail-row");
  const group=field("Nhóm hạng mục","text",initialRow.group||""),
   name=field("Tên hạng mục","text",initialRow.name||"","Ví dụ: Tấm ốp gỗ"),
   unit=field("ĐVT","text",initialRow.unit||"m²"),
   qty=field("Số lượng","number",initialRow.quantity??1),
   price=field("Đơn giá VNĐ","number",initialRow.unit_price??0);
  name.input.maxLength=160;group.input.maxLength=100;unit.input.maxLength=30;
  qty.input.step="0.001";qty.input.min="0.001";price.input.step="1";price.input.min="0";
  const remove=el("button","tan-remove","Xóa");remove.type="button";
  for(const v of [group,name,unit,qty,price])row.append(v.wrap);
  row.append(remove);rows.append(row);
  const control={row,group:group.input,name:name.input,unit:unit.input,qty:qty.input,price:price.input};
  controls.push(control);
  remove.onclick=()=>{row.remove();const i=controls.indexOf(control);if(i>=0)controls.splice(i,1);recalc()};
  for(const v of [group,name,unit,qty,price])v.input.addEventListener("input",recalc);
  recalc();
 }
 const payload=()=>controls.map(c=>({group:c.group.value.trim(),name:c.name.value.trim(),unit:c.unit.value.trim(),quantity:c.qty.value,unit_price:c.price.value}));
 function recalc(){
  try{const result=calculate(payload(),discountField.input.value,vatField.input.value);
   total.textContent="Tạm tính "+money(result.subtotal)+" · VAT "+money(result.vat_amount)+" · Tổng "+money(result.total);
   status.textContent="";
   return result;
  }catch(error){status.textContent=error.message;total.textContent="Chưa đủ thông tin để tính tổng";return null}
 }
 add.onclick=()=>addRow();
 for(const v of [discountField,vatField])v.input.addEventListener("input",recalc);
 const initialItems=Array.isArray(initial?.items)&&initial.items.length?initial.items:[{group:"Nội thất",name:"",unit:"m²",quantity:1,unit_price:0}];
 for(const r of initialItems)addRow(r);
 recalc();
 save.onclick=async()=>{
  const calculated=recalc();if(!calculated)return;
  save.disabled=true;
  try{await onSave({...calculated,description:String(initial?.description||"").slice(0,1000)});overlay.remove();}
  catch(error){status.textContent=error.message||"Không thể lưu báo giá";}
  finally{save.disabled=false}
 };
 nameFocus();
 function nameFocus(){const input=controls[0]?.name;if(input)input.focus()}
}
function appendRow(parent,label,value,cls=""){
 const row=el("div","tan-print-pair "+cls);
 row.append(el("span","",label),el("strong","",value));parent.append(row);
}
function printQuote({quote,version,customer}){
 if(!quote||!version)return;
 document.querySelector("#tan-print-sheet")?.remove();
 const sheet=el("section","tan-print-sheet");sheet.id="tan-print-sheet";
 sheet.setAttribute("aria-label","Báo giá Tân Design");
 const head=el("header","tan-print-head");
 const brand=el("div");
 brand.append(el("div","tan-print-brand","TÂN DESIGN"),el("div","","Thiết kế và thi công nội thất"));
 const address=el("div","tan-print-contact");
 address.append(el("div","","Tân Phú, Việt Yên, Hưng Yên"),el("div","","infinitimoney@icloud.com"));
 head.append(brand,address);sheet.append(head);
 sheet.append(el("h1","tan-print-title","BÁO GIÁ NỘI THẤT"));
 const approved=["approved","sent","accepted"].includes(quote.status);
 sheet.append(el("p","tan-print-state",approved?"BÁO GIÁ ĐÃ DUYỆT":"BẢN NHÁP / CHƯA PHÊ DUYỆT"));
 const meta=el("section","tan-print-meta");
 appendRow(meta,"Mã báo giá","BG-"+String(quote.id).slice(0,8).toUpperCase());
 appendRow(meta,"Phiên bản","V"+version.version_no);
 appendRow(meta,"Khách hàng",customer?.full_name||"Khách hàng");
 appendRow(meta,"Ngày lập",new Date(version.created_at||Date.now()).toLocaleDateString("vi-VN"));
 sheet.append(meta,el("h2","","NỘI DUNG BÁO GIÁ"),el("p","",quote.title));
 const content=version.content||{};
 const table=el("table","tan-print-table");
 const thead=el("thead"),hdr=el("tr");
 for(const t of ["STT","Hạng mục / Vật tư","ĐVT","SL","Đơn giá (₫)","Thành tiền (₫)"])hdr.append(el("th","",t));
 thead.append(hdr);table.append(thead);
 const tbody=el("tbody");
 if(Array.isArray(content.items)&&content.items.length){
  for(const [i,item] of content.items.entries()){
   const tr=el("tr");const value=Math.round(Number(item.quantity)*Number(item.unit_price));
   for(const valueText of [i+1,(item.group?item.group+" · ":"")+item.name,item.unit,item.quantity,number.format(Number(item.unit_price)),number.format(value)])tr.append(el("td","",valueText));
   tbody.append(tr);
  }
 }else{
  const tr=el("tr");
  for(const v of ["1",content.description||"Nội dung báo giá tổng hợp","Gói",1,number.format(Number(version.total_amount)),number.format(Number(version.total_amount))])tr.append(el("td","",v));
  tbody.append(tr);
 }
 table.append(tbody);sheet.append(table);
 const totals=el("div","tan-print-totals");
 const subtotal=content.subtotal??version.total_amount;
 appendRow(totals,"Tạm tính",money(Number(subtotal)));
 if(Number(content.discount)>0)appendRow(totals,"Giảm giá","−"+money(Number(content.discount)));
 if(Number(content.vat_amount)>0)appendRow(totals,"VAT "+Number(content.vat_rate)+"%",money(Number(content.vat_amount)));
 appendRow(totals,"TỔNG THANH TOÁN",money(Number(version.total_amount)),"tan-final");
 sheet.append(totals,el("p","tan-print-note","Báo giá tham khảo theo phiên bản đã lưu. Điều kiện thi công và thời hạn hiệu lực cần được thống nhất với khách hàng."));
 sheet.append(el("p","tan-print-sign","Đại diện Tân Design                         Khách hàng xác nhận"));
 document.body.append(sheet);
 window.print();
}
root.TAN_QUOTE={calculate,openEditor,printQuote};
if(typeof module!=="undefined"&&module.exports)module.exports={calculate};
})(typeof window!=="undefined"?window:globalThis);
