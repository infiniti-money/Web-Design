const test=require("node:test"),assert=require("node:assert/strict"),path=require("node:path");
const {trustedPage,resolveAsset,externalTarget,csp}=require("../security.cjs");
test("Desktop protocol accepts only packaged resources and rejects traversal or privileged files",()=>{
  const root=path.resolve("ui");
  assert.equal(trustedPage("atelier://app/admin.html#projects"),true);
  assert.equal(trustedPage("atelier://app/operations.html"),true);
  for(const url of ["https://infiniti-money.github.io/Web-Design/admin.html","atelier://other/admin.html","atelier://app.evil/admin.html","atelier://user@app/admin.html","atelier://app/admin-posts.html/extra"])assert.equal(trustedPage(url),false);
  assert.equal(resolveAsset("atelier://app/assets/admin-workspace.css",root),path.join(root,"assets/admin-workspace.css"));
  for(const url of ["atelier://app/%2e%2e%5cmain.cjs","atelier://app/main.cjs","atelier://app/%00.js","atelier://app/secret.html","atelier://evil/app-config.js"])assert.equal(resolveAsset(url,root),null);
});
test("External navigation uses the website/repository allowlist and CSP denies executable inline content",()=>{
  assert.ok(externalTarget("https://infiniti-money.github.io/Web-Design/privacy.html"));
  for(const url of ["javascript:alert(1)","file:///C:/Windows/System32/cmd.exe","https://infiniti-money.github.io.evil/Web-Design/","https://github.com/infiniti-money/Web-Design-evil/","https://attacker.test/"])assert.equal(externalTarget(url),null);
  assert.match(csp,/script-src 'self';/);assert.doesNotMatch(csp,/unsafe-eval|script-src[^;]*unsafe-inline/);
});
