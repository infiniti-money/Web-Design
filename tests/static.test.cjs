const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = path => fs.readFileSync(path, "utf8");
const index = read("index.html");
const admin = read("admin.html");
const schema = read("supabase/schema.sql");

test("Public and admin pages include key functional sections", () => {
  for (const id of ["project-grid","lead-form","form-feedback","project-modal","admin-live-link"]) {
    assert.match(index, new RegExp('id="'+id+'"'));
  }
  for (const id of ["login-form","project-form","projects-table","inquiries-table","dashboard"]) {
    assert.match(admin, new RegExp('id="'+id+'"'));
  }
  assert.match(index, /<meta name="viewport"/);
  assert.match(admin, /<meta name="robots" content="noindex,nofollow">/);
});

test("All browser scripts and inline scripts are valid JavaScript", () => {
  for (const path of ["app-config.js","site-backend.js","admin.js"]) {
    assert.doesNotThrow(() => new vm.Script(read(path), {filename:path}), path);
  }
  for (const file of ["index.html","admin.html"]) {
    let n=0;
    for(const match of read(file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
      if(/\bsrc\s*=/.test(match[1])) continue;
      if(!match[2].trim()) continue;
      assert.doesNotThrow(()=>new vm.Script(match[2],{filename:file+" inline "+(++n)}));
    }
  }
});

test("Browser configuration uses only Supabase publishable credentials", () => {
  const ctx = { window: {} };
  vm.runInNewContext(read("app-config.js"), ctx);
  const config = ctx.window.ATELIER_CONFIG;
  assert.match(config.supabaseUrl, /^https:\/\/[a-z0-9-]+\.supabase\.co$/);
  assert.match(config.supabasePublishableKey, /^sb_publishable_[a-zA-Z0-9_-]+$/);
  assert.doesNotMatch(config.supabasePublishableKey, /sb_secret_|eyJhbGci/);
  assert.match(read("index.html"), /@supabase\/supabase-js@2\.118\.0/);
  assert.match(read("admin.html"), /@supabase\/supabase-js@2\.118\.0/);
});

test("Database tables use RLS, limited permissions, and administrator claim", () => {
  for (const table of ["projects","inquiries"]) {
    assert.match(schema, new RegExp("alter table public\\."+table+" enable row level security"));
    assert.match(schema, new RegExp("revoke all on public\\."+table+" from anon, authenticated"));
  }
  assert.match(schema, /grant insert on public\.inquiries to anon/);
  assert.doesNotMatch(schema, /grant select on public\.inquiries to anon/i);
  assert.match(schema, /\(select auth\.jwt\(\)\)/);
  assert.doesNotMatch(schema, /auth\.jwt\(\) -> 'user_metadata'/);
});

test("Configured public site uses live API, demo fallback remains explicit", () => {
  assert.match(read("site-backend.js"), /from\("inquiries"\)\.insert/);
  assert.match(read("site-backend.js"), /from\("projects"\)/);
  assert.match(index, /ATELIER_SET_PROJECTS/);
  assert.match(index, /localStorage/);
});
