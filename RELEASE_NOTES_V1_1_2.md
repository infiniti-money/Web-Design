# ATELIER HOME v1.1.2 — Browser-tested website

## Nội dung cập nhật
- Xác nhận triển khai thành công GitHub Pages tại https://infiniti-money.github.io/Web-Design/.
- Bổ sung kiểm thử Chromium/Playwright trên website thật cho màn hình máy tính, điện thoại và trang đăng nhập quản trị.
- Thử tải 6 dự án từ Supabase, lọc theo danh mục, mở/đóng cửa sổ chi tiết bằng bàn phím.
- **Sửa lỗi an toàn dữ liệu:** khi Supabase SDK không tải được hoặc cấu hình sai, biểu mẫu tư vấn ngừng nhận yêu cầu; không rơi về chế độ lưu demo cục bộ gây hiểu lầm.
- Hiển thị cảnh báo khi không đồng bộ được danh sách dự án online.
- Đồng bộ README và tài liệu quản trị với trạng thái Pages đã hoạt động.

## Đã kiểm thử
- Homepage HTTP 200.
- Supabase public API HTTP 200, tải 6 dự án.
- Admin login page HTTP 200, đăng nhập chưa được thử vì chưa có tài khoản quản trị.
- Mobile layout không tràn chiều ngang.
- Giả lập lỗi CDN SDK: biểu mẫu không gửi và không lưu demo.
- Kiểm thử cú pháp JavaScript và quyền truy cập Supabase tiếp tục xanh.

## Chưa hoàn thành
- Chưa có tài khoản admin Supabase (chưa có người dùng được mời/xác minh). Không hardcode tài khoản hay mật khẩu.
- Chưa có CAPTCHA, hạn chế tần suất yêu cầu phía máy chủ, email thông báo và chính sách dữ liệu cá nhân hoàn thiện.
- Ảnh, công trình và dữ liệu thống kê vẫn là minh họa, cần thay trước khi sử dụng thương mại.
