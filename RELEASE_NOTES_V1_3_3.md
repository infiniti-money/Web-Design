# ATELIER HOME v1.3.3 — Lưu dữ liệu khách hàng tối đa 12 tháng

## Quy định Tân Design đã phê duyệt
- Hồ sơ tư vấn được giữ tối đa **12 tháng kể từ lần liên hệ cuối cùng đã được ghi nhận**.
- Nếu chưa có liên hệ với khách, mốc tính bắt đầu từ ngày gửi yêu cầu.
- Với nghĩa vụ lưu trữ theo pháp luật, hồ sơ có thể được đặt thời hạn giữ riêng (`legal_hold_until`) bởi quản trị viên có thẩm quyền.

## Đã triển khai lên Supabase
- Bổ sung `last_contacted_at` và `legal_hold_until` cho `public.inquiries`.
- Đã cài `pg_cron`, tạo job `atelier-inquiry-retention-12m` hoạt động hằng ngày lúc **09:35 giờ Việt Nam**.
- Cron gọi `private.purge_expired_inquiries()` để xóa hồ sơ quá hạn; không cấp quyền hàm cho người truy cập công khai.
- Kiểm thử trong transaction có `ROLLBACK`: xóa hồ sơ 14 tháng chưa liên hệ; giữ hồ sơ mới liên hệ và hồ sơ có legal hold; không còn dữ liệu giả.
- Chính sách quyền riêng tư công khai thời hạn, cơ chế tính và ngoại lệ pháp lý.
- Dashboard quản trị có nút `Ghi nhận liên hệ`, hiển thị ngày liên hệ cuối và hạn lưu dự kiến.
- Ghi phiên bản chính sách `2026-10-31-retention-12m` vào hồ sơ mới để quản lý chứng cứ đồng ý.

## Cần lưu ý
- Thao tác Ghi nhận liên hệ chỉ được nhấn khi thực sự đã trao đổi với khách.
- Tác vụ Cron chỉ xử lý dữ liệu `public.inquiries`, không tự xử lý bản sao lưu, email trao đổi bên ngoài hay dữ liệu của các dịch vụ khác.
- Việc xóa theo yêu cầu của chủ thể dữ liệu và xử lý ngoại lệ pháp lý vẫn cần quy trình quản trị.
- Tên đơn vị Tân Design, địa chỉ Tân Phú, Việt Yên, Hưng Yên và email infinitimoney@icloud.com theo thông tin chủ website; chưa xác minh đăng ký pháp lý.
