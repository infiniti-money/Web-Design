# ATELIER HOME v1.3.0 — Turnstile-ready / privacy / admin tests

## Mới
- Tích hợp Cloudflare Turnstile (tải widget theo sitekey khi đã được cấu hình).
- Supabase Edge Function `submit-inquiry` (v3) kiểm tra token thông qua Cloudflare Siteverify, đồng thời xác minh hostname `infiniti-money.github.io` và action `consultation`.
- Khi token có mặt nhưng máy chủ chưa được cấu hình secret, yêu cầu bị từ chối; khi secret đã được cấu hình, tất cả yêu cầu đều cần token hợp lệ.
- Trang `privacy.html` tiếng Việt, liên kết từ biểu mẫu đồng ý và chân trang.
- Kiểm thử cơ sở dữ liệu: admin CREATE/UPDATE/DELETE với ROLLBACK, người không có quyền bị chặn, không sửa 6 dự án mẫu.
- Kiểm thử browser mô phỏng phiên admin và widget Turnstile (không sử dụng tài khoản/mật khẩu thật và không ghi dữ liệu khách hàng thử).

## Chưa được phép gọi là Turnstile đã hoạt động
- **Chưa có widget Cloudflare thực và chưa có secret key `TURNSTILE_SECRET_KEY`**. Hệ thống hiện tiếp tục dùng hạn chế tần suất/HMAC/honeypot cũ. Không được đặt sitekey thử nghiệm lên website thật.
- Xem `TURNSTILE_SETUP.md`: chủ tài khoản Cloudflare cần tạo widget theo hostname `infiniti-money.github.io`; lưu secret trực tiếp trong Supabase Edge Function Secrets, còn sitekey công khai trong `app-config.js`.
- Khi chưa có cả hai cấu hình, không thể kiểm chứng Turnstile production qua Siteverify.

## Pháp lý và an toàn
- Chính sách công khai loại dữ liệu, nơi lưu, quyền và các bên hỗ trợ xử lý. **Thiếu tên pháp lý, địa chỉ, liên hệ privacy đã xác minh và lịch xóa tự động**; chủ website cần hoàn thiện trước khi thu thập dữ liệu khách thương mại.
- RLS của Supabase vẫn bảo vệ dữ liệu, khóa service_role/Turnstile secret không xuất hiện trong frontend.
