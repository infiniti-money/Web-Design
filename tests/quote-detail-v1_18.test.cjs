const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {calculate}=require("../quote-detail.js");
test("Itemized quotation uses per-line VND rounding with discount and VAT",()=>{
 const a=calculate([
  {group:"Vật liệu",name:"Tấm ốp gỗ",unit:"m²",quantity:"2.5",unit_price:"175000"},
  {group:"Thi công",name:"Lắp đặt và hoàn thiện",unit:"công",quantity:"3",unit_price:"320000"}
 ],100000,10);
 assert.equal(a.subtotal,1397500);
 assert.equal(a.vat_amount,129750);
 assert.equal(a.total,1427250);
 assert.equal(a.line_count,2);
});
test("Invalid line items, negative values, excessive prices or discounts are rejected",()=>{
 const item={name:"Tấm gỗ công nghiệp",unit:"m²",quantity:"2",unit_price:"200000"};
 for(const bad of [{...item,quantity:"-1"},{...item,quantity:"0"},{...item,quantity:"0.1234"},{...item,unit_price:"-1"},{...item,unit_price:"1000000000000"},{...item,name:""}]){
  assert.throws(()=>calculate([bad]),/không hợp lệ/);
 }
 assert.throws(()=>calculate([item],999999),/Giảm giá/);
 assert.throws(()=>calculate([item],0,12),/Thuế suất/);
 assert.throws(()=>calculate([]),/1 đến 80/);
});
test("Commercial UI includes detailed editor, version snapshot and verified print controls",()=>{
 const html=fs.readFileSync("commercial.html","utf8");
 const sql=fs.readFileSync("supabase/quotes-detailed-v1_18.sql","utf8");
 const css=fs.readFileSync("quote-detail.css","utf8");
 assert.match(html,/quote-detail\.js/);
 assert.match(html,/quote-detail\.css/);
 assert.match(html,/Chi tiết hạng mục/);
 assert.match(html,/In A4 \/ PDF/);
 assert.match(html,/approved_version_id/);
 assert.match(html,/content,created_at/);
 assert.match(css,/@page\{size:A4 portrait/);
 assert.match(sql,/create or replace function public\.commercial_quote_totals/);
 assert.match(sql,/TOTAL_MISMATCH/);
 assert.match(sql,/v_saved_content:=p_content \|\| v_calculated/);
 assert.match(sql,/revoke all on function public\.commercial_quote_totals/);
 assert.match(sql,/security definer set search_path=''/);
});
