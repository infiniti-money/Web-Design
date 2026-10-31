# ATELIER HOME — Website thiết kế nội thất

Website nội thất tiếng Việt, responsive, kết nối Supabase và GitHub Pages.

## Trạng thái hiện tại — 31/10/2026

- **Website:** https://infiniti-money.github.io/Web-Design/
- **Quản trị:** https://infiniti-money.github.io/Web-Design/admin.html
- **Supabase:** `atelier-home-web-design`, project ref `mswiegltusllzvuavjdh`, Singapore.
- **Tài khoản quản trị:** 1 tài khoản email đã xác minh, được cấp `app_metadata.role = admin`. Không có mật khẩu trong mã nguồn.
- **Cơ sở dữ liệu:** `public.projects` với 6 dự án minh họa, `public.inquiries` chứa yêu cầu tư vấn riêng tư.
- **Quyền dữ liệu:** RLS bật; khách chỉ được xem dự án published, **không được đọc hoặc ghi trực tiếp vào bảng khách hàng**.
- **Turnstile:** mã widget và Siteverify đã tích hợp, **đã kích hoạt bằng Sitekey công khai** và xác minh token ở máy chủ; thử token giả trả HTTP 403. Đã kiểm thử một lần gửi biểu mẫu thực tế và xác nhận xuất hiện trong Admin ngày 31/10/2026; xem [TURNSTILE_SETUP.md](TURNSTILE_SETUP.md).
- **Biểu mẫu:** gọi Supabase Edge Function `submit-inquiry`; API yêu cầu `privacy_consent=true`, ghi nhận thời điểm và phiên bản chính sách `2026-10-31-retention-12m`, kiểm tra đầu vào, honeypot, nguồn gọi và hạn chế tần suất (3 lần/giờ theo IP, 5 lần/ngày theo số điện thoại). Chỉ mã máy chủ giữ khóa đặc quyền.
- **Triển khai:** GitHub Pages được xuất bản bằng quy trình Jekyll tự động từ nhánh chính. Release GitHub riêng đóng gói phiên bản tải xuống.

## Thành phần mã nguồn

- `index.html` — trang chủ, danh mục dự án, bộ lọc, biểu mẫu tư vấn.
- `admin.html`, `admin.js` — đăng nhập Supabase Auth, quản lý dự án/khách hàng, tìm kiếm và lọc phía Supabase, thống kê toàn hệ thống, phân trang 25 hồ sơ và xuất CSV trang hiện tại.
- `app-config.js` — Project URL và publishable key công khai (không chứa secret).
- `site-backend.js` — lấy dự án từ Supabase, gửi form qua Edge Function.
- `supabase/schema.sql` — dữ liệu và chính sách RLS.
- `supabase/inquiry-rate-limit.sql` — RPC atomic và cơ chế hạn chế gửi.
- `supabase/privacy-consent.sql` — migration bổ sung dấu thời gian đồng ý.
- `supabase/inquiry-retention-12m.sql` — hạn lưu 12 tháng, ghi nhận liên hệ, tác vụ xóa tự động hằng ngày; có ngoại lệ nghĩa vụ pháp lý.
- `supabase/admin-contact-rpc.sql` — RPC theo giờ máy chủ để ghi nhận liên hệ, tuân thủ RLS Admin.
- `supabase/customer-care-v1_6.sql` — hồ sơ chăm sóc, ghi chú riêng tư, lịch nhắc liên hệ và phân quyền Admin.
- `supabase/customer-care-audit-v1_6.sql` — tự ghi lịch sử khi liên hệ thật/chuyển trạng thái trên máy chủ.
- `supabase/customer-care-edit-v1_7.sql` — chỉnh sửa ghi chú qua RPC có đối chiếu phiên bản, ghi lịch sử trước/sau, chặn sửa ghi chú hệ thống và hoàn thành nhắc việc.
- `supabase/customer-care-tasks-v1_8.sql` — phân công chăm sóc, trạng thái, ưu tiên, thời hạn, RLS và lịch sử cập nhật nhiệm vụ.
- `supabase/functions/submit-inquiry/index.ts` — mã Edge Function đang chạy tại Supabase.
- `SUPABASE_SETUP.md` — hướng dẫn bảo mật và vận hành.
- `privacy.html` — chính sách quyền riêng tư: đơn vị Tân Design, địa chỉ chủ website cung cấp và email tiếp nhận `infinitimoney@icloud.com`; chưa có xác minh đăng ký pháp lý, đã cấu hình giữ dữ liệu 12 tháng.
- `TURNSTILE_SETUP.md` — cấu hình Cloudflare widget và Supabase Edge secrets.
- `EMAIL_NOTIFICATIONS_SETUP.md` — hướng dẫn kích hoạt gửi email tự động qua Resend bằng secrets phía máy chủ.
- `tests/admin-rls-rollback.sql` — kiểm thử phân quyền admin có hoàn tác.

## Kiểm thử

```bash
node --test tests/static.test.cjs tests/email-notification.test.cjs
```

GitHub Actions cũng chạy bài kiểm thử API, trình duyệt Chromium và thiết bị iPhone giả lập; ảnh kiểm thử được lưu có thời hạn. Không cần gửi mật khẩu quản trị cho hệ thống kiểm thử.

## CRM v1.7 — Hồ sơ, lịch sử chỉnh sửa và hoàn thành lịch nhắc

