const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {buildPages}=require("../scripts/build-pages.cjs"),{markdown,fetchPublicPosts}=require("../scripts/build-knowledge.cjs");
const root=path.resolve(__dirname,".."),temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),"atelier-knowledge-"));
const post=(overrides={})=>({slug:"bai-da-duyet",title:"Nội dung đã duyệt",excerpt:"Mô tả bài đã xuất bản để kiểm tra trang HTML công khai.",category:"Hướng dẫn",body_markdown:"## Nội dung gốc\n\n"+"Thông tin đã duyệt. ".repeat(30),status:"published",published_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-02T00:00:00Z",...overrides});
test("Published knowledge has server-rendered content, canonical schema and sitemap without JavaScript",()=>{
  const output=temp(),result=buildPages({output,cmsPosts:[post()]});assert.equal(result.knowledge.articles,4);
  const html=fs.readFileSync(path.join(output,"kien-thuc/bai-da-duyet/index.html"),"utf8"),index=fs.readFileSync(path.join(output,"kien-thuc.html"),"utf8"),sitemap=fs.readFileSync(path.join(output,"sitemap.xml"),"utf8");
  assert.match(html,/Thông tin đã duyệt/);assert.match(html,/"@type":"Article"/);assert.match(html,/"@type":"BreadcrumbList"/);assert.match(html,/rel="canonical" href="https:\/\/infiniti-money.github.io\/Web-Design\/kien-thuc\/bai-da-duyet\/"/);
  assert.doesNotMatch(html,/noindex|script src=/);assert.match(index,/bai-da-duyet\//);assert.match(sitemap,/kien-thuc\/bai-da-duyet\//);assert.equal((html.match(/<h1>/g)||[]).length,1);
});
test("Drafts, archived and future posts are absent; a fresh deploy removes unpublished pages",()=>{
  const output=temp();buildPages({output,cmsPosts:[post({status:"draft",slug:"ban-nhap"}),post({status:"archived",slug:"da-go"}),post({published_at:"2099-01-01T00:00:00Z",updated_at:null,slug:"hen-gio"})]});
  for(const slug of ["ban-nhap","da-go","hen-gio","bai-da-duyet"]){assert.equal(fs.existsSync(path.join(output,"kien-thuc",slug)),false);assert.ok(!fs.readFileSync(path.join(output,"sitemap.xml"),"utf8").includes(slug));}
});
test("Markdown blocks active HTML and unsafe links while preserving formatting and a single page H1",()=>{
  const html=markdown('# Heading\n\n**Bold** [safe](https://example.org) [unsafe](javascript:alert%281%29)\n\n<script>alert(1)</script>\n\n![tracking](https://example.org/a.png)');
  assert.match(html,/<h2>Heading/);assert.match(html,/<strong>Bold/);assert.match(html,/href="https:\/\/example.org\//);assert.doesNotMatch(html,/<script|<img|href="javascript:|<h1/);assert.match(html,/&lt;script&gt;/);
});
test("Traversal, unsafe cover URLs and duplicate source slugs stop the build",()=>{
  for(const value of [post({slug:"../admin"}),post({cover_image_url:"javascript:alert(1)",image_alt:"x"}),post({slug:"chuan-bi-brief-thiet-ke-noi-that"})])assert.throws(()=>buildPages({output:temp(),cmsPosts:[value]}),/Invalid|conflicts/);
  assert.throws(()=>buildPages({output:temp(),cmsPosts:[post({body_markdown:"short"})]}),/length/);
});
test("CMS export uses public fields only, paginates and fails closed on API errors",async()=>{
  const requests=[];const rows=await fetchPublicPosts(root,async(url,options)=>{requests.push({url,options});return{ok:true,json:async()=>requests.length===1?Array.from({length:100},(_,i)=>({...post({slug:"article-"+i}),author_id:"PRIVATE"})):[]};});
  assert.equal(requests.length,2);assert.equal(rows.length,100);assert.equal(Object.hasOwn(rows[0],"author_id"),false);assert.equal(requests[1].url.searchParams.get("offset"),"100");assert.equal(requests[0].url.searchParams.get("status"),"eq.published");assert.equal(Object.hasOwn(requests[0].options.headers,"Authorization"),false);
  assert.doesNotMatch(requests[0].url.searchParams.get("select"),/author|rights|version/);
  await assert.rejects(fetchPublicPosts(root,async()=>({ok:false,status:503})),/503/);
});
