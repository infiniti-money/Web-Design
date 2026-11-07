# Kiểm thử ứng dụng, webhook và đối soát — 08/11/2026

**Kết luận: các ca tự động trong phạm vi dưới đây đạt; chưa nghiệm thu thu tiền thật.** Chưa có màn hình Admin xử lý các giao dịch unknown/review/unmatched. Chưa kiểm chứng callback từ tài khoản merchant qua Internet, ngân hàng nhận tiền hoặc đăng nhập bằng Auth service thật. Không tạo giao dịch payOS thật trong đợt này.

## Phạm vi và bằng chứng

| Lớp | Kiểm chứng thực tế | Kết quả |
| --- | --- | --- |
| HTTP + SDK + SQL | 18 nhóm tình huống đi qua HTTP server local, runtime backend hiện hành, SDK chính thức 2.0.5 và các RPC ledger thật trên PostgreSQL 17.11 | Đạt |
| Auth trong kiểm thử tích hợp | Adapter lấy metadata/profile từ SQL tổng hợp, kiểm tra Admin/Manager/inactive và thu hồi quyền giữa Auth và RPC | Đạt trong mô hình; chưa thử Auth service thật |
| Webhook | HMAC với khóa giả; SDK thật xác minh. Sai chữ ký, sửa payload, callback trùng, sai amount/currency/link, đơn không khớp | Đạt trong môi trường cách ly |
| Đồng thời | 8 callback giống nhau; hai yêu cầu khác khóa cho cùng báo giá; hai yêu cầu cùng khóa; thêm reference khác sau paid | Ghi paid một lần, không tạo link trùng, phần bất thường giữ để đối soát |
| Lỗi sau tạo link | Timeout provider, lỗi lưu link vào database, callback đến trước lưu link | Không tự retry tạo link; giữ unknown/review, không báo paid sai |
| Số dư | Đặt cọc đã paid cộng phần còn lại; số tiền vượt tổng báo giá | Không tạo link vượt số dư |
| Giao diện báo giá/CMS | Edge headless với fixture: tạo/sửa/xung đột bài viết, vai trò, Markdown an toàn; hạng mục báo giá, số lượng lẻ, làm tròn VND, chiết khấu/thuế và xem bản in | Đạt; không ghi Supabase thật |
| Responsive | Admin 1440/390 px, Manager 1280 px, Employee bị chặn ở 390 px | Không tràn ngang, không lỗi JavaScript |
| Trang payment-return | 390/1440 px, URL gán giả status=PAID và nội dung script, Tab đến liên hệ | Không xác nhận thu tiền theo query, không gọi merchant/DB, noindex/no-referrer |
| Hồi quy mã nguồn | 109 bài Node toàn repo: 108 đạt, 1 bỏ qua có chủ đích vì gửi lead thật; 2 bài kiểm tra protocol/route PC | Đạt |

PostgreSQL chạy trong network Docker internal, không publish port và không lắng nghe TCP. Dữ liệu, Auth token và khóa SDK đều là tổng hợp. Merchant fetch bị thay bằng bộ trả response đã ký giả; các REST/Auth URL chỉ dùng domain `.invalid`, mọi URL khác bị từ chối trong adapter. Đây là kiểm thử kết nối các lớp backend, không phải giao dịch sandbox hoặc xác nhận tài khoản merchant hợp lệ.

Artifact local trong `dist/payos-uat/`: `http-ledger.json`, `return-browser.json`, ảnh trang quay về, `commercial/report.json`, ảnh desktop/mobile và `cms-quotes/`. Không đưa dữ liệu phục hồi từ production vào bộ test này. Chạy SQL trên bản phục hồi thật đã được ghi riêng trong [báo cáo backup/restore](BACKUP_RESTORE_EVIDENCE_20261108.md).

## Lỗi tìm thấy và đã sửa

