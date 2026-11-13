"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {buildPages}=require("../scripts/build-pages.cjs");
const root=path.resolve(__dirname,"..");
const fixture=(extra={})=>({
  slug:"duyet-kiem-tra",title:"Nội dung đã duyệt",
  excerpt:"Mô tả bài đã duyệt phục vụ kiểm thử trạng thái xuất bản CMS.",
  body_markdown:"## Nội dung\n\n"+"Nội dung đã được biên tập. ".repeat(30),
  category:"Hướng dẫn",status:"published",published_at:"2026-01-01T00:00:00Z",
  updated_at:"2026-01-02T00:00:00Z",author_id:"private-should-not-export",...extra
});
function build(posts){
  const output=fs.mkdtempSync(path.join(os.tmpdir(),"atelier-cms-receipt-"));
  buildPages({root,output,cmsPosts:posts});
  return {output,receipt:JSON.parse(fs.readFileSync(path.join(output,"cms-publication.json"),"utf8"))};
}
test("CMS receipt contains only public published slug and exact edit timestamp",()=>{
  const {output,receipt}=build([
    fixture(),fixture({slug:"ban-nhap",status:"draft"}),
    fixture({slug:"da-luu-tru",status:"archived"}),
    fixture({slug:"dang-hen-gio",published_at:"2099-01-01T00:00:00Z",updated_at:null})
  ]);
  assert.deepEqual(receipt,{schema:1,posts:[{slug:"duyet-kiem-tra",updated_at:"2026-01-02T00:00:00Z"}]});
  assert.ok(fs.existsSync(path.join(output,"kien-thuc","duyet-kiem-tra","index.html")));
  const articleHtml=fs.readFileSync(path.join(output,"kien-thuc","duyet-kiem-tra","index.html"),"utf8");
  assert.match(articleHtml,/Cập nhật <time datetime="2026-01-02T00:00:00Z">/);
  assert.match(articleHtml,/dateModified":"2026-01-02T00:00:00Z"/);
  for(const slug of ["ban-nhap","da-luu-tru","dang-hen-gio"])
    assert.ok(!fs.existsSync(path.join(output,"kien-thuc",slug)));
  assert.doesNotMatch(JSON.stringify(receipt),/author_id|private-should-not-export|body_markdown/);
});
test("New build receipt removes unpublished CMS rows and remains empty for local articles",()=>{
  assert.deepEqual(build([]).receipt.posts,[]);
  assert.deepEqual(build([fixture({status:"review"})]).receipt.posts,[]);
});
test("Editor checks the public receipt and fails closed if revision is missing or network fails",()=>{
  const ui=fs.readFileSync(path.join(root,"assets/admin-posts.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"admin-posts.html"),"utf8");
  assert.match(html,/id="post-deploy-state"/);
  assert.match(ui,/fetch\("\.\/cms-publication\.json",\{cache:"no-store"\}\)/);
  assert.match(ui,/row\.slug===post\.slug&&row\.updated_at===post\.updated_at/);
  assert.match(ui,/seq!==deploymentCheck\|\|editing\?\.id!==post\.id/);
  assert.match(ui,/link\.classList\.add\("hide"\)/);
  assert.match(ui,/Không xác minh được bản triển khai/);
});
