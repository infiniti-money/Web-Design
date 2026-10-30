# ATELIER HOME — Thiết kế nội thất

Website nội thất tiếng Việt, responsive; đã kết nối dự án Supabase thực tế.

## Trạng thái kết nối — 30/10/2026

- **Supabase:** `atelier-home-web-design` (ID `mswiegltusllzvuavjdh`), Singapore; trạng thái ACTIVE_HEALTHY.
- **Database:** `public.projects` (6 dự án minh họa) và `public.inquiries` (ban đầu trống).
- **RLS:** đã bật. Khách chỉ được đọc dự án published và gửi yêu cầu; không được xem hồ sơ người khác.
- **Frontend:** `app-config.js` đã chứa URL Supabase và khóa publishable. Không có khóa bí mật.
- **Admin:** `admin.html` hỗ trợ Supabase Auth và quản lý dự án/yêu cầu, nhưng **chưa có tài khoản admin**. Cần tạo user xác minh và gán `app_metadata.role=admin`.
- **GitHub Pages:** đã bật và có lần triển khai thành công. Website: https://infiniti-money.github.io/Web-Design/ ; trang quản trị: https://infiniti-money.github.io/Web-Design/admin.html. CI kiểm thử trình duyệt được chạy trên mỗi lần hoàn tất quy trình Publish ATELIER HOME.

Xem **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** để hoàn tất tạo tài khoản quản trị và kiểm thử.

## Tính năng

Trang chủ, dự án, bộ lọc, chi tiết, dịch vụ, giới thiệu, quy trình; kết nối Supabase lấy dự án xuất bản; form yêu cầu tư vấn; giao diện quản trị thêm/sửa/xóa dự án và xử lý trạng thái yêu cầu; CI kiểm tra cú pháp JavaScript, cấu trúc bảng và RLS.

## Lưu ý trước khi vận hành

- Chưa triển khai CAPTCHA, kiểm soát tần suất gửi phía máy chủ và thông báo email. Form public hiện cho phép anonymous INSERT và có nguy cơ bị spam.
- Nội dung thống kê, tên dự án và ảnh Unsplash đang mang tính minh họa, không phải bằng chứng dự án doanh nghiệp đã thực hiện.
- Chưa có dữ liệu pháp lý và chính sách quyền riêng tư hoàn thiện. Không thu thập thông tin khách thật quy mô lớn trước khi bổ sung bảo vệ dữ liệu.
- Supabase `sb_publishable_...` được phép công khai khi RLS hoạt động; **không** đưa `sb_secret_`, `service_role`, token riêng, mật khẩu hay JWT signing secret vào GitHub.
- Nếu lỗi mạng hoặc SDK, trang chủ có thể hiển thị dự án demo, không có nghĩa là dữ liệu kết nối đã tải thành công.

## Kiểm tra

```sh
node --test tests/static.test.cjs
```

Có thể dùng VS Code Live Server để thử website tĩnh. Đăng nhập quản trị tại `admin.html` sau khi cấp quyền cho người dùng.

Schema gốc: `supabase/schema.sql`. Tài liệu: `SUPABASE_SETUP.md`.

## Kiểm thử giao diện thực tế

Workflow **Browser smoke test (deployed site)** dùng Chromium kiểm tra tải trang, Supabase, bộ lọc, modal bàn phím, đăng nhập quản trị, giao diện điện thoại và hành vi an toàn khi CDN bị lỗi. Báo cáo còn lưu ảnh chụp màn hình máy tính, điện thoại và quản trị trong GitHub Actions (artifact có thời hạn lưu).
