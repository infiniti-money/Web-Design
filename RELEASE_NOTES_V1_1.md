# ATELIER HOME v1.1.0 — Admin foundation

Đây là bản mã nguồn nền tảng cho quản trị website thiết kế nội thất.

## Mới
- Trang \`/admin.html\` và \`admin.js\` hỗ trợ Supabase Auth (email, mật khẩu) và kiểm tra vai trò quản trị.
- Quản lý dự án nội thất: thêm, sửa, xóa, xuất bản/ẩn.
- Quản lý yêu cầu tư vấn: xem, cập nhật trạng thái, xóa.
- Frontend đọc dự án đã xuất bản và ghi form trực tiếp vào Supabase **sau khi kết nối**.
- SQL tạo bảng \`projects\`, \`inquiries\`, chính sách RLS (public chỉ được đọc dự án đã xuất bản và gửi yêu cầu).
- Bộ kiểm tra tự động GitHub Actions và hướng dẫn \`SUPABASE_SETUP.md\`.

## Bắt buộc trước khi sử dụng dữ liệu thật
- Chưa có Supabase project; hiện **chưa kết nối** database hoặc admin Auth thực tế.
- Chưa bật GitHub Pages. Kích hoạt qua GitHub Settings → Pages → Source = GitHub Actions.
- Chưa có CAPTCHA, chống spam phía server, email thông báo, bộ lưu trữ ảnh hoặc chính sách dữ liệu cá nhân đầy đủ.
- Không dùng website này để tiếp nhận khách thật khi chưa hoàn thành bảo mật và kiểm thử RLS.

## Khả năng tương thích
- Giữ nguyên bản v1.0.0 cũ trong GitHub Releases.
- Khi chưa cấu hình \`app-config.js\`, trang chủ vẫn hoạt động theo chế độ demo localStorage.
