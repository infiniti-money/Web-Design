# ATELIER HOME — Supabase vận hành và bảo mật

## Trạng thái đã xác minh

- Project: `atelier-home-web-design`, ref `mswiegltusllzvuavjdh`, khu vực Singapore.
- Các bảng `public.projects`, `public.inquiries` đã bật RLS; 6 dự án minh họa đang hiển thị.
- **Một tài khoản quản trị đã xác minh email và được cấp vai trò `admin` trong `app_metadata`.** Không tạo thêm tài khoản mặc định.
- Trang chủ: https://infiniti-money.github.io/Web-Design/
- Trang admin: https://infiniti-money.github.io/Web-Design/admin.html
- GitHub Pages đang dùng quy trình triển khai Jekyll tự động trên `main`. Quy trình `Publish ATELIER HOME` chỉ tạo GitHub Release, tránh deploy trùng.
- Không có khóa service-role hoặc mật khẩu trong frontend.

## CRM phân trang và xuất dữ liệu v1.5.0

- Chỉ Admin xác minh mới đọc hồ sơ tư vấn theo RLS; truy vấn thông qua Supabase publishable key và JWT, **không** dùng service-role trên trình duyệt.
- Danh sách phân trang 25 hồ sơ. Tìm kiếm và lọc áp dụng phía máy chủ trước khi phân trang; `count: exact` hiển thị số hồ sơ phù hợp.
- Bảng thống kê `count: exact` cho tổng số yêu cầu, mới hôm nay theo giờ Việt Nam, trạng thái `new`, `contacted`, `quoted`.
- Nút **Xuất CSV trang này** ghi dữ liệu của tối đa 25 hồ sơ đang xem (không phải tất cả hồ sơ); tệp được tạo cục bộ trên thiết bị Admin, yêu cầu xác nhận và giảm thiểu CSV/Excel formula injection. Phải bảo vệ/xóa tệp tải về theo chính sách dữ liệu cá nhân.
- Việc lọc dữ liệu sử dụng cú pháp PostgREST với từ khóa được giới hạn ký tự để chống chèn thêm điều kiện. Tìm tên tiếng Việt bằng dấu tương ứng để đạt kết quả chính xác; chưa hỗ trợ tìm không dấu hoàn chỉnh trên toàn bộ cơ sở dữ liệu.
- Không thay đổi cơ chế xóa dữ liệu sau 12 tháng. Cấu hình email vẫn để sau theo quyết định của chủ website.

## Hồ sơ và nhắc liên hệ v1.6.0 (đã áp dụng trên dự án hiện tại)

- `public.inquiries.follow_up_at`: mốc nhắc liên hệ trong Admin (UTC, hiển thị bằng múi giờ trình duyệt).
- `public.inquiry_care_notes`: ghi chú và nhật ký nhắc, chỉ Admin có thể đọc/thêm; không cấp SELECT cho anon. Có `ON DELETE CASCADE` để xóa cùng hồ sơ sau 12 tháng hoặc khi quản trị viên xóa hợp lệ.
- `public.schedule_inquiry_followup`: RPC Security Invoker, kiểm tra thời hạn 12 tháng và ghi dấu đặt/hủy lịch nguyên tử.
- `public.record_inquiry_contact` và `public.update_inquiry_status_with_log`: ghi dấu liên hệ và thay trạng thái atomically trong nhật ký chăm sóc; vẫn kế thừa RLS.
- SQL nguồn `supabase/customer-care-v1_6.sql` và `supabase/customer-care-audit-v1_6.sql` đã chạy trên Supabase. Đừng chạy lại các policy mà chưa kiểm tra migration.
- Ghi chú là dữ liệu cá nhân, phải được sử dụng đúng mục đích tư vấn; không tự động gửi thư hay thông báo hệ thống ngoài Admin.
- Kiểm thử với bản ghi giả trong `BEGIN...ROLLBACK` cho thêm ghi chú, đặt lịch, cập nhật trạng thái và chặn non-admin; không còn bản ghi giả.

## 1. Đăng nhập quản trị

1. Mở `/admin.html` của website.
2. Sử dụng email đã xác minh và mật khẩu của chính bạn.
3. **Đăng xuất rồi đăng nhập lại** nếu mới được cấp vai trò, để JWT được làm mới.
4. Thử tạo dự án nháp, sửa mô tả, xuất bản và ẩn. Thử xem danh sách tư vấn; xác minh người thường không thấy khách hàng.

Không chia sẻ mật khẩu trong chat và không đặt mật khẩu trong GitHub. Không sử dụng `user_metadata` để quyết định quyền quản trị.

## 2. Tiếp nhận tư vấn có bảo vệ

Mô hình luồng dữ liệu:

```text
Visitor form -> Supabase Edge Function submit-inquiry
             -> validate + honeypot + CORS Origin
             -> HMAC SHA-256 network/phone time-window keys
             -> public.submit_inquiry_secure RPC (service_role only)
             -> rate limit atomic transaction in private.inquiry_rate_limits
             -> public.inquiries (RLS protected)
```

