# ATELIER HOME / Tân Design v1.6.0 — Hồ sơ khách hàng & nhắc liên hệ

## Fix
- Sửa việc hiển thị ngày rỗng trong hồ sơ, đảm bảo không xuất hiện 01/01/1970.
- Thêm spinner trạng thái tải cho danh sách khách hàng, tránh hiển thị như giao diện đứng hoặc thao tác không phản hồi. Có hỗ trợ giảm hiệu ứng chuyển động.
- Đồng bộ lại số liệu thống kê trong danh sách sau khi thay đổi trạng thái / ghi nhận liên hệ.

## Nâng cấp
- Nút **Hồ sơ** bên cạnh mỗi khách hàng: xem dịch vụ, số điện thoại, nhu cầu, ngày gửi, trạng thái, lịch sử đồng ý và hạn lưu dữ liệu.
- **Ghi chú chăm sóc** lưu thành dòng thời gian có người tạo và thời điểm ghi nhận; không ghi đè lịch sử.
- **Nhắc liên hệ** theo ngày giờ, sửa bằng cách đặt lại, hủy lịch; tự nhận diện **đến hạn / quá hạn**, danh sách **7 ngày tới**, KPI số việc đến hạn.
- Lịch sử ghi cả thao tác **đã thực sự liên hệ** và chuyển trạng thái; mọi thay đổi này có transaction trên server.
- Ghi chú chỉ được xem/thêm bởi Admin theo PostgreSQL RLS; bị xóa theo hồ sơ khi hết thời hạn lưu **12 tháng**.
- Không tự gửi email, tin nhắn, thông báo đẩy: lịch nhắc trong trang Admin, để email sau theo yêu cầu.

## Kiểm thử
- Migration đã thực hiện trên Supabase hiện tại, không tạo dự án hoặc cơ sở dữ liệu mới.
- Dữ liệu kiểm thử SQL chạy trong BEGIN/ROLLBACK: Admin thêm và đọc ghi chú, đặt lịch, chặn non-admin, ghi nhận liên hệ / trạng thái; không giữ dữ liệu giả.
- CI kiểm thử cấu trúc bảo mật; Chromium giả lập tài khoản Admin xác minh thao tác ghi chú, đặt/hủy lịch, bộ lọc, phân trang, xuất CSV, giao diện di động.
- Không dùng tài khoản/mật khẩu Admin thật trong CI; chưa nghiệm thu thao tác chăm sóc trên trình duyệt Admin thật.

## Giới hạn
- Tối đa 100 lịch sử gần nhất hiển thị trong một lần mở hồ sơ.
- Lịch nhắc chỉ được xem khi Admin đăng nhập và mở trang; chưa có nhắc tự phát qua email hoặc điện thoại.
- Thời gian nhập theo múi giờ thiết bị quản trị. Đặt thời điểm trong giới hạn 12 tháng.
