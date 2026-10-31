# ATELIER HOME v1.3.4 — Nghiệm thu an toàn và thời gian liên hệ chính xác

## Hoàn thiện
- Ghi nhận liên hệ qua PostgreSQL RPC `public.record_inquiry_contact` với `SECURITY INVOKER`, kế thừa chính sách phân quyền RLS admin.
- Thời điểm liên hệ dùng đồng hồ máy chủ `now()`, không dùng đồng hồ của thiết bị quản trị.
- Lúc ghi nhận, trạng thái `new` tự chuyển sang `contacted` trong cùng một giao dịch.
- RPC chỉ được cấp quyền thực thi cho `authenticated`; chính sách RLS chỉ cho phép admin thực hiện thay đổi.
- Bổ sung kiểm thử PostgreSQL có rollback: Admin ghi liên hệ, thời điểm đúng, non-admin bị chặn; không để lại khách hàng giả.
- Bộ kiểm thử Chromium mô phỏng thao tác ghi nhận liên hệ của Admin và xác nhận danh sách cập nhật.
- Nâng cấp tài liệu vận hành, giữ nguyên giới hạn lưu dữ liệu 12 tháng và Cron tự động xóa hằng ngày.

## Nghiệm thu cần chủ website thực hiện
1. Mở https://infiniti-money.github.io/Web-Design/ rồi gửi yêu cầu tư vấn **thực tế** qua Cloudflare Turnstile (chỉ cung cấp thông tin liên hệ của chính bạn).
2. Đăng nhập https://infiniti-money.github.io/Web-Design/admin.html và xác minh yêu cầu đã tới danh sách tư vấn.
3. Sau khi liên hệ thật, bấm `Ghi nhận liên hệ` rồi kiểm tra thời điểm ghi nhận và hạn xóa mới.
4. Chỉ khi thử thành công mới đánh dấu nghiệm thu quy trình người dùng cuối. Không chia sẻ mật khẩu/tokens trong chat.

## Còn cảnh báo
- Supabase Auth: Leaked Password Protection chưa bật, cần kích hoạt trên Dashboard nếu gói hỗ trợ.
- Chưa có email thông báo lead mới, chưa có kiểm thử với phiên Admin có mật khẩu thật từ CI.
