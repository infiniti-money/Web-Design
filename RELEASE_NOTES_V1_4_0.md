# ATELIER HOME / Tân Design v1.4.0 — CRM và thông báo email

## Nâng cấp trang quản trị
- Tìm kiếm khách hàng theo họ tên, số điện thoại và nội dung đã được Admin tải về; hỗ trợ tìm kiếm không dấu.
- Bộ lọc trạng thái Mới / Đã liên hệ / Đã báo giá / Hoàn thành.
- Bộ lọc dịch vụ: Thiết kế nội thất / Thi công trọn gói / Tư vấn & trang trí.
- Bộ lọc thời gian: Hôm nay, 7 / 30 / 90 ngày gần đây (múi giờ Việt Nam).
- Xóa bộ lọc một chạm; hiển thị số hồ sơ phù hợp.
- Bảng thống kê: tổng yêu cầu đã tải, nhận hôm nay, đã liên hệ, đã báo giá.
- Giữ RLS chỉ tài khoản Admin được đọc thông tin khách hàng.
- Tối ưu giao diện điện thoại.

## Thông báo email
- Edge Function `submit-inquiry` v6 gọi Resend sau khi ghi Supabase thành công.
- Thư báo gửi đến `infinitimoney@icloud.com`, không chứa họ tên, điện thoại hoặc nội dung yêu cầu riêng tư.
- Chỉ kích hoạt khi Supabase Secrets có `RESEND_API_KEY` và `NOTIFY_FROM_EMAIL` (địa chỉ gửi phải được nhà cung cấp xác minh).
- Nếu gửi thư lỗi, yêu cầu tư vấn vẫn được lưu và trả thành công; không báo thành công email giả.
- Chưa kích hoạt/chưa kiểm thử thư thực vì chủ tài khoản chưa cung cấp cấu hình nhà cung cấp. Xem `EMAIL_NOTIFICATIONS_SETUP.md`.

## Kiểm thử và giới hạn
- `tests/static.test.cjs`: kiểm tra cấu trúc website, quyền và đường dẫn mail không chứa secret.
- `tests/email-notification.test.cjs`: mock nhà cung cấp để kiểm tra trường hợp thiếu key, gửi thư với dữ liệu tối thiểu, idempotency và lỗi provider.
- `tests/browser-smoke.cjs`: kiểm thử tìm kiếm, lọc, reset, KPI và giao diện trên website đã triển khai (dùng tài khoản Admin mô phỏng, không ghi dữ liệu thật).
- Bộ lọc và KPI làm việc trên **tối đa 200 hồ sơ gần nhất** đã tải sau xác thực Admin; không phải số liệu toàn lịch sử khi vượt mốc 200.
- Giữ quy trình Cloudflare Turnstile, hạn lưu dữ liệu 12 tháng và phân quyền Supabase.
