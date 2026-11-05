"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {Marked}=require("../assets/vendor/marked.umd.js");
const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const json=value=>JSON.stringify(value).replace(/</g,"\\u003c");
function safeLink(value){try{const u=new URL(value);return ["https:","mailto:"].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function markdown(body){
  const parser=new Marked({renderer:{
    html({text}){return escape(text);},
    heading({tokens,depth}){const level=Math.min(6,Math.max(2,depth));return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;},
    link({href,tokens}){const label=this.parser.parseInline(tokens),url=safeLink(href);return url?`<a href="${escape(url)}" rel="noopener noreferrer">${label}</a>`:label;},
    image({text}){return escape(text);}
  }});return parser.parse(body);
}
function visiblePosts(posts,now){
  if(!Array.isArray(posts))throw Error("Expected articles array");
  return posts.filter(post=>post.status==="published"&&Number.isFinite(Date.parse(post.published_at))&&Date.parse(post.published_at)<=now);
}
function validate(post){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug||"")||post.slug.length>100)throw Error("Invalid article slug");
  for(const key of ["title","excerpt","body_markdown","category"]){if(typeof post[key]!=="string"||!post[key].trim())throw Error("Missing article "+key);}
  if(post.body_markdown.length<300||post.body_markdown.length>200000)throw Error("Article body length invalid");
  if(post.cover_image_url&&(!safeLink(post.cover_image_url)?.startsWith("https:")||!post.image_alt?.trim()))throw Error("Invalid article cover");
  if(post.updated_at&&(!Number.isFinite(Date.parse(post.updated_at))||Date.parse(post.updated_at)<Date.parse(post.published_at)))throw Error("Invalid updated date");
}
const fields="slug,title,excerpt,body_markdown,category,cover_image_url,image_alt,seo_title,seo_description,published_at,updated_at,status";
async function fetchPublicPosts(root,fetcher=fetch,now=new Date().toISOString()){
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,"app-config.js"),"utf8"),context,{timeout:1000});
  const cfg=context.window.ATELIER_CONFIG;
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl)||!/^sb_publishable_/.test(cfg.supabasePublishableKey))throw Error("Expected public CMS configuration");
  const posts=[];
  for(let offset=0;offset<10000;offset+=100){
    const url=new URL(cfg.supabaseUrl+"/rest/v1/cms_posts");
    for(const [key,value] of Object.entries({select:fields,status:"eq.published",published_at:"lte."+now,order:"slug.asc",limit:"100",offset:String(offset)}))url.searchParams.set(key,value);
    const response=await fetcher(url,{headers:{apikey:cfg.supabasePublishableKey},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error("Public CMS export unavailable: HTTP "+response.status);
    const rows=await response.json();if(!Array.isArray(rows))throw Error("Invalid CMS response");
    // Project only public fields even if an upstream response unexpectedly adds columns.
    posts.push(...rows.map(row=>Object.fromEntries(fields.split(",").map(key=>[key,row[key]]))));
    if(rows.length<100)return posts;
  }
  throw Error("CMS export exceeds safe pagination limit");
}
function buildKnowledge({root,output,cmsPosts=[],now=Date.now()}){
  const site=JSON.parse(fs.readFileSync(path.join(root,"content/site.json"))),base=site.baseUrl;
  const local=JSON.parse(fs.readFileSync(path.join(root,"content/articles.json"))).articles;
  const entries=new Map();
  for(const post of visiblePosts(local,now)){validate(post);if(entries.has(post.slug))throw Error("Duplicate local article slug");entries.set(post.slug,post);}
  const deployedCms=visiblePosts(cmsPosts,now);
  for(const post of deployedCms){validate(post);if(entries.has(post.slug))throw Error("CMS slug conflicts with local article: "+post.slug);entries.set(post.slug,post);}
  const posts=[...entries.values()].sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)||a.slug.localeCompare(b.slug));
  const indexUrl=new URL("kien-thuc.html",base).href;
  const articleUrl=post=>new URL(`kien-thuc/${post.slug}/`,base).href;
  const cover=post=>post.cover_image_url||new URL("assets/og-card.png",base).href;
  function page({title,description,url,prefix,body,schema,type="website",image}){
    const links=`<a href="${prefix}du-an/">Công trình</a><a href="${prefix}dich-vu/">Dịch vụ</a><a href="${prefix}catalog.html">Catalog</a><a href="${prefix}kien-thuc.html">Kiến thức</a>`;
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#1e2c27"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(url)}"><link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml"><meta property="og:site_name" content="ATELIER HOME"><meta property="og:locale" content="vi_VN"><meta property="og:type" content="${type}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(image||new URL("assets/og-card.png",base).href)}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${json({"@context":"https://schema.org","@graph":schema})}</script><link rel="stylesheet" href="${prefix}assets/service-pages.css"><link rel="stylesheet" href="${prefix}assets/knowledge.css"></head><body><a class="skip" href="#main">Bỏ qua điều hướng</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="${prefix}index.html">ATELIER<small>HOME INTERIORS</small></a><details class="menu"><summary>Menu</summary><nav class="nav" aria-label="Điều hướng chính">${links}</nav></details><nav class="nav" aria-label="Điều hướng chính">${links}</nav><a class="button header-cta" href="${prefix}index.html#contact">Tư vấn ↗</a></div></header>${body}<section class="cta"><div class="wrap cta-inner"><div><h2>Chuẩn bị cho không gian của bạn</h2><p>Chia sẻ nhu cầu để cùng làm rõ bước tiếp theo.</p></div><a class="button" href="${prefix}index.html#contact">Trao đổi nhu cầu ↗</a></div></section><footer class="footer"><div class="wrap footer-inner"><p>ATELIER HOME · Thiết kế không gian sống</p><nav class="footer-links" aria-label="Liên kết cuối trang"><a href="${prefix}index.html">Trang chủ</a><a href="${prefix}privacy.html">Quyền riêng tư</a></nav></div></footer></body></html>`;
  }
  const breadcrumb=(title,url)=>({"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Trang chủ",item:base},{"@type":"ListItem",position:2,name:"Kiến thức",item:indexUrl},...(url!==indexUrl?[{"@type":"ListItem",position:3,name:title,item:url}]:[])]});
  const card=post=>`<article class="knowledge-card"><a href="${escape(articleUrl(post))}"><div class="card"><p class="category">${escape(post.category)}</p><h2>${escape(post.title)}</h2><p>${escape(post.excerpt)}</p><span class="text-link">Đọc hướng dẫn ↗</span></div></a></article>`;
  const listing=page({title:"Kiến thức nội thất | ATELIER HOME",description:"Hướng dẫn chuẩn bị nhu cầu thiết kế, đọc báo giá và nghiệm thu nội thất. Nội dung thực hành giúp bạn phối hợp rõ ràng hơn với đơn vị thực hiện.",url:indexUrl,prefix:"./",schema:[{"@type":"CollectionPage",name:"Kiến thức nội thất",url:indexUrl,mainEntity:{"@type":"ItemList",itemListElement:posts.map((post,i)=>({"@type":"ListItem",position:i+1,url:articleUrl(post),name:post.title}))}},breadcrumb("Kiến thức",indexUrl)],body:`<main id="main"><section class="hero"><div class="wrap hero-copy"><p class="eyebrow">CẨM NANG KHÔNG GIAN SỐNG</p><h1>Hiểu nhu cầu, chuẩn bị kỹ, chọn phù hợp.</h1><p>Những hướng dẫn để bạn bắt đầu dự án với thông tin rõ ràng và làm việc chủ động hơn.</p></div></section><section class="section"><div class="wrap"><div class="cards">${posts.map(card).join("")}</div></div></section></main>`});
  fs.writeFileSync(path.join(output,"kien-thuc.html"),listing);
  for(const post of posts){
    const url=articleUrl(post),date=new Date(post.published_at).toLocaleDateString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"});
    const html=page({title:(post.seo_title||post.title)+" | ATELIER HOME",description:post.seo_description||post.excerpt,url,prefix:"../../",type:"article",image:cover(post),schema:[{"@type":"Article",headline:post.title,description:post.excerpt,datePublished:post.published_at,dateModified:post.updated_at||post.published_at,image:cover(post),mainEntityOfPage:url,author:{"@type":"Organization",name:site.name},publisher:{"@type":"Organization",name:site.name,url:base}},breadcrumb(post.title,url)],body:`<main id="main"><nav class="breadcrumb wrap" aria-label="Breadcrumb"><ol><li><a href="../../index.html">Trang chủ</a></li><li><a href="../../kien-thuc.html">Kiến thức</a></li><li aria-current="page">${escape(post.title)}</li></ol></nav><article class="article-wrap"><p class="eyebrow">${escape(post.category)}</p><h1>${escape(post.title)}</h1><p class="intro">${escape(post.excerpt)}</p><p class="article-date">ATELIER HOME · <time datetime="${escape(post.published_at)}">${date}</time></p>${post.cover_image_url?`<img class="article-cover" src="${escape(post.cover_image_url)}" alt="${escape(post.image_alt)}" decoding="async" fetchpriority="high">`:""}<div class="article-body">${markdown(post.body_markdown)}</div></article><section class="section"><div class="wrap"><h2>Đọc thêm</h2><div class="cards">${posts.filter(p=>p.slug!==post.slug).slice(0,3).map(card).join("")}</div></div></section></main>`});
    const dir=path.join(output,"kien-thuc",post.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"index.html"),html);
  }
  const sitemap=path.join(output,"sitemap.xml"),xml=fs.readFileSync(sitemap,"utf8");
  const urls=[indexUrl,...posts.map(articleUrl)];
  fs.writeFileSync(sitemap,xml.replace("</urlset>",urls.map(url=>`  <url><loc>${escape(url)}</loc></url>`).join("\n")+"\n</urlset>"));
  // Public deployment receipt: only the CMS slug and exact published edit timestamp.
  // This file is generated only after all public HTML validations pass.
  fs.writeFileSync(path.join(output,"cms-publication.json"),JSON.stringify({schema:1,posts:deployedCms.map(post=>({slug:post.slug,updated_at:post.updated_at||null}))},null,2)+"\n");
  return {articles:posts.length,urls};
}
module.exports={buildKnowledge,fetchPublicPosts,markdown,visiblePosts};
