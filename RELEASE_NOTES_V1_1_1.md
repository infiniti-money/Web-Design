# ATELIER HOME v1.1.1 — Kết nối Supabase thực tế

## Cập nhật
- Đã tạo và kết nối dự án Supabase `atelier-home-web-design` tại Singapore.
- Đã chạy migration tạo `projects`, `inquiries`, nạp 6 dự án minh họa và bật RLS.
- Cấu hình `app-config.js` bằng Project URL + **publishable API key** (không có khóa bí mật).
- Chỉnh URL SDK Supabase theo bản phát hành `2.118.0`.
- Cập nhật nội dung chấp thuận thông tin và thay chỉ số thành tích chưa xác minh.
- Bổ sung hướng dẫn tạo tài khoản admin và kích hoạt GitHub Pages; cập nhật kiểm thử tự động.

## Tình trạng kiểm thử
- Schema trên Supabase đã áp dụng thành công, RLS được bật.
- Đã kiểm tra quyền: khách chỉ SELECT dự án, INSERT form; không SELECT/UPDATE/DELETE hồ sơ.
- Security Advisor không phát hiện cảnh báo trong lượt quét ban đầu.
- Còn cần tạo tài khoản admin, kiểm thử đăng nhập và form bằng trình duyệt thực tế.

## Chưa hoạt động / bắt buộc thực hiện
- **Chưa có tài khoản Supabase Auth** nên không thể sử dụng admin cho tới khi mời người dùng và cấp vai trò.
- GitHub Pages chưa được bật trong Settings; workflow sẽ bỏ qua deploy web cho tới khi Pages được kích hoạt.
- Chưa có chống spam phía máy chủ, CAPTCHA và chính sách quyền riêng tư hoàn thiện; chưa nên chạy chiến dịch thu thập dữ liệu thật.
