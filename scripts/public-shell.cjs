'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
function publicHeader(prefix,{active='',legacy=''}={}){
 const roles={'Trang chủ':'home','Về chúng tôi':'about','Dự án':'projects','Công trình':'projects','Dịch vụ':'services','Quy trình':'process','Kiến thức':'knowledge','Catalog':'catalog','Catalog nội thất':'catalog','Liên hệ':'contact','Liên hệ tư vấn':'contact'};
 const hrefs={home:prefix+'index.html',about:prefix+'index.html#about',projects:prefix+'du-an/',services:prefix+'dich-vu/',process:prefix+'index.html#process',knowledge:prefix+'kien-thuc.html',catalog:prefix+'catalog.html',contact:prefix+'index.html#contact'};
 const anchors=[...legacy.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];let cta=hrefs.contact;
 for(const [,href,html]of anchors){const label=html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();if(roles[label])hrefs[roles[label]]=href;if(/Đặt lịch|Tư vấn ↗/i.test(label))cta=href;}
 const labels={home:'Trang chủ',about:'Về chúng tôi',projects:'Dự án',services:'Dịch vụ',process:'Quy trình',knowledge:'Kiến thức',catalog:'Catalog nội thất',contact:'Liên hệ'};
 const links=Object.entries(labels).map(([key,label])=>'<a href="'+esc(hrefs[key])+'"'+(active===key?' aria-current="page"':'')+'>'+label+'</a>').join('');
 return '<header class="site-header public-header"><div class="wrap public-header-inner"><a class="brand public-brand" href="'+esc(anchors[0]?.[1]||hrefs.home)+'" aria-label="ATELIER HOME INTERIORS">ATELIER<small>HOME INTERIORS</small></a><details class="menu public-menu"><summary>Menu</summary><nav class="nav public-links" aria-label="Điều hướng chính">'+links+'</nav></details><nav class="nav public-links public-desktop-nav" aria-label="Điều hướng chính">'+links+'</nav><a class="button header-cta public-header-cta" href="'+esc(cta)+'">Đặt lịch tư vấn ↗</a></div></header>';
}
function fontLinks(prefix){return '<link rel="stylesheet" href="'+prefix+'assets/public-fonts.css"><link rel="stylesheet" href="'+prefix+'assets/public-shell.css">';}
module.exports={publicHeader,fontLinks};