- Limit hiện tại: **3 yêu cầu / giờ theo mạng IP** và **5 yêu cầu / ngày theo điện thoại**. Giới hạn tính theo từng cửa sổ UTC; không phải thuật toán trượt. Một số IP dùng chung có thể bị giới hạn sớm.
- Chỉ lưu dấu vân tay HMAC của mạng/điện thoại trong bảng private; không lưu trực tiếp IP trong bảng giới hạn.
- Biểu mẫu yêu cầu người dùng xác nhận đồng ý trước khi gửi; Edge Function kiểm tra `privacy_consent === true`. Cơ sở dữ liệu ghi `consented_at` và `privacy_policy_version` cho yêu cầu được tiếp nhận, phiên bản hiện tại `2026-10-31-retention-12m`.
- Hạn lưu dữ liệu khách hàng là **12 tháng từ lần liên hệ cuối cùng được quản trị viên đánh dấu**; nếu chưa có liên hệ, từ thời điểm tạo yêu cầu. Supabase Cron job `atelier-inquiry-retention-12m` chạy 09:35 giờ Việt Nam mỗi ngày để xóa hồ sơ hết hạn, trừ hồ sơ có `legal_hold_until` chưa hết hạn. Admin có thao tác `Ghi nhận liên hệ` trong giao diện. Khi Admin xác nhận đã liên hệ, client gọi RPC `public.record_inquiry_contact`, máy chủ ghi thời gian `now()` và cập nhật trạng thái trong một giao dịch, không tin đồng hồ điện thoại hoặc PC. SQL: `supabase/inquiry-retention-12m.sql` và `supabase/admin-contact-rpc.sql`.
- Browser không được `INSERT/SELECT/UPDATE/DELETE` vào `public.inquiries`. Edge Function dùng khóa server-side nằm trong biến môi trường Supabase.
- SQL logic: `supabase/inquiry-rate-limit.sql`; Edge source: `supabase/functions/submit-inquiry/index.ts`.
- SQL migration đã áp dụng: `secure_inquiry_rate_limit_and_rpc`, `block_direct_anonymous_inquiry_inserts`, và `record_inquiry_privacy_consent_version`. Không chạy lại migration trên dữ liệu thật mà chưa kiểm tra lịch sử.
- Khi Edge Function không sẵn sàng, form không tự lưu cục bộ và không báo thành công giả.
- Edge Function `submit-inquiry` v6 có chức năng **thử gửi** email thông báo bằng Resend khi DB ghi thành công. Chỉ dùng `RESEND_API_KEY` và `NOTIFY_FROM_EMAIL` từ Supabase Secrets; không gửi PII của khách qua email. **Chưa xác minh đã kích hoạt** do nhà cung cấp và địa chỉ gửi cần cấu hình; xem `EMAIL_NOTIFICATIONS_SETUP.md`. Email lỗi không làm mất yêu cầu tư vấn.

**Giới hạn cần lưu ý:** CORS và header Origin không chứng minh danh tính người gửi; bot có thể giả lập header hoặc thay IP. Rate limiting + honeypot chỉ giảm một số kiểu spam. Cloudflare Turnstile đã kích hoạt; phép thử bằng token giả trả 403. Cần thử một yêu cầu hợp lệ thật để xác nhận trọn vòng. Không dùng dữ liệu thử làm thông tin liên hệ thật.

## 3. Kiểm thử đã chạy

- API chấp nhận yêu cầu thử hợp lệ; dữ liệu thử đã được xóa.
- API từ chối phương thức không hỗ trợ, JSON sai, Origin lạ, honeypot, thiếu đồng ý và challenge Turnstile giả. Thử chức năng tạo bản ghi đồng ý bằng transaction có `ROLLBACK`.
- Kiểm thử Chromium website thật: danh mục 6 dự án, bộ lọc, modal, trang đăng nhập, điện thoại; gửi form qua Edge API được *giả lập phản hồi thành công* để tránh lưu dữ liệu cá nhân.
- Supabase đã xác nhận `anon` không có quyền trực tiếp ghi/đọc `inquiries`; chỉ vai trò server có quyền gọi RPC.
- Chưa có kiểm thử đăng nhập bằng mật khẩu thật hay đầy đủ CRUD admin sau phiên đăng nhập.

## 4. Các yêu cầu trước khi mở rộng

- Turnstile đã được xác minh chặn token giả bằng HTTP 403; kiểm thử thủ công một lượt gửi hợp lệ với token thật.
- Bật Leaked Password Protection tại [Supabase Auth](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) nếu gói dịch vụ hỗ trợ.
- Chính sách quyền riêng tư đã hiển thị tên Tân Design, địa chỉ, email tiếp nhận và thời hạn lưu **12 tháng** đã được chủ website quyết định. Cần chủ website xác minh địa chỉ hành chính/tư cách pháp lý và quy trình yêu cầu xóa trước hạn.
- Hoàn tất cấu hình API key và domain gửi email rồi kiểm thử gửi thực; bổ sung sao lưu, nhật ký hoạt động và giám sát bất thường.
- Thay tất cả dữ liệu và ảnh minh họa bằng công trình đã được phép công bố.

## 5. Tài liệu

- [Supabase Dashboard](https://supabase.com/dashboard/project/mswiegltusllzvuavjdh)
- [GitHub repository](https://github.com/infiniti-money/Web-Design)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
