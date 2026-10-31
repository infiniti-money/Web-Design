# ATELIER HOME / Tân Design v1.5.0 — Quản trị khách hàng theo dữ liệu thực

## Mới
- Bảng yêu cầu tư vấn truy vấn **25 hồ sơ/trang** từ Supabase, có Trang trước/Trang sau, số trang và tổng hồ sơ phù hợp.
- Bộ lọc **trạng thái**, **dịch vụ**, **hôm nay / 7 / 30 / 90 ngày** và tìm kiếm theo tên, điện thoại, dịch vụ, không gian, nội dung được áp dụng phía máy chủ trước khi phân trang.
- Thống kê tổng hồ sơ, mới hôm nay (theo giờ Việt Nam), đang mới, đã liên hệ và đã báo giá dùng truy vấn COUNT chính xác trên cơ sở dữ liệu đầy đủ.
- **Xuất CSV trang này** cho tối đa 25 hồ sơ đã được Admin xem; dữ liệu được tạo ngay trong trình duyệt, không gửi đến bên thứ ba. CSV UTF-8 BOM cho Excel và biện pháp chống công thức bảng tính độc hại.
- Có xác nhận trước khi xuất tệp chứa dữ liệu cá nhân; quản trị viên phải bảo quản/xóa tệp theo quy định.

## Bảo mật và giới hạn
- Không thay đổi Supabase RLS, tài khoản Admin, hồ sơ thực hay thời hạn lưu/xóa 12 tháng.
- Khách không được đọc bảng `public.inquiries`; chỉ Admin đã xác thực truy vấn qua Supabase publishable key/JWT.
- Tìm kiếm phía máy chủ chưa hỗ trợ khớp chữ tiếng Việt không dấu hoàn toàn: nhập dấu tương ứng để tìm tên.
- Chức năng CSV chỉ xuất hồ sơ của **trang đang hiển thị**, không phải tất cả hồ sơ trên Supabase.
- **Email qua Resend vẫn hoãn cấu hình** theo quyết định chủ website; không gửi thử email thật hoặc yêu cầu cung cấp secret.

## Kiểm thử
- `tests/static.test.cjs` xác minh cấu trúc, phân trang, quyền và giới hạn xuất CSV.
- `tests/browser-smoke.cjs` kiểm tra đăng nhập Admin mô phỏng, lọc/tìm, thống kê, phân trang qua 28 hồ sơ mô phỏng, file CSV thực từ Chromium, giao diện di động.
- CI không ghi hồ sơ giả vào Supabase, không sử dụng mật khẩu thật.
