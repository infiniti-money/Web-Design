# ATELIER HOME — Website thiết kế nội thất

Website nội thất tiếng Việt, responsive, kết nối Supabase và GitHub Pages.

## Trạng thái hiện tại — 31/10/2026

- **Website:** https://infiniti-money.github.io/Web-Design/
- **Quản trị:** https://infiniti-money.github.io/Web-Design/admin.html
- **Supabase:** `atelier-home-web-design`, project ref `mswiegltusllzvuavjdh`, Singapore.
- **Tài khoản quản trị:** 1 tài khoản email đã xác minh, được cấp `app_metadata.role = admin`. Không có mật khẩu trong mã nguồn.
- **Cơ sở dữ liệu:** `public.projects` với 6 dự án minh họa, `public.inquiries` chứa yêu cầu tư vấn riêng tư.
- **Quyền dữ liệu:** RLS bật; khách chỉ được xem dự án published, **không được đọc hoặc ghi trực tiếp vào bảng khách hàng**.
- **Turnstile:** mã widget và Siteverify đã tích hợp, **chưa kích hoạt** vì chưa có sitekey/secret thực từ Cloudflare; xem [TURNSTILE_SETUP.md](TURNSTILE_SETUP.md).
- **Biểu mẫu:** gọi Supabase Edge Function `submit-inquiry`; API yêu cầu `privacy_consent=true`, ghi nhận thời điểm và phiên bản chính sách `2026-10-31`, kiểm tra đầu vào, honeypot, nguồn gọi và hạn chế tần suất (3 lần/giờ theo IP, 5 lần/ngày theo số điện thoại). Chỉ mã máy chủ giữ khóa đặc quyền.
- **Triển khai:** GitHub Pages được xuất bản bằng quy trình Jekyll tự động từ nhánh chính. Release GitHub riêng đóng gói phiên bản tải xuống.

## Thành phần mã nguồn

- `index.html` — trang chủ, danh mục dự án, bộ lọc, biểu mẫu tư vấn.
- `admin.html`, `admin.js` — đăng nhập Supabase Auth; quản lý dự án và khách hàng, có phân quyền.
- `app-config.js` — Project URL và publishable key công khai (không chứa secret).
- `site-backend.js` — lấy dự án từ Supabase, gửi form qua Edge Function.
- `supabase/schema.sql` — dữ liệu và chính sách RLS.
- `supabase/inquiry-rate-limit.sql` — RPC atomic và cơ chế hạn chế gửi.
- `supabase/privacy-consent.sql` — migration bổ sung dấu thời gian đồng ý.
- `supabase/functions/submit-inquiry/index.ts` — mã Edge Function đang chạy tại Supabase.
- `SUPABASE_SETUP.md` — hướng dẫn bảo mật và vận hành.
- `privacy.html` — chính sách quyền riêng tư (còn thiếu thông tin pháp lý chủ website và đầu mối dữ liệu).
- `TURNSTILE_SETUP.md` — cấu hình Cloudflare widget và Supabase Edge secrets.
- `tests/admin-rls-rollback.sql` — kiểm thử phân quyền admin có hoàn tác.

## Kiểm thử

```bash
node --test tests/static.test.cjs
```

GitHub Actions cũng chạy bài kiểm thử API, trình duyệt Chromium và thiết bị iPhone giả lập; ảnh kiểm thử được lưu có thời hạn. Không cần gửi mật khẩu quản trị cho hệ thống kiểm thử.

## Lưu ý quan trọng trước khi kinh doanh

- Giới hạn tốc độ và honeypot là các biện pháp chống spam cơ bản; **Turnstile đã có mã nhưng chưa được bật bằng khóa thật**, chưa chống mọi loại bot/tấn công phân tán.
- Chưa có email thông báo khi nhận khách mới và thông tin pháp nhân/đầu mối quyền riêng tư đã xác minh. Trang chính sách hiện minh bạch tình trạng chưa hoàn thiện; chưa có xóa dữ liệu tự động.
- Hình ảnh Unsplash, tên công trình và các mô tả trong dữ liệu mẫu **không phải công trình đã thi công thực tế**.
- Đã thử INSERT/UPDATE/DELETE và từ chối non-admin trong PostgreSQL bằng JWT mô phỏng và ROLLBACK. Kiểm thử UI CRUD bằng Supabase mock trong Chromium; chưa thử đăng nhập bằng mật khẩu thật.
- Không được đưa `sb_secret_`, `service_role`, mật khẩu hoặc token nhạy cảm vào frontend/GitHub.

Chi tiết: [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
