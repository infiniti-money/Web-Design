const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const home=fs.readFileSync("index.html","utf8");
const gateway=fs.readFileSync("site-backend.js","utf8");
test("Consultation displays contextual service guide without adding PII to URL",()=>{
  for(const text of ["Ba bước gửi yêu cầu tư vấn","01 · Chia sẻ nhu cầu","02 · Xác minh an toàn","03 · Kiểm tra xác nhận"]){
    assert.ok(home.includes(text),text);
  }
  assert.match(home,/id="requested-service-note"[^>]*hidden/);
  assert.match(home,/service=design|design:"Thiết kế nội thất"/);
  assert.match(home,/requested-service-note.*Dịch vụ bạn đang quan tâm/s);
  assert.match(home,/addEventListener\("reset"/);
  assert.match(home,/focus-visible/);
});
test("Live gateway confirms success only after real API receipt and avoids indefinite requests",()=>{
  assert.match(gateway,/new AbortController\(\)/);
  assert.match(gateway,/REQUEST_TIMEOUT_MS = 15000/);
  assert.match(gateway,/signal: requestController.signal/);
  assert.match(gateway,/clearTimeout\(timeout\)/);
  assert.match(gateway,/form\.setAttribute\("aria-busy", "true"\)/);
  assert.match(gateway,/form\.setAttribute\("aria-busy", "false"\)/);
  assert.match(gateway,/receipt\?\.ok !== true/);
  assert.ok(gateway.indexOf("receipt?.ok !== true")<gateway.indexOf("form.reset()"),"must only reset after confirmed receipt");
  assert.match(gateway,/event\.stopImmediatePropagation\(\)/);
  assert.doesNotMatch(gateway,/localStorage\.setItem|sessionStorage\.setItem/);
});
test("Network ambiguity does not claim the lead definitely was not stored or auto-retry",()=>{
  assert.match(gateway,/Chưa thể xác nhận hệ thống đã nhận hay chưa/);
  assert.match(gateway,/Chưa thể xác nhận hệ thống có tiếp nhận hay chưa|Chưa thể xác nhận hệ thống đã nhận hay chưa/);
  assert.match(gateway,/tránh trùng/);
  assert.doesNotMatch(gateway,/Gửi yêu cầu chưa thành công\. Dữ liệu chưa được lưu/);
  assert.doesNotMatch(gateway,/retry\(|setInterval\(/);
});
