const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildPages}=require('../scripts/build-pages.cjs'),{fetchPublicCatalog}=require('../scripts/build-catalog.cjs');
const root=path.resolve(__dirname,'..'),id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'atelier-catalog-html-'));
const row=(patch={})=>({id,name:'Mẫu vật liệu kiểm thử',category:'Vật liệu',style:'Hiện đại',description:'Thông tin tham khảo đã được đối chiếu với hồ sơ và mẫu vật liệu. '.repeat(3),image_url:'https://images.example.invalid/sample.webp',published:true,sort_order:0,updated_at:'2026-11-07T00:00:00Z',...patch});
test('Published catalog has stable standalone HTML, keeps legacy links and excludes unreviewed content from sitemap',()=>{
 const output=temp(),result=buildPages({output,catalogItems:[row(),row({id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',published:false})]});
 const route='catalog/muc-'+id+'/index.html',html=fs.readFileSync(path.join(output,route),'utf8');
 assert.equal(result.catalog.items,1);assert.equal(result.catalog.indexable,0);assert.match(html,/noindex,follow/);assert.match(html,/Mẫu vật liệu kiểm thử/);assert.match(html,/"@type":"BreadcrumbList"/);assert.match(html,/catalog\.html\?item=aaaaaaaa/);assert.doesNotMatch(html,/<img|"@type":"Product"|Offer|aggregateRating/);assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(!fs.readFileSync(path.join(output,'sitemap.xml'),'utf8').includes('catalog/muc-'));
 const index=fs.readFileSync(path.join(output,'catalog.html'),'utf8');assert.match(index,/href="\.\/catalog\/"/);assert.match(index,/<noscript>[\s\S]*Đọc 1 mục catalog/);
 assert.equal(fs.existsSync(path.join(output,'catalog/muc-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),false);
 const second=temp();buildPages({output:second,catalogItems:[row({name:'Tên đã đổi'})]});assert.ok(fs.existsSync(path.join(second,route)),'renaming must not change permalink');
});
test('Reviewed content and image rights independently control indexing and image export',()=>{
 const {buildCatalog}=require('../scripts/build-catalog.cjs'),output=temp();buildPages({output});
 const separate=temp();fs.writeFileSync(path.join(separate,'sitemap.xml'),'<urlset></urlset>');fs.copyFileSync(path.join(root,'catalog.html'),path.join(separate,'catalog.html'));
 const result=buildCatalog({root,output:separate,catalogItems:[row()],publication:{schema:1,items:[{id,contentApproved:true,imageRightsConfirmed:true,imageAlt:'Mẫu vật liệu',imageCredit:'Chủ sở hữu đã xác nhận',imageWidth:960,imageHeight:600}]}});
 const html=fs.readFileSync(path.join(separate,'catalog/muc-'+id+'/index.html'),'utf8');assert.equal(result.indexable,1);assert.doesNotMatch(html,/noindex/);assert.match(html,/<img[^>]+width="960"/);assert.match(html,/Chủ sở hữu đã xác nhận/);assert.match(fs.readFileSync(path.join(separate,'sitemap.xml'),'utf8'),/catalog\/muc-aaaaaaaa/);
});
test('Catalog text is escaped and unsafe IDs, duplicate IDs and incomplete image approvals stop generation',()=>{
 const output=temp();buildPages({output,catalogItems:[row({name:'<script>alert(1)</script>',description:'<img src=x onerror=alert(1)>'})]});const html=fs.readFileSync(path.join(output,'catalog/muc-'+id+'/index.html'),'utf8');assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert|<img src=x/);
 for(const rows of [[row({id:'../../admin'})],[row(),row()]])assert.throws(()=>buildPages({output:temp(),catalogItems:rows}),/catalog ID/);
 const {entries}=require('../scripts/build-catalog.cjs');assert.throws(()=>entries([row()],{schema:1,items:[{id,imageRightsConfirmed:true}]}),/rights metadata/);assert.throws(()=>entries([row({description:'short'})],{schema:1,items:[{id,contentApproved:true}]}),/useful description/);
});
test('Fresh deployments remove unpublished catalog routes and export only public publication fields',()=>{
 const output=temp();buildPages({output,catalogItems:[row({private_note:'DO_NOT_EXPORT',supplier_secret:'DO_NOT_EXPORT'})]});
 const manifest=fs.readFileSync(path.join(output,'catalog-publication.json'),'utf8');assert.doesNotMatch(manifest,/DO_NOT_EXPORT|description|image_url/);
 const empty=temp();buildPages({output:empty,catalogItems:[]});assert.equal(fs.existsSync(path.join(empty,'catalog/muc-'+id)),false);assert.match(fs.readFileSync(path.join(empty,'catalog/index.html'),'utf8'),/noindex/);
});
test('Public catalog exporter paginates with anonymous publishable credentials and fails closed',async()=>{
 const requests=[];const rows=await fetchPublicCatalog(root,async(url,options)=>{requests.push({url:new URL(url),options});return Response.json(requests.length===1?Array.from({length:100},(_,i)=>row({id:i.toString(16).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa',private_note:'SECRET'})):[]);});
 assert.equal(rows.length,100);assert.equal(requests[1].url.searchParams.get('offset'),'100');assert.equal(requests[0].url.searchParams.get('published'),'eq.true');assert.equal(Object.keys(requests[0].options.headers).join(','),'apikey');assert.ok(!JSON.stringify(rows).includes('SECRET'));
 await assert.rejects(fetchPublicCatalog(root,async()=>Response.json({}, {status:503})),/HTTP 503/);
 await assert.rejects(fetchPublicCatalog(root,async()=>Response.json([row({published:false})])),/Invalid public/);
});
