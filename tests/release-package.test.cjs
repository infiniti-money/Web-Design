const {test}=require("node:test"),assert=require("node:assert/strict");
const {validateRelease,required}=require("../scripts/package-release.cjs");
const manifest={version:"1.18.0",notes:"RELEASE_NOTES_V1_18_0.md"},files=[...required,manifest.notes];
test("Release refuses incomplete modern UI bundles and mismatched version notes",()=>{
  assert.doesNotThrow(()=>validateRelease(manifest,files));
  for(const asset of ["assets/admin-workspace.css","assets/reports-advanced.js","reports-advanced.html","assets/quote-editor.js","assets/vendor/purify.min.js"]){assert.throws(()=>validateRelease(manifest,files.filter(f=>f!==asset)),/Missing release file/);}
  assert.throws(()=>validateRelease({...manifest,notes:"RELEASE_NOTES.md"},files),/Invalid website release manifest/);
});
test("Release refuses environment secrets, private key containers and generated installers",()=>{
  for(const bad of [".env","supabase/.env.production","desktop/dist/setup.exe","cert.pfx","cert.p12","private.key","desktop/node_modules/a.js","supabase/.temp/token"]){assert.throws(()=>validateRelease(manifest,[...files,bad]),/Private or generated/);}
  assert.doesNotThrow(()=>validateRelease(manifest,[...files,".env.example"]));
});
