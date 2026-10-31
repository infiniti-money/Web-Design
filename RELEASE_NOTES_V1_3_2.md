# ATELIER HOME v1.3.2 — Cloudflare Turnstile kích hoạt

## Đã triển khai
- Sitekey Cloudflare Turnstile đã được chủ dự án cấu hình công khai trong `app-config.js` (không lưu Secret Key trên GitHub).
- Supabase Edge Function `submit-inquiry` đã thực hiện kiểm tra Siteverify phía máy chủ: token giả trả `403 captcha_failed`.
- Kiểm thử API xác nhận thiếu token cũng phải bị từ chối `403 captcha_required`.
- Cập nhật bộ kiểm thử Chromium để mô phỏng bước xác minh Turnstile trước khi cho phép bấm Gửi. Phản hồi thành công được giả lập, không ghi thông tin khách hàng thử vào database.
- Sửa thứ tự khởi tạo khi Supabase SDK không tải được: biểu mẫu giữ thông báo lỗi kết nối, không bị trạng thái CAPTCHA ghi đè.
- README, SUPABASE_SETUP và TURNSTILE_SETUP đã đồng bộ với trạng thái Turnstile bật.

## Những gì đã và chưa được xác minh
- ✅ Sitekey được cấu hình công khai; GitHub Pages đã triển khai.
- ✅ Server từ chối token sai, và từ chối token bị thiếu.
- ✅ Chức năng bảo vệ dữ liệu bằng RLS vẫn giữ nguyên.
- ⚠️ Chưa thể tự tạo token Turnstile hợp lệ từ người dùng thật để kiểm thử gửi thành công từ đầu đến cuối. Chủ dự án cần thử một lượt trên website.
- ⚠️ Chưa kiểm thử đăng nhập bằng mật khẩu thật; các bài CRUD trước đó là RLS simulation và UI mock.
- ⚠️ Privacy vẫn thiếu thông tin pháp nhân, email liên hệ quyền dữ liệu và thời hạn lưu/xóa được phê duyệt.
