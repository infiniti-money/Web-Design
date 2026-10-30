# ATELIER HOME v1.2.0 — Bảo vệ khách hàng và API chống spam

## Mới
- Biểu mẫu tư vấn gửi dữ liệu qua Edge Function `submit-inquiry`, không còn gọi thẳng bảng `inquiries`.
- Kiểm tra dữ liệu và honeypot trên máy chủ, giới hạn 3 yêu cầu/giờ theo IP và 5 yêu cầu/ngày theo số điện thoại.
- Giới hạn được xử lý nguyên tử trong PostgreSQL, sử dụng dấu vân tay HMAC SHA-256 có khóa server-side; không lưu IP gốc vào bảng giới hạn.
- Khóa quyền `INSERT` trực tiếp của khách `anon` và thu hồi policy RLS cũ; người lạ không đọc hồ sơ khách hàng.
- Bổ sung mã Edge Function và SQL source trong GitHub; cải tiến tài liệu vận hành.
- Kiểm thử API trực tiếp chấp nhận yêu cầu thử hợp lệ; xóa bản ghi thử, không để lại dữ liệu giả.
- Kiểm thử Chromium form qua mock Edge API và chặn ghi trực tiếp cũ để tránh vô tình lưu thông tin thử.
- Admin Supabase đã có một tài khoản email xác minh với vai trò `admin`.

## Kiểm thử & vận hành
- Supabase Edge Function `submit-inquiry` ACTIVE, RPC chỉ cấp quyền EXECUTE cho `service_role`.
- Kết quả SQL xác nhận `anon` không có quyền `INSERT` hoặc `SELECT` trong `inquiries`.
- Website: https://infiniti-money.github.io/Web-Design/
- Admin: https://infiniti-money.github.io/Web-Design/admin.html

## Giới hạn chưa giải quyết
- CORS/Origin và IP header có thể bị giả mạo; honeypot/rate limits không thay thế CAPTCHA. Bổ sung Cloudflare Turnstile cho môi trường có lượng truy cập cao.
- Chưa kiểm thử login/CRUD bằng phiên đăng nhập thật, chưa có thông báo email, chính sách riêng tư hoàn chỉnh.
- Dữ liệu và ảnh công trình trên trang vẫn chỉ mang tính minh họa.