`paymentCore.create` từng ghép `{actorId:actor.id,...input}`. Client Admin có thể gửi thêm actorId để ghi đè người tạo bằng một tài khoản Admin khác; database vẫn yêu cầu actor có quyền Admin, nhưng nhật ký có thể gán sai tác nhân. Đã đổi sang bốn trường được chọn rõ ràng: actorId từ Auth, quoteId, requestKey và amount đã kiểm tra. Trường state/orderCode dư từ client không được chuyển tới store.

Bài hồi quy đã chạy thất bại trên mã cũ rồi đạt sau sửa; ca HTTP/SQL cũng xác nhận body giả actorId không đổi created_by. Đã cập nhật `payos-deposits` và `payos-webhook` lên **ACTIVE v2**. Công tắc phát hành vẫn mặc định tắt. Kiểm tra production: health HTTP 200 với credentialsPresent=true/paymentsEnabled=false, POST cả hai endpoint HTTP 503 PAYMENTS_DISABLED. Không áp dụng ledger/guard lên production trong đợt kiểm thử.

## Cách chạy lại

```powershell
node --test tests/payos-core.test.cjs tests/commercial-ui.test.cjs
node tests/payos-sdk-check.cjs
```

SDK được cài trước bằng `npm install --prefix dist/payos-sdk --no-package-lock --ignore-scripts @payos/node@2.0.5`. `tests/payos-http-ledger.cjs` chỉ nhận container có tên `atelier-payos-uat-*`, network internal, không publish port; database `payos_e2e_test` phải mới và không có auth.users. Mọi fixture được tạo trong database đó. Trên CI chỉ cho PGHOST=127.0.0.1, PGUSER=ci, PGDATABASE=payos_e2e_test và PAYOS_TEST_ISOLATED=1; không đưa URL hoặc credentials production vào script.

```powershell
$env:PAYOS_TEST_DOCKER_CONTAINER = 'atelier-payos-uat-20261108-r2'
$env:PAYOS_TEST_DOCKER_EXE = 'C:/Users/Admin/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'
node tests/payos-http-ledger.cjs
```

Ví dụ trên mô tả cấu hình lần chạy đã hoàn thành; container có dữ liệu từ lần trước sẽ bị từ chối. Muốn chạy lại phải tạo container test mới trong network internal và database trống. Workflow `payos-staging.yml` tự tạo database tổng hợp mới trên mỗi lần CI; `validate.yml` bổ sung ca trình duyệt payment-return.

## Các phần chưa đạt để mở kinh doanh

1. Chưa có UI tạo yêu cầu đặt cọc gắn phiên bản báo giá và hiển thị số dư chính xác; hiện commercial.html chỉ quản lý báo giá/hợp đồng.
2. Chưa có hàng đợi đối soát, thao tác xử lý unknown/review/unmatched có lý do, bằng chứng và audit. SQL đang giữ các khoản này, chưa tự giải phóng reservation/hủy hoặc hoàn tiền. Không được sửa hàng ledger trực tiếp để vượt kiểm tra.
3. Chưa thử đăng nhập Auth thật và UAT Admin trên luồng thanh toán hoàn chỉnh của web/PC; route security của PC không thay kiểm thử ứng dụng Windows đã cài.
4. Chưa đăng ký/xác minh webhook của merchant thật, kiểm tra credentials/ngân hàng và thử chuyển khoản được chủ sở hữu cho phép. Health credentialsPresent không xác minh được các điều này.
5. Chưa áp dụng guard/ledger lên production; trước khi áp dụng cần backup mới, điều phối ghi dữ liệu và kế hoạch xử lý sự cố. Chính sách giữ dữ liệu tài chính cần được chốt.

SDK/API đối chiếu: [SDK payOS chính thức](https://github.com/payOSHQ/payos-lib-node), [API payOS](https://payos.vn/docs/api/). Các kết quả giả lập không thay thế xác nhận callback hoặc ngân hàng thật.
