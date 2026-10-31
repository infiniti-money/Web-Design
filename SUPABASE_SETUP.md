# ATELIER HOME — Supabase vận hành và bảo mật

## Trạng thái đã xác minh

- Project: `atelier-home-web-design`, ref `mswiegltusllzvuavjdh`, khu vực Singapore.
- Các bảng `public.projects`, `public.inquiries` đã bật RLS; 6 dự án minh họa đang hiển thị.
- **Một tài khoản quản trị đã xác minh email và được cấp vai trò `admin` trong `app_metadata`.** Không tạo thêm tài khoản mặc định.
- Trang chủ: https://infiniti-money.github.io/Web-Design/
- Trang admin: https://infiniti-money.github.io/Web-Design/admin.html
- GitHub Pages đang dùng quy trình triển khai Jekyll tự động trên `main`. Quy trình `Publish ATELIER HOME` chỉ tạo GitHub Release, tránh deploy trùng.
- Không có khóa service-role hoặc mật khẩu trong frontend.

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
- Biểu mẫu yêu cầu người dùng xác nhận đồng ý trước khi gửi; Edge Function kiểm tra `privacy_consent === true`. Cơ sở dữ liệu ghi `consented_at` và `privacy_policy_version` cho yêu cầu được tiếp nhận, phiên bản hiện tại `2026-10-31`.
- Browser không được `INSERT/SELECT/UPDATE/DELETE` vào `public.inquiries`. Edge Function dùng khóa server-side nằm trong biến môi trường Supabase.
- SQL logic: `supabase/inquiry-rate-limit.sql`; Edge source: `supabase/functions/submit-inquiry/index.ts`.
- SQL migration đã áp dụng: `secure_inquiry_rate_limit_and_rpc`, `block_direct_anonymous_inquiry_inserts`, và `record_inquiry_privacy_consent_version`. Không chạy lại migration trên dữ liệu thật mà chưa kiểm tra lịch sử.
- Khi Edge Function không sẵn sàng, form không tự lưu cục bộ và không báo thành công giả.

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
- Xây dựng trang chính sách quyền riêng tư với địa chỉ/đầu mối pháp lý thực, mục đích, thời hạn lưu và quyền xóa dữ liệu.
- Bổ sung thông báo email, sao lưu, nhật ký hoạt động và giám sát bất thường.
- Thay tất cả dữ liệu và ảnh minh họa bằng công trình đã được phép công bố.

## 5. Tài liệu

- [Supabase Dashboard](https://supabase.com/dashboard/project/mswiegltusllzvuavjdh)
- [GitHub repository](https://github.com/infiniti-money/Web-Design)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
