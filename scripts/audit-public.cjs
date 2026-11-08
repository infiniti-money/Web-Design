'use strict';
const fs=require('node:fs'),path=require('node:path');
const privatePages=['admin.html','admin-posts.html','admin-catalog.html','commercial.html','payments.html','operations.html','delivery.html','notifications.html','reports-advanced.html','register.html','complete-profile.html','reset-password.html','set-password.html','payment-return.html','404.html','bai-viet.html'];
const decode=s=>String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function attributes(tag){const result={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))result[m[1].toLowerCase()]=decode(m[2]??m[3]);return result;}
function inspectHtml(html){
 const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attributes(m[0])),links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attributes(m[0]));
 const meta=name=>metas.find(m=>m.name===name||m.property===name)?.content||'';
 const jsonld=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>attributes(m[1]).type==='application/ld+json').map(m=>{try{return{valid:true,value:JSON.parse(m[2])};}catch{return{valid:false};}});
 return{title:decode((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').trim(),description:meta('description'),canonical:links.filter(m=>(m.rel||'').split(/\s+/).includes('canonical')).map(m=>m.href),robots:meta('robots'),ogTitle:meta('og:title'),ogImage:meta('og:image'),h1:(html.match(/<h1\b/gi)||[]).length,jsonld,ids:new Set([...html.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(m=>decode(m[1]??m[2]))),hrefs:[...html.matchAll(/<a\b[^>]*>/gi)].map(m=>attributes(m[0]).href).filter(Boolean)};
}
function sitemapUrls(xml,base){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Sitemap entity declarations are forbidden');
 if(!/<urlset\b/i.test(xml))throw Error('Expected a sitemap urlset');
 const urls=[...xml.matchAll(/<loc\b[^>]*>([^<]*)<\/loc>/gi)].map(m=>decode(m[1].trim()));
 if(!urls.length||urls.length>200)throw Error('Sitemap size outside audit limit');
 for(const url of urls)if(!inProject(url,base)||new URL(url).search||new URL(url).hash)throw Error('Sitemap URL outside canonical project scope');
 if(new Set(urls).size!==urls.length)throw Error('Duplicate sitemap URLs');return urls;
}
function inProject(input,base){try{const u=new URL(input),b=new URL(base);return u.origin===b.origin&&u.pathname.startsWith(b.pathname)&&!u.username&&!u.password;}catch{return false;}}
function pageKey(input){const u=new URL(input);u.hash='';u.search='';u.pathname=u.pathname.replace(/index\.html$/,'');return u.href;}
async function audit({base='https://infiniti-money.github.io/Web-Design/',fetcher=fetch}={}){
 const origin=new URL(base);if(!['https:','http:'].includes(origin.protocol)||!origin.pathname.endsWith('/')||origin.search||origin.hash||origin.username||origin.password)throw Error('Invalid audit base URL');
 const issues=[],pages=[],issue=(severity,code,url,detail)=>issues.push({severity,code,url,detail});
 async function get(url){
  if(!inProject(url,base)&&url!==new URL('/robots.txt',base).href)throw Error('Blocked audit request outside project');
  const response=await fetcher(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'AtelierPublicAudit/1.0','Accept':'text/html,application/xml,application/json,text/plain'}});
  if(response.status>=300&&response.status<400)throw Error('Unexpected redirect (not followed)');
  const reader=response.body?.getReader();let body='';
  if(reader){const chunks=[];let length=0;try{for(;;){const x=await reader.read();if(x.done)break;length+=x.value.byteLength;if(length>4*1024*1024)throw Error('Audit response exceeds 4 MiB');chunks.push(Buffer.from(x.value));}body=Buffer.concat(chunks).toString('utf8');}finally{await reader.cancel().catch(()=>{});}}
  return{status:response.status,body};
 }
 const sitemapUrl=new URL('sitemap.xml',base).href;let indexed=[];
 try{const r=await get(sitemapUrl);if(r.status!==200)throw Error('HTTP '+r.status);indexed=sitemapUrls(r.body,base);}catch(e){issue('P1','sitemap',sitemapUrl,e.message);}
 const projectRobots=new URL('robots.txt',base).href;
 try{const r=await get(projectRobots);if(r.status!==200||!r.body.split(/\r?\n/).some(line=>line.trim()==='Sitemap: '+sitemapUrl))issue('P1','project-robots',projectRobots,'Missing project robots file or canonical sitemap declaration');}catch(e){issue('P1','project-robots',projectRobots,e.message);}
 const expected=new Map(indexed.map(u=>[pageKey(u),true])),queue=[...expected.keys()];
 const add=url=>{const key=pageKey(url);if(!queue.includes(key))queue.push(key);};
 for(const p of privatePages){const u=new URL(p,base).href;expected.set(pageKey(u),false);add(u);if(indexed.includes(u))issue('P1','private-sitemap',u,'Private document must not appear in sitemap');}
 const projectsUrl=new URL('du-an/',base).href;expected.set(pageKey(projectsUrl),indexed.includes(projectsUrl));add(projectsUrl);
 const manifestUrl=new URL('catalog-publication.json',base).href;
 try{const r=await get(manifestUrl);if(r.status!==200)throw Error('HTTP '+r.status);const data=JSON.parse(r.body);if(data.schema!==1||!Array.isArray(data.items)||data.items.length>5000)throw Error('Invalid catalog publication manifest');
  let any=false;for(const item of data.items){if(!/^catalog\/muc-[0-9a-f-]{36}\/$/.test(item.path)||typeof item.indexable!=='boolean')throw Error('Invalid catalog route');const u=new URL(item.path,base).href;expected.set(pageKey(u),item.indexable);add(u);any||=item.indexable;if(indexed.includes(u)!==item.indexable)issue('P1','catalog-sitemap',u,'Catalog review and sitemap disagree');}const u=new URL('catalog/',base).href;expected.set(pageKey(u),any);add(u);if(indexed.includes(u)!==any)issue('P1','catalog-sitemap',u,'Catalog listing review and sitemap disagree');
 }catch(e){issue('P1','catalog-manifest',manifestUrl,e.message);}
 const seen=new Map(),anchors=[];
 for(let i=0;i<queue.length&&i<200;i++){
  const url=queue[i];let r;try{r=await get(url);}catch(e){issue('P1','fetch',url,e.message);continue;}
  // A custom 404 document is expected to return 404 on GitHub Pages.
  if(r.status!==200&&!(url===new URL('404.html',base).href&&r.status===404)){issue('P1','status',url,'HTTP '+r.status);continue;}
  const data=inspectHtml(r.body);seen.set(url,data);pages.push({url,status:r.status,title:data.title,noindex:/\bnoindex\b/i.test(data.robots),h1:data.h1});
  const privateDocument=privatePages.some(p=>new URL(p,base).href===url);
  if(!data.title||(!privateDocument&&!data.description))issue('P1','metadata',url,'Missing title or public description');
  if(!privateDocument&&(data.canonical.length!==1||data.canonical[0]!==url))issue('P1','canonical',url,'Expected one self-referencing canonical');
  if(!privateDocument&&data.h1!==1)issue('P2','heading',url,'Expected one H1; found '+data.h1);
  if(expected.has(url)&&(/\bnoindex\b/i.test(data.robots)===expected.get(url)))issue('P1','index-policy',url,'Robots disagrees with publication policy');
  if(expected.get(url)===true&&(!data.ogTitle||!data.ogImage))issue('P1','open-graph',url,'Missing Open Graph title/image');
  if(data.jsonld.some(x=>!x.valid))issue('P1','json-ld',url,'Invalid JSON-LD');
  if(expected.get(url)===true&&!data.jsonld.length)issue('P2','schema-missing',url,'No JSON-LD on indexed page');
  for(const href of data.hrefs){let target;try{target=new URL(href,url);}catch{continue;}if(!inProject(target.href,base))continue;if(!/\.html$|\/$/.test(target.pathname))continue;const key=pageKey(target.href);add(key);if(target.hash){let id;try{id=decodeURIComponent(target.hash.slice(1));}catch{continue;}anchors.push({from:url,to:key,id});}}
 }
 if(queue.length>200)issue('P1','crawl-limit',base,'More than 200 HTML URLs; audit incomplete');
 for(const a of anchors)if(seen.has(a.to)&&!seen.get(a.to).ids.has(a.id))issue('P1','broken-anchor',a.from,a.to+'#'+a.id);
 const titles=new Map();for(const p of pages){if(!expected.get(p.url))continue;if(titles.has(p.title))issue('P2','duplicate-title',p.url,titles.get(p.title));else titles.set(p.title,p.url);}
 const rootRobots=new URL('/robots.txt',base).href;try{const r=await get(rootRobots);if(r.status!==200)issue('P2','root-robots',rootRobots,'HTTP '+r.status+'; project robots.txt cannot control the hostname root');}catch(e){issue('P2','root-robots',rootRobots,e.message);}
 const missing=new URL('__atelier_missing_page_probe__/',base).href;try{const r=await get(missing);if(r.status!==404)issue('P1','soft-404',missing,'Expected HTTP 404, got '+r.status);}catch(e){issue('P1','404-probe',missing,e.message);}
 return{schema:1,checked_at:new Date().toISOString(),base,mode:'GET-only; no authentication, form submissions or provider SDKs',sitemap:indexed.length,pages,issues,summary:{P1:issues.filter(x=>x.severity==='P1').length,P2:issues.filter(x=>x.severity==='P2').length},unverified:['Search Console ownership/index coverage','Field Core Web Vitals','Business details and image ownership evidence']};
}
if(require.main===module)(async()=>{const args=process.argv.slice(2),base=args[0]||undefined,out=path.resolve(args[1]||'dist/audits/public-seo.json'),report=await audit({base});fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:out,pages:report.pages.length,sitemap:report.sitemap,...report.summary}));if(report.summary.P1)process.exitCode=1;})().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={audit,inspectHtml,sitemapUrls,inProject,pageKey};
