'use strict';
const fs=require('node:fs'),path=require('node:path');
const {validateProjects}=require('./build-project-pages.cjs');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
function validateConfig(input,root){
 if(input?.schema!==1||!input.estimate||typeof input.estimate.enabled!=='boolean')throw Error('Invalid conversion configuration');
 let heroVideo=null;const video=input.heroVideo;
 if(video){
  if(video.rightsConfirmed!==true||video.realFootageConfirmed!==true||typeof video.caption!=='string'||!video.caption.trim()||video.caption.length>300||typeof video.src!=='string')throw Error('Hero video requires real footage and confirmed rights/caption');
  if(video.src.startsWith('https://')){const url=new URL(video.src);if(url.username||url.password||/[\s<>"']/.test(video.src))throw Error('Unsafe hero video URL');}
  else if(!/^assets\/media\/(?:[\w-]+\/)*[\w-]+\.(mp4|webm)$/.test(video.src)||!fs.existsSync(path.join(root,video.src))||fs.statSync(path.join(root,video.src)).size>20*1024*1024)throw Error('Local hero video must exist under assets/media and be at most 20 MiB');
  heroVideo={src:video.src,caption:video.caption.trim(),rightsConfirmed:true,realFootageConfirmed:true};
 }
 let estimate={enabled:false,approved:false,version:null,validUntil:null,packages:null};
 if(input.estimate.enabled){
  const c=input.estimate;if(c.approved!==true||typeof c.version!=='string'||!c.version.trim()||c.version.length>50||!Number.isFinite(Date.parse(c.validUntil)))throw Error('Estimation requires an approved version and validity date');
  const packages={};for(const tier of ['economy','balanced','premium']){const rates=c.packages?.[tier];if(!rates||![rates.minPerM2,rates.maxPerM2,rates.perBedroom].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000)||rates.minPerM2<1||rates.maxPerM2<rates.minPerM2)throw Error('Invalid approved estimation rates');packages[tier]={minPerM2:rates.minPerM2,maxPerM2:rates.maxPerM2,perBedroom:rates.perBedroom};}
  estimate={enabled:true,approved:true,version:c.version.trim(),validUntil:new Date(c.validUntil).toISOString(),packages};
 }
 return{schema:1,heroVideo,estimate};
}
function buildConversion({root,output}={}){
 const config=validateConfig(JSON.parse(fs.readFileSync(path.join(root,'content/conversion.json'),'utf8')),root);
 const projects=validateProjects(JSON.parse(fs.readFileSync(path.join(root,'content/projects.json'),'utf8')),root);
 const featured=(projects.some(p=>p.featured===true)?projects.filter(p=>p.featured===true):projects).slice(0,5);
 const target=path.join(output,'index.html');let html=fs.readFileSync(target,'utf8');
 const marker=/<!-- VERIFIED PORTFOLIO START -->[\s\S]*?<!-- VERIFIED PORTFOLIO END -->/;
 if(!marker.test(html)||!html.includes('id="conversion-config"'))throw Error('Missing homepage conversion anchors');
 if(featured.length){const cards=featured.map(p=>{const facts=[['Diện tích',p.area],['Phong cách',p.style],['Chi phí',p.budget],['Địa điểm',p.location]].filter(([,v])=>v);return `<article class="featured-card"><a href="./du-an/${p.slug}/"><img loading="lazy" decoding="async" src="${esc(p.cover.src)}" alt="${esc(p.cover.alt)}" width="${p.cover.width}" height="${p.cover.height}"><h3>${esc(p.title)}</h3><dl class="featured-facts">${facts.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+esc(v)+'</dd></div>').join('')}</dl></a></article>`;}).join('');html=html.replace(marker,'<!-- VERIFIED PORTFOLIO START --><div class="featured-grid">'+cards+'</div><!-- VERIFIED PORTFOLIO END -->');}
 html=html.replace(/(<script type="application\/json" id="conversion-config">)[\s\S]*?(<\/script>)/,(_match,start,end)=>start+JSON.stringify(config).replace(/</g,'\\u003c')+end);
 if(config.estimate.enabled)html=html.replace('Chưa có bảng đơn giá công khai. Công cụ hiện giúp tổng hợp nhu cầu; chi phí cần được xác định sau khi làm rõ hiện trạng, vật liệu và phạm vi.','Khoảng chi phí theo bảng tham khảo '+esc(config.estimate.version)+', hiệu lực đến '+esc(config.estimate.validUntil)+'. Phạm vi, vật liệu, thuế và hạng mục bao gồm cần đối chiếu trước khi chốt báo giá.').replace('Xem nhu cầu <span>','Xem dự toán sơ bộ <span>');
 fs.writeFileSync(target,html);return{featured:featured.length,estimateEnabled:config.estimate.enabled,videoEnabled:!!config.heroVideo};
}
module.exports={buildConversion,validateConfig};
