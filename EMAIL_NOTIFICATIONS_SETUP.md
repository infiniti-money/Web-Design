# ATELIER HOME / Tân Design — Thông báo email khi có yêu cầu tư vấn mới

## Trạng thái thực tế
- Edge Function `submit-inquiry` v6 đã tích hợp gọi Resend sau khi lưu yêu cầu thành công.
- Người nhận cố định: `infinitimoney@icloud.com`.
- **Chưa xác nhận gửi email thực tế** vì chưa có thông tin xác minh rằng `RESEND_API_KEY` và `NOTIFY_FROM_EMAIL` đã được lưu ở Supabase, cũng như địa chỉ người gửi đã được xác thực.
- Không yêu cầu đổi gói Supabase Free; việc sử dụng nhà cung cấp gửi thư có thể có mức giới hạn hoặc chi phí riêng.
- Không phát email cho những yêu cầu đã lưu trước khi tính năng được kích hoạt.

## Bật gửi thư thực tế (chủ tài khoản thực hiện)

1. Đăng ký/đăng nhập https://resend.com, xác minh domain gửi email của Tân Design trong https://resend.com/domains (cần quyền quản lý DNS). **Email iCloud hiện tại được dùng để nhận thư, không thể mặc định dùng làm địa chỉ gửi xác thực của Resend.**
2. Tạo API key chỉ đủ quyền gửi thư tại https://resend.com/api-keys; tuyệt đối không chia sẻ khóa trong ChatGPT, GitHub hoặc Javascript công khai.
3. Mở https://supabase.com/dashboard/project/mswiegltusllzvuavjdh/functions/secrets và tạo 2 secrets:
   - `RESEND_API_KEY` = Resend API key bí mật.
   - `NOTIFY_FROM_EMAIL` = địa chỉ người gửi thuộc domain đã xác minh, ví dụ `notify@domain-cua-ban.vn` (ví dụ minh họa, **không** dùng nếu chưa xác minh).
4. Lưu secrets. Thử gửi **một** yêu cầu tư vấn mới từ website https://infiniti-money.github.io/Web-Design/#contact, hoàn tất Turnstile; sau đó kiểm tra `infinitimoney@icloud.com` và thư rác.
5. Nếu không nhận được email, mở Supabase Functions → `submit-inquiry` → Logs, tìm mã `consultation_notification_failed`, `consultation_notification_error`, hoặc `consultation_notification_sender_invalid` (không tiết lộ API key).

## Quy tắc bảo mật/giới hạn
- Địa chỉ người nhận được cố định trong Edge Function, không lấy từ người dùng nhập form.
- Chỉ email thông báo có yêu cầu mới và dịch vụ quan tâm; **không đưa tên, số điện thoại, nội dung nhu cầu hoặc mã thông tin của khách vào email**.
- Form chỉ gửi email sau khi đã vượt qua Turnstile và lưu DB thành công. Lỗi email không làm hỏng việc tiếp nhận lead.
- Header `Idempotency-Key` chứa mã hồ sơ để hạn chế gửi trùng khi retry cùng yêu cầu.
- Hiện là **một lần thử gửi, chưa có hàng đợi tự động retry**. Nếu nhà cung cấp email gặp lỗi, lead vẫn lưu trong Admin và cần theo dõi bảng điều khiển thường xuyên.
- Mỗi email mới có thể cần tới ~6 giây để gửi nếu provider chậm; có thể tối ưu bằng hàng đợi ở giai đoạn sau.
