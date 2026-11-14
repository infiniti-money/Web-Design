"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),{execFileSync}=require("node:child_process");
const required=["index.html","admin.html","admin.js","admin-posts.html","commercial.html","operations.html","assets/operations.js","assets/operations.css","assets/admin-workspace.css","assets/admin-workspace.js","assets/reports-advanced.js","reports-advanced.html","assets/uat-readiness.js","uat.html","scripts/verify-recovery-evidence.cjs","assets/admin-posts.js","assets/quote-editor.js","assets/quote-math.js","assets/vendor/marked.umd.js","assets/vendor/purify.min.js","robots.txt","sitemap.xml","scripts/build-pages.cjs","scripts/build-project-pages.cjs","content/projects.json","supabase/functions/staff-management/index.ts","supabase/migrations/20261104155327_desktop_cms_posts.sql"];
function validateRelease(manifest,files){
  if(!/^\d+\.\d+\.\d+$/.test(manifest.version)||manifest.notes!==`RELEASE_NOTES_V${manifest.version.replaceAll(".","_")}.md`)throw new Error("Invalid website release manifest");
  for(const file of [...required,manifest.notes])if(!files.includes(file))throw new Error("Missing release file: "+file);
  for(const file of files){const parts=file.split("/");if(parts.some(p=>["node_modules",".git",".temp","test-artifacts","dist","_site"].includes(p))||parts.some(p=>/^\.env(?:\.|$)/.test(p)&&p!==".env.example")||/\.(?:exe|pfx|p12|key)$/i.test(file))throw new Error("Private or generated file in release: "+file);}
}
function packageRelease({root=path.resolve(__dirname,".."),output=path.join(root,"dist/web-release"),ref="HEAD"}={}){
  const git=args=>execFileSync("git",args,{cwd:root,maxBuffer:32*1024*1024});
  if(!/^(?:HEAD|[a-f0-9]{40})$/.test(ref))throw new Error("Release ref must be HEAD or exact commit SHA");
  const revision=git(["rev-parse",ref]).toString().trim();
  const manifest=JSON.parse(git(["show",revision+":website-release.json"]).toString());
  const files=git(["ls-tree","-r","--name-only",revision]).toString().trim().split("\n");validateRelease(manifest,files);
  const filename=`atelier-home-web-v${manifest.version}-source.zip`;
  const archive=git(["archive","--format=zip",`--prefix=atelier-home-web-v${manifest.version}/`,revision]);
  const sha256=crypto.createHash("sha256").update(archive).digest("hex");
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,filename),archive);
  fs.writeFileSync(path.join(output,"SHA256SUMS.txt"),sha256+"  "+filename+"\n");
  return{version:manifest.version,revision,filename,sha256,bytes:archive.length};
}
if(require.main===module)console.log(JSON.stringify(packageRelease({ref:process.env.GITHUB_SHA||"HEAD"})));
module.exports={packageRelease,validateRelease,required};
