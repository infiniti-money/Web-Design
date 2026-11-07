"use strict";
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),ui=path.join(__dirname,"ui"),vendor=path.join(root,"assets/vendor");
fs.mkdirSync(ui,{recursive:true});fs.mkdirSync(vendor,{recursive:true});
for(const [source,target] of [["marked/lib/marked.umd.js","marked.umd.js"],["dompurify/dist/purify.min.js","purify.min.js"],["marked/LICENSE","LICENSE-marked.txt"],["dompurify/LICENSE","LICENSE-dompurify.txt"]])fs.copyFileSync(path.join(__dirname,"node_modules",source),path.join(vendor,target));
fs.cpSync(path.join(root,"assets"),path.join(ui,"assets"),{recursive:true});
fs.mkdirSync(path.join(ui,"vendor"),{recursive:true});fs.copyFileSync(path.join(__dirname,"node_modules/@supabase/supabase-js/dist/umd/supabase.js"),path.join(ui,"vendor/supabase.js"));
const pages=["admin.html","admin-posts.html","admin-catalog.html","commercial.html","payments.html","operations.html","delivery.html","notifications.html","reports-advanced.html"];
for(const file of [...pages,"admin.js","app-config.js"]){let text=fs.readFileSync(path.join(root,file),"utf8");if(file.endsWith(".html")){
  text=text.replace(/<link\b[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g,"").replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.118\.0/g,"./vendor/supabase.js");
  let index=0;text=text.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(match,attrs,body)=>{if(/\bsrc\s*=/.test(attrs)||/application\/ld\+json/.test(attrs)||!body.trim())return match;const name=file.replace(".html","")+"-inline-"+(++index)+".js";fs.writeFileSync(path.join(ui,"assets",name),body);return `<script src="./assets/${name}"></script>`;});
}fs.writeFileSync(path.join(ui,file),text);}
console.log("Prepared bundled admin UI, local dependencies and CSP-compatible scripts.");
