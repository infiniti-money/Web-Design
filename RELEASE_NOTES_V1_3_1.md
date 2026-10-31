# ATELIER HOME v1.3.1 — Dữ liệu đồng ý và bảo vệ biểu mẫu

## Cập nhật
- Biểu mẫu tư vấn trên website chuyển trạng thái `privacy_consent=true` khi khách tích đồng ý.
- Supabase Edge Function `submit-inquiry` phiên bản 4 **từ chối HTTP 400** khi không có sự đồng ý hợp lệ, trước khi thực hiện ghi dữ liệu khách hàng.
- PostgreSQL bổ sung `consented_at` và `privacy_policy_version` cho các yêu cầu mới. RPC ghi dấu thời gian phía máy chủ và phiên bản chính sách `2026-10-31`.
- Dashboard quản trị hiển thị bằng chứng thời gian đồng ý và phiên bản chính sách trong danh sách tư vấn.
- Chính sách quyền riêng tư công khai việc lưu metadata đồng ý.
- Bài kiểm thử API bổ sung các trường hợp thiếu đồng ý và challenge Turnstile giả. Kiểm thử theo lịch mặc định không tạo bản ghi khách hàng giả để tránh lưu dữ liệu không cần thiết.

## Kết quả kiểm thử
- Migration `record_inquiry_privacy_consent_version` đã thực thi thành công trong Supabase.
- Thử RPC thật trong transaction ROLLBACK cho thấy timestamp và phiên bản được lưu đúng; không có dữ liệu thử nào tồn tại sau giao dịch.
- Vẫn bảo vệ RLS và giới hạn 3 yêu cầu/giờ theo IP, 5 yêu cầu/ngày theo số điện thoại.
- Đã triển khai Edge Function version 4, REST gateway integration CI thành công.
- Còn cần người dùng tạo Cloudflare Turnstile widget thật và cung cấp sitekey công khai, lưu secret trực tiếp trong Supabase.
- Chưa kiểm thử đăng nhập với mật khẩu của quản trị viên. Giữ nguyên tài khoản quản trị.

## Lưu ý
Công bố chính sách quyền riêng tư chưa đồng nghĩa hoàn thành mọi nghĩa vụ pháp luật: còn thiếu xác nhận pháp nhân, đầu mối quyền riêng tư và lịch lưu/xóa cụ thể. Tham khảo `SUPABASE_SETUP.md` và `TURNSTILE_SETUP.md`.
