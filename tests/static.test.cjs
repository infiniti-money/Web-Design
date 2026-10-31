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
  assert.match(schema, /revoke insert on public\.inquiries from anon/);
  assert.doesNotMatch(schema, /grant select on public\.inquiries to anon/i);
  assert.match(schema, /\(select auth\.jwt\(\)\)/);
  assert.doesNotMatch(schema, /auth\.jwt\(\) -> 'user_metadata'/);
});

test("Privacy notice and Turnstile integration are present and secrets stay server-side", () => {
  const policy = read("privacy.html");
  const frontend = read("site-backend.js");
  const edge = read("supabase/functions/submit-inquiry/index.ts");
  assert.match(index, /href="\.\/privacy\.html"/);
  assert.match(index, /id="turnstile-container"/);
  assert.match(policy, /Chính sách quyền riêng tư/);
  assert.match(policy, /Tân Design/);
  assert.match(policy, /Tân Phú, Việt Yên, Hưng Yên/);
  assert.match(policy, /mailto:infinitimoney@icloud\.com/);
  assert.match(index, /mailto:infinitimoney@icloud\.com/);
  assert.match(policy, /12 tháng kể từ lần liên hệ cuối cùng/);
  assert.match(policy, /xóa tự động mỗi ngày/);
  assert.match(read("supabase/inquiry-retention-12m.sql"), /atelier-inquiry-retention-12m/);
  assert.match(read("supabase/inquiry-retention-12m.sql"), /legal_hold_until/);
  assert.match(read("admin.js"), /Ghi nhận liên hệ/);
  assert.match(read("admin.js"), /client\.rpc\("record_inquiry_contact"/);
  assert.doesNotMatch(read("admin.js"), /last_contacted_at:new Date\(\)/);
  const contactSql=read("supabase/admin-contact-rpc.sql");
  assert.match(contactSql, /security invoker/i);
  assert.match(contactSql, /last_contacted_at = now\(\)/);
  assert.match(contactSql, /revoke all on function public\.record_inquiry_contact\(uuid\) from PUBLIC, anon/);
  assert.match(schema, /last_contacted_at timestamptz/);
  assert.match(read("supabase/inquiry-rate-limit.sql"), /2026-10-31-retention-12m/);
  assert.match(policy, /Singapore/);
  assert.match(frontend, /turnstile_token/);
  assert.match(frontend, /privacy_consent/);
  assert.match(edge, /privacy_consent !== true/);
  assert.match(schema, /consented_at timestamptz/);
  assert.match(schema, /privacy_policy_version text/);
  assert.match(read("supabase/privacy-consent.sql"), /privacy_policy_version/);
  assert.match(frontend, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(edge, /Deno\.env\.get\("TURNSTILE_SECRET_KEY"\)/);
  assert.match(edge, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(edge, /result\?\.hostname !== "infiniti-money\.github\.io"/);
  assert.match(edge, /result\?\.action !== "consultation"/);
  assert.doesNotMatch(read("app-config.js"), /sb_secret_[A-Za-z0-9_-]{10,}/);
});

test("Configured public site uses live API, demo fallback remains explicit", () => {
  assert.match(read("site-backend.js"), /\/functions\/v1\/submit-inquiry/);
  assert.doesNotMatch(read("site-backend.js"), /from\("inquiries"\)\.insert/);
  assert.match(read("site-backend.js"), /from\("projects"\)/);
  assert.match(index, /ATELIER_SET_PROJECTS/);
  assert.match(index, /localStorage/);
});
