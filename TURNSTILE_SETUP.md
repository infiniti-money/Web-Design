# Cloudflare Turnstile — ATELIER HOME

## Trạng thái 31/10/2026
- **Đã triển khai:** mã widget trong frontend và kiểm tra token qua Cloudflare Siteverify trong Supabase Edge Function `submit-inquiry` (version 3).
- **Chưa kích hoạt bảo vệ Turnstile trên website thật:** chưa có sitekey thực tế và `TURNSTILE_SECRET_KEY` từ tài khoản Cloudflare. Hệ thống hiện vẫn sử dụng validation, honeypot, giới hạn 3 lần/giờ theo IP và 5 lần/ngày theo số điện thoại.
- **Không dùng khóa thử nghiệm Cloudflare trên production.** Khóa thử nghiệm luôn vượt thử thách và không ngăn bot.

## Bước kích hoạt (chủ tài khoản Cloudflare)
1. Tại https://dash.cloudflare.com/ mở **Turnstile** → **Add widget**.
2. Tên widget: `ATELIER HOME - consultation`. Chọn **Managed**. Hostname: `infiniti-money.github.io` (chỉ hostname, không phải URL/path). Tạo widget.
3. **Lưu secret key trực tiếp tại Supabase Dashboard**: https://supabase.com/dashboard/project/mswiegltusllzvuavjdh/functions/secrets — tên biến: `TURNSTILE_SECRET_KEY`. **Không dán secret vào GitHub hoặc chat.**
4. Trong GitHub repository `infiniti-money/Web-Design`, sửa `app-config.js`: `turnstileSiteKey: "SITEKEY_CONG_KHAI_CUA_BAN"` (sitekey được phép công khai). GitHub Actions sẽ xuất bản website.
5. Truy cập website và thử gửi 1 yêu cầu hợp lệ sau khi hoàn thành xác minh; kiểm tra trong Supabase Admin. Kiểm tra gửi thiếu token hoặc dùng token sai bị từ chối 403. Kiểm tra token hết hạn và gửi lại sau khi được làm mới.

**Lưu ý khi kích hoạt:** Cài secret trước sẽ khiến API yêu cầu CAPTCHA ngay, trong khi giao diện chưa có sitekey, do đó có thể ngắt tạm thời khả năng gửi yêu cầu trong vài phút giữa hai bước. Hãy thực hiện trong thời gian bảo trì hoặc chuẩn bị commit sitekey ngay sau đó. Nếu cấu hình sitekey trước secret, frontend sẽ yêu cầu token nhưng Edge API trả 503, không chấp nhận yêu cầu giả thành công. Không nên bật từng phần khi đang có khách gửi biểu mẫu.

## Lưu ý kiểm thử
- Widget test sitekey Cloudflare `1x00000000000000000000AA` chỉ được sử dụng trong môi trường Playwright mô phỏng. **Không lưu trên production.**
- Edge Function gọi `https://challenges.cloudflare.com/turnstile/v0/siteverify` với secret từ biến môi trường; yêu cầu `success=true`, `hostname=infiniti-money.github.io` và `action=consultation`.
- Token có hiệu lực tối đa 5 phút, chỉ dùng 1 lần. Frontend reset widget sau mỗi yêu cầu gửi.
- Kiểm tra RLS, không đưa khóa `service_role`/secret vào mã trình duyệt.
- CORS Origin không phải xác thực chống bot; chỉ Siteverify mới bảo vệ challenge.

Nguồn: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
