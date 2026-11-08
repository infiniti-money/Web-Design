'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {renderPage}=require('./build-project-pages.cjs');
const fields='id,name,category,style,description,image_url,published,sort_order,updated_at';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const routeFor=id=>'catalog/muc-'+id.toLowerCase()+'/';
async function fetchPublicCatalog(root,fetcher=fetch){
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'app-config.js'),'utf8'),context,{timeout:1000});
 const cfg=context.window.ATELIER_CONFIG;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg?.supabaseUrl)||!/^sb_publishable_/.test(cfg?.supabasePublishableKey))throw Error('Expected publishable catalog configuration');
 const result=[],controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  for(let offset=0;offset<5000;offset+=100){
   const url=new URL('/rest/v1/catalog_items',cfg.supabaseUrl);
   for(const [k,v] of Object.entries({select:fields,published:'eq.true',order:'id.asc',limit:'100',offset:String(offset)}))url.searchParams.set(k,v);
   const response=await fetcher(url,{headers:{apikey:cfg.supabasePublishableKey},signal:controller.signal});
   if(!response.ok)throw Error('Public catalog export unavailable: HTTP '+response.status);
   const rows=await response.json();if(!Array.isArray(rows)||rows.length>100||rows.some(r=>r?.published!==true))throw Error('Invalid public catalog response');
   result.push(...rows.map(row=>Object.fromEntries(fields.split(',').map(k=>[k,row[k]]))));
   if(rows.length<100)return result;
  }
  throw Error('Catalog exceeds safe pagination limit');
 }finally{clearTimeout(timer);}
}
function entries(rows,publication){
 if(!Array.isArray(rows)||publication?.schema!==1||!Array.isArray(publication.items))throw Error('Invalid catalog publication configuration');
 const approvals=new Map();for(const p of publication.items){if(!uuid(p?.id)||approvals.has(p.id.toLowerCase()))throw Error('Invalid or duplicate catalog review ID');approvals.set(p.id.toLowerCase(),p);}
 const seen=new Set();return rows.filter(row=>row?.published===true).map(row=>{
  if(!uuid(row.id)||seen.has(row.id.toLowerCase()))throw Error('Invalid or duplicate catalog ID');const id=row.id.toLowerCase();seen.add(id);
  if(typeof row.name!=='string'||row.name.trim().length<2||row.name.length>140||typeof row.description!=='string'||row.description.length>2000||!['Mẫu nội thất','Vật liệu','Thiết bị'].includes(row.category)||typeof row.style!=='string'||row.style.length>80)throw Error('Invalid published catalog content');
  const approval=approvals.get(id)||{},indexable=approval.contentApproved===true;
  if(indexable&&row.description.trim().length<120)throw Error('Approved catalog content requires a useful description');
  let image=null;
  if(row.image_url&&approval.imageRightsConfirmed===true){
   let url;try{url=new URL(row.image_url);}catch{throw Error('Invalid reviewed catalog image');}
   if(url.protocol!=='https:'||url.username||url.password||!approval.imageAlt?.trim()||!approval.imageCredit?.trim()||!Number.isInteger(approval.imageWidth)||!Number.isInteger(approval.imageHeight)||approval.imageWidth<1||approval.imageHeight<1||approval.imageWidth>10000||approval.imageHeight>10000)throw Error('Incomplete catalog image rights metadata');
   image={src:url.href,alt:approval.imageAlt.trim(),credit:approval.imageCredit.trim(),width:approval.imageWidth,height:approval.imageHeight};
  }
  if(row.updated_at&&!Number.isFinite(Date.parse(row.updated_at)))throw Error('Invalid catalog edit timestamp');
  return{id,name:row.name.trim(),category:row.category,style:row.style,description:row.description.trim(),indexable,image,route:routeFor(id),updated_at:row.updated_at||null,sort_order:Number.isFinite(row.sort_order)?row.sort_order:0};
 }).sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));
}
function buildCatalog({root,output,catalogItems=[],now=Date.now(),publication}={}){
 const site=JSON.parse(fs.readFileSync(path.join(root,'content/site.json'),'utf8'));
 publication=publication||JSON.parse(fs.readFileSync(path.join(root,'content/catalog-publication.json'),'utf8'));
 const items=entries(catalogItems,publication),indexable=items.filter(x=>x.indexable),base=site.baseUrl;
 if(fs.existsSync(path.join(output,'catalog')))throw Error('Catalog output must be fresh');
 const breadcrumb=(name,url)=>({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Trang chủ',item:base},{'@type':'ListItem',position:2,name:'Catalog',item:new URL('catalog/',base).href},...(name?[{'@type':'ListItem',position:3,name,item:url}]:[])]});
 const render=options=>renderPage({site,generatedMarker:'<!-- ATELIER GENERATED CATALOG PAGE -->',...options}).replace('</head>','<link rel="stylesheet" href="'+options.prefix+'assets/catalog-static.css"></head>');
 const media=(x,priority=false)=>x.image?`<figure><img src="${esc(x.image.src)}" alt="${esc(x.image.alt)}" width="${x.image.width}" height="${x.image.height}" loading="${priority?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer"><figcaption>${esc(x.image.credit)}</figcaption></figure>`:'';
 const card=x=>`<article class="card catalog-static-card"><p class="eyebrow">${esc(x.category)}</p><h2><a href="./muc-${x.id}/">${esc(x.name)}</a></h2><p>${esc(x.description.slice(0,180)||'Thông tin tham khảo đang được bổ sung.')}</p>${!x.indexable?'<p class="catalog-review-note">Thông tin tham khảo đang được biên tập và xác minh.</p>':''}</article>`;
 const listingUrl=new URL('catalog/',base).href;
 const outputs=new Map([['catalog/index.html',render({title:'Catalog nội thất và vật liệu | ATELIER HOME',description:'Đọc nội dung catalog nội thất, vật liệu và thiết bị theo từng trang độc lập. Đối chiếu thông tin tham khảo trước khi lựa chọn phương án.',route:'catalog/',prefix:'../',noindex:indexable.length===0,schema:[{'@type':'CollectionPage',url:listingUrl,name:'Catalog nội thất và vật liệu',mainEntity:{'@type':'ItemList',itemListElement:indexable.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.name,url:new URL(x.route,base).href}))}},breadcrumb()],content:`<main id="main"><section class="hero"><div class="wrap hero-copy"><p class="eyebrow">THƯ VIỆN THAM KHẢO</p><h1>Catalog nội thất và vật liệu</h1><p>Mỗi mục có một trang riêng để xem và chia sẻ. Thông tin cần được đối chiếu với mẫu và hồ sơ thực tế trước khi lựa chọn.</p><a class="button" href="../catalog.html">Tìm và lọc catalog</a></div></section><section class="section"><div class="wrap"><p>${items.length} mục công khai trong bản dựng này.</p>${items.length?'<div class="cards">'+items.map(card).join('')+'</div>':'<p>Chưa có mục được công khai. Vui lòng quay lại sau hoặc liên hệ tư vấn.</p>'}<p class="note">Catalog này không phải danh mục hàng tồn kho, báo giá hoặc cam kết cung cấp. Thông tin đang được biên tập và cần đối chiếu với mẫu, hồ sơ thực tế.</p><p><a class="text-link" href="../kien-thuc/ho-so-vat-lieu-noi-that-can-doi-chieu/">Hướng dẫn đối chiếu hồ sơ vật liệu →</a></p></div></section></main>`})]]);
 for(const x of items){
  const url=new URL(x.route,base).href,description=x.description||'Thông tin tham khảo về '+x.name+'. Liên hệ ATELIER HOME để xác minh vật liệu, thông số và phương án trước khi lựa chọn.';
  const schema=[{'@type':'WebPage',url,name:x.name,description,inLanguage:'vi-VN',isPartOf:{'@id':base+'#website'}},breadcrumb(x.name,url)];
  const body=`<main id="main"><nav class="wrap catalog-breadcrumb" aria-label="Breadcrumb"><a href="../../index.html">Trang chủ</a> / <a href="../">Catalog</a> / <span aria-current="page">${esc(x.name)}</span></nav><section class="section"><article class="wrap catalog-static-detail"><p class="eyebrow">${esc(x.category)}${x.style?' · '+esc(x.style):''}</p><h1>${esc(x.name)}</h1>${!x.indexable?'<p class="note">Nội dung tham khảo đang được biên tập và xác minh. Hãy trao đổi với đơn vị tư vấn trước khi chọn mẫu hoặc vật liệu.</p>':''}${media(x,true)}<div class="catalog-description">${description.split(/\r?\n/).filter(Boolean).map(p=>'<p>'+esc(p)+'</p>').join('')}</div><h2>Thông tin cần xác minh trước khi lựa chọn</h2><ul class="list"><li>Mã mẫu, cấu tạo, kích thước và đơn vị cung cấp.</li><li>Màu sắc, bề mặt và mẫu thực tế dưới ánh sáng của không gian.</li><li>Phạm vi thi công, phụ kiện, bảo hành và hồ sơ đi kèm.</li></ul><p class="note">Thông tin không thay thế mẫu được duyệt hoặc thỏa thuận cụ thể. Không có giá bán, tồn kho hoặc đánh giá khách hàng được suy diễn từ catalog.</p><div class="catalog-static-actions"><a class="button" href="../../index.html#contact">Trao đổi nhu cầu tư vấn ↗</a><a class="text-link" href="../../catalog.html?item=${x.id}">Mở bộ lọc và sách mẫu</a><a class="text-link" href="../../kien-thuc/ho-so-vat-lieu-noi-that-can-doi-chieu/">Đọc bảng kiểm hồ sơ vật liệu</a></div></article></section></main>`;
  outputs.set(x.route+'index.html',render({title:x.name+' | Catalog ATELIER HOME',description:description.slice(0,300),route:x.route,prefix:'../../',noindex:!x.indexable,image:x.image,schema,content:body}));
 }
 const source=path.join(output,'catalog.html');let html=fs.readFileSync(source,'utf8');
 if(!html.includes('<div class="catalog-actions">'))throw Error('Catalog enhancement anchor missing');
 html=html.replace('<div class="catalog-actions">','<div class="catalog-actions"><a class="catalog-static-link" href="./catalog/">Xem catalog theo từng trang</a>').replace('</noscript>','<p><a href="./catalog/">Đọc '+items.length+' mục catalog bằng HTML, không cần JavaScript</a>.</p></noscript>');
 for(const [relative,content] of outputs){const target=path.join(output,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
 fs.writeFileSync(source,html);
 const urls=[...(indexable.length?[listingUrl]:[]),...indexable.map(x=>new URL(x.route,base).href)];
 const sitemap=path.join(output,'sitemap.xml');fs.writeFileSync(sitemap,fs.readFileSync(sitemap,'utf8').replace('</urlset>',urls.map(url=>'  <url><loc>'+esc(url)+'</loc></url>').join('\n')+'\n</urlset>'));
 fs.writeFileSync(path.join(output,'catalog-publication.json'),JSON.stringify({schema:1,built_at:new Date(now).toISOString(),items:items.map(x=>({id:x.id,path:x.route,indexable:x.indexable,updated_at:x.updated_at}))},null,2)+'\n');
 return{items:items.length,indexable:indexable.length,pages:outputs.size,urls};
}
module.exports={buildCatalog,fetchPublicCatalog,entries,routeFor};
