const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {buildPages}=require("../scripts/build-pages.cjs");
test("Pages artifact contains working public routes and excludes private source and desktop binaries",()=>{
  const output=fs.mkdtempSync(path.join(os.tmpdir(),"atelier-pages-"));
  const result=buildPages({output,revision:"a".repeat(40)});
  assert.ok(result.files>30);
  for(const file of ["admin.html","admin.js","admin-posts.html","assets/admin-workspace.js","assets/vendor/purify.min.js","dich-vu/thiet-ke-noi-that.html","du-an/index.html","sitemap.xml"]){assert.ok(fs.existsSync(path.join(output,file)),file);}
  for(const file of ["desktop","supabase","tests","cloudflare","content",".git",".github","README.md"]){assert.equal(fs.existsSync(path.join(output,file)),false,file);}
  assert.equal(JSON.parse(fs.readFileSync(path.join(output,"release.json"))).revision,"a".repeat(40));
  assert.throws(()=>buildPages({output}),/must be empty/);
  assert.throws(()=>buildPages({output:process.cwd()}),/must not contain/);
});