- Admin mở hồ sơ bằng nút **Hồ sơ** bên cạnh yêu cầu tư vấn, xem thông tin, trạng thái, ngày đồng ý và hạn xóa.
- **Ghi chú chăm sóc (v1.7)** hỗ trợ nút **Sửa ghi chú** cho nội dung do Admin nhập. Nội dung cũ được giữ trong nhật ký chỉnh sửa cùng thời điểm và người sửa; ghi chú hệ thống không cho sửa. Khi xóa hồ sơ hoặc hết thời hạn 12 tháng, ghi chú và lịch sử chỉnh sửa đều bị xóa.
- **Nhắc liên hệ** chọn ngày giờ, có thể hủy/đặt lại hoặc **Hoàn thành công việc** mà không tự ghi nhận đã liên hệ; KPI **Đến lịch liên hệ** và bộ lọc **Đến hạn / 7 ngày tới** hiển thị ngay trong trang Admin. Đây là thông báo *trong ứng dụng*, không tự gửi email/thông báo đẩy.
- Các lần Admin xác nhận đã liên hệ và chuyển trạng thái được lưu thành sự kiện lịch sử theo giờ máy chủ trong cùng một giao dịch.
- **Spinner** phản hồi trạng thái tải khi truy vấn danh sách, có chế độ giảm chuyển động cho người dùng nhạy cảm với hiệu ứng.
- Phần email vẫn để sau theo lựa chọn chủ website, không yêu cầu secret mới và không đổi gói Supabase.

## CRM v1.9 — Bảng Kanban

- Tab **Công việc chăm sóc** hỗ trợ **Danh sách** và **Bảng Kanban**. Kanban có 3 cột: Chờ thực hiện / Đang thực hiện / Hoàn thành, nút Bắt đầu / Hoàn thành / Mở lại.
- Mỗi thẻ có tên công việc, khách hàng, người phụ trách, hạn và mức ưu tiên. Quá hạn được hiển thị nổi bật.
- Bộ lọc và phân trang giữ nguyên; Kanban chỉ thể hiện tối đa 25 công việc trên **trang hiện tại**. Các KPI tổng tính từ Supabase.
- Mọi chuyển trạng thái được RLS kiểm soát, đồng thời ghi sự kiện bởi trigger Supabase. Tài khoản người phụ trách vẫn chỉ là tên hiển thị, chưa cấp đăng nhập riêng.

## CRM v1.8 — Quản lý giao việc & tiến độ

- Mở **Hồ sơ khách hàng → Phân công chăm sóc** để tạo việc, chỉ định tên người phụ trách, mô tả, hạn, mức ưu tiên; cập nhật tiến độ **Chờ thực hiện / Đang làm / Hoàn thành**.
- Tab **Công việc chăm sóc** thống kê số việc toàn bộ khách hàng và công việc quá hạn, lọc theo người phụ trách / trạng thái / hạn; danh sách phân trang 25 việc.
- **Lịch sử giao việc** ghi nhận người phụ trách ban đầu, chuyển người, thay đổi tiến độ bằng trigger SQL; chỉ Admin xem được nhật ký.
- Người nhận việc **chỉ được ghi bằng tên**, không tự có tài khoản hoặc quyền truy cập dữ liệu khách hàng. Email/đẩy thông báo chưa cấu hình theo yêu cầu chủ website.
- Giữ nguyên RLS bảo vệ khách hàng và hạn lưu/xóa 12 tháng; nhiệm vụ và lịch sử cũng tự xóa khi xóa hồ sơ khách hàng.

## Lưu ý quan trọng trước khi kinh doanh

- Giới hạn tốc độ và honeypot là các biện pháp chống spam cơ bản; **Turnstile đã bật và từ chối token giả**, nhưng vẫn không thể bảo đảm chặn mọi loại bot/tấn công phân tán.
- Mã gửi email thông báo khi nhận khách mới đã triển khai trong Edge Function v6, **chưa xác minh kích hoạt gửi thực tế** do thiếu cấu hình provider được xác nhận. Đã công bố thông tin liên hệ Tân Design do chủ website cung cấp, nhưng chưa có thông tin xác minh đăng ký pháp lý, đã phê duyệt thời hạn 12 tháng và bật xóa tự động hằng ngày; vẫn cần đánh giá nghĩa vụ lưu giữ theo pháp luật.
- Hình ảnh Unsplash, tên công trình và các mô tả trong dữ liệu mẫu **không phải công trình đã thi công thực tế**.
- Đã kiểm thử quyền thêm/sửa/xóa dự án và RPC ghi nhận liên hệ theo thời gian máy chủ; non-admin không thể ghi nhận, giao dịch thử được hoàn tác. Kiểm thử UI bằng Supabase mock trong Chromium; chưa thử đăng nhập bằng mật khẩu thật.
- Không được đưa `sb_secret_`, `service_role`, mật khẩu hoặc token nhạy cảm vào frontend/GitHub.

CRM v1.5.0 truy vấn **phân trang 25 hồ sơ/lần** sau khi Admin xác thực. Tìm kiếm và bộ lọc chạy trong Supabase; thống kê tổng khách, số yêu cầu mới, đã liên hệ và đã báo giá dùng `count: exact` từ dữ liệu đầy đủ, không còn dựa trên 200 hồ sơ đã tải. Nút **Xuất CSV trang này** chỉ xuất tối đa 25 hồ sơ đang hiện và yêu cầu xác nhận; CSV có bảo vệ khỏi công thức bảng tính. Không gửi tệp ra máy chủ bên thứ ba; file chỉ được tạo trong trình duyệt Admin. Khi tìm kiếm bằng tên tiếng Việt ở máy chủ, nên nhập chữ có dấu phù hợp. Dữ liệu chỉ hiển thị sau khi đăng nhập tài khoản Admin được xác minh.

Chi tiết: [SUPABASE_SETUP.md](SUPABASE_SETUP.md) và [EMAIL_NOTIFICATIONS_SETUP.md](EMAIL_NOTIFICATIONS_SETUP.md).
