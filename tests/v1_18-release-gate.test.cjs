const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");

test("v1.18 release is manual only and requires explicit post-migration confirmation",()=>{
 const workflow=read(".github/workflows/release-v1-18.yml");
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+push:\s*$/m);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/RELEASE_V1_18_AFTER_BACKUP_MIGRATION_AND_REAL_AUTH_UAT/);
 assert.match(workflow,/gh release create v1\.18\.0/);
 assert.match(workflow,/if gh release view v1\.18\.0/);
});
test("v1.18 preserves release gates, rollback checks, and read-only pre/postflight",()=>{
 const pre=read("supabase/v1_18-preflight.sql"),post=read("supabase/v1_18-postflight.sql");
 const docs=read("V1_18_RELEASE_GATE.md");
 assert.match(pre,/contracts_wrong_approved_version/);
 assert.match(pre,/orphan_quote_versions/);
 assert.match(post,/immutable_version_trigger_enabled/);
 assert.match(post,/server_totals_installed/);
 assert.match(docs,/Chưa có bản sao lưu độc lập/);
 assert.match(docs,/phiên Supabase Auth thật/);
 const unsafe=/\b(update|delete|insert|truncate|drop|alter|grant|revoke|create)\s+(into\s+|from\s+|table\s+|function\s+|trigger\s+)?public\./i;
 assert.doesNotMatch(pre,unsafe);
 assert.doesNotMatch(post,unsafe);
});
