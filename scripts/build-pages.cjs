"use strict";
const fs=require("node:fs"),path=require("node:path");
const {buildKnowledge,fetchPublicPosts}=require("./build-knowledge.cjs");
const pages=["index.html","payment-return.html","404.html","admin.html","admin-posts.html","admin-catalog.html","commercial.html","payments.html","operations.html","delivery.html","notifications.html","reports-advanced.html","catalog.html","kien-thuc.html","bai-viet.html","privacy.html","register.html","complete-profile.html","reset-password.html","set-password.html"];
const files=[...pages,"admin.js","app-config.js","site-backend.js","robots.txt","sitemap.xml"];
const directories=["assets","dich-vu","du-an"];
const extensions=new Set([".html",".js",".css",".xml",".txt",".svg",".png",".jpg",".jpeg",".webp",".ico",".woff",".woff2"]);
function buildPages({root=path.resolve(__dirname,".."),output=path.join(root,"_site"),revision="local",cmsPosts=[]}={}){
  root=path.resolve(root);output=path.resolve(output);
  if(output===root||root.startsWith(output+path.sep))throw new Error("Output must not contain the source directory");
  if(fs.existsSync(output)&&fs.readdirSync(output).length)throw new Error("Build output must be empty");
  if(revision!=="local"&&!/^[a-f0-9]{40}$/.test(revision))throw new Error("Invalid source revision");
  const plan=[];
  function collect(relative){
    if(relative.split(path.sep).join("/")==="du-an/_generated.json")return;
    const source=path.join(root,relative),stat=fs.lstatSync(source);
    if(stat.isSymbolicLink())throw new Error("Public files must not be symlinks: "+relative);
    if(stat.isDirectory()){for(const name of fs.readdirSync(source)){if(!name.startsWith("."))collect(path.join(relative,name));}return;}
    if(!stat.isFile()||!extensions.has(path.extname(relative)))throw new Error("Unsupported public asset: "+relative);
    plan.push(relative);
  }
  [...files,...directories].forEach(collect);
  for(const relative of plan){const target=path.join(output,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,relative),target);}
  fs.writeFileSync(path.join(output,".nojekyll"),"");
  fs.writeFileSync(path.join(output,"release.json"),JSON.stringify({product:"ATELIER HOME",interface:"workspace-2026.11",revision},null,2)+"\n");
  const knowledge=buildKnowledge({root,output,cmsPosts});
  return {output,files:plan.length,revision,knowledge};
}
if(require.main===module)(async()=>{const root=path.resolve(__dirname,".."),args=process.argv.slice(2);if(args.some(a=>a.startsWith("--")&&a!=="--cms"))throw Error("Unsupported build option");const cmsPosts=args.includes("--cms")?await fetchPublicPosts(root):[];console.log(JSON.stringify(buildPages({output:args.find(a=>!a.startsWith("--")),revision:process.env.GITHUB_SHA||"local",cmsPosts})));})().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={buildPages};
