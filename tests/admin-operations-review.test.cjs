const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const admin=fs.readFileSync("admin.js","utf8"),html=fs.readFileSync("admin-posts.html","utf8"),cms=fs.readFileSync("assets/admin-posts.js","utf8");
test("CRM does not leave stale private rows or export enabled after load error",()=>{
 assert.match(admin,/state\.inquiries=\[\];state\.leadTotal=0;renderInquiries\(\)/);
 assert.match(admin,/Không tải được hồ sơ\. Nhấn Làm mới/);
 assert.match(admin,/res(?:ults)?\.some\([^\n]*Number\.isSafeInteger/);
 assert.match(admin,/Không tải được thống kê tư vấn; dấu/);
});
test("Care task status updates verify server state before reporting success",()=>{
 assert.equal((admin.match(/\.select\("id,status"\)\.eq\("id",task\.id\)\.single\(\)/g)||[]).length,2);
 assert.match(admin,/check\.data\?\.status!==next/);
 assert.match(admin,/Mở lại công việc đã hoàn thành/);
 assert.match(admin,/Không thể tải công việc\. Nhấn Làm mới/);
 assert.match(admin,/Không đọc được thống kê công việc; dấu/);
});
test("CMS approval checklist, review shortcut and correct SEO path",()=>{
 assert.match(html,/id="post-review-queue"/);
 assert.match(html,/id="post-publish-checklist"/);
 assert.match(cms,/function publicationCheck\(\)/);
 assert.match(cms,/Đủ điều kiện nội dung/);
 assert.match(cms,/kien-thuc\/"\+post\.slug\+"\/"/);
 assert.doesNotMatch(cms,/bai-viet\.html\?slug/);
 assert.match(cms,/sau khi hệ thống dựng HTML thành công/);
 assert.match(cms,/\$\("post-review-queue"\)\.onclick/);
});
