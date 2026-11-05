const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const catalog=fs.readFileSync("admin-catalog.html","utf8");
const html=fs.readFileSync("admin.html","utf8"),admin=fs.readFileSync("admin.js","utf8");
test("Catalog supports visible publication filters, accent-insensitive search, and safeguards edits",()=>{
 assert.match(catalog,/id="visibility"/);
 assert.match(catalog,/id="catalog-reload"/);
 assert.match(catalog,/replace\(\/đ\/g,"d"\)/);
 assert.match(catalog,/visibility==="published"/);
 assert.match(catalog,/Bỏ các thay đổi Catalog chưa lưu/);
 assert.match(catalog,/beforeunload/);
 assert.match(catalog,/\.select\("id"\)\.single\(\)/);
 assert.match(catalog,/Không thể hoàn tác/);
});
test("Project administration sorts loaded records and validates publication inputs",()=>{
 assert.match(html,/id="project-sort"/);
 assert.match(html,/Công khai dự án trong danh sách website/);
 assert.match(admin,/project-sort"\)\.value==="newest"/);
 assert.match(admin,/giới hạn 200/);
 assert.match(admin,/Number\.isSafeInteger\(sortOrder\)/);
 assert.match(admin,/parsed\.username/);
 assert.match(admin,/Xác nhận thông tin công trình/);
});
test("Admin pages are noindex and no service-role secrets are included",()=>{
 assert.match(catalog,/noindex,nofollow/);
 assert.match(html,/noindex,nofollow/);
 assert.doesNotMatch(catalog,/SUPABASE_SERVICE_ROLE|sb_secret_/i);
});
