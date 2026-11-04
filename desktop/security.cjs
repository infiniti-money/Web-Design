"use strict";
const path=require("node:path");
const SITE="https://infiniti-money.github.io/Web-Design/";
const pages=new Set(["admin.html","admin-posts.html","admin-catalog.html","commercial.html","notifications.html","reports-advanced.html"]);
function trustedPage(value){try{const url=new URL(value);return url.protocol==="atelier:"&&url.hostname==="app"&&!url.port&&!url.username&&!url.password&&pages.has(url.pathname.slice(1));}catch{return false;}}
function resolveAsset(value,root){
  let url;try{url=new URL(value);}catch{return null;}
  if(url.protocol!=="atelier:"||url.hostname!=="app"||url.port||url.username||url.password)return null;
  let name;try{name=decodeURIComponent(url.pathname).replace(/^\//,"");}catch{return null;}
  if(name.includes("\\")||name.includes("\0")||name.split("/").includes(".."))return null;
  if(name.endsWith(".html")&&!pages.has(name))return null;
  if(!/\.(?:html|js|css|json|png|jpe?g|webp|svg|ico|woff2?)$/i.test(name))return null;
  const target=path.resolve(root,name),relative=path.relative(root,target);
  return relative&&!relative.startsWith("..")&&!path.isAbsolute(relative)?target:null;
}
function externalTarget(value){try{const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password)return null;if(url.href.startsWith(SITE)||url.href.startsWith("https://github.com/infiniti-money/Web-Design/"))return url.href;return null;}catch{return null;}}
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self'; connect-src 'self' https://mswiegltusllzvuavjdh.supabase.co wss://mswiegltusllzvuavjdh.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'";
module.exports={SITE,pages,trustedPage,resolveAsset,externalTarget,csp};
