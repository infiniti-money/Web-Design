# ATELIER HOME / Tân Design v1.7.0 — Sửa ghi chú có nhật ký, hoàn thành lịch nhắc

## Sửa ghi chú khách hàng
- Mở **Yêu cầu tư vấn → Hồ sơ** rồi chọn **Sửa ghi chú** ở ghi chú thủ công cần thay đổi.
- Lưu chỉnh sửa cập nhật nội dung hiển thị, đồng thời lưu **phiên bản trước/sau**, người sửa và thời điểm sửa trong **Nhật ký chỉnh sửa ghi chú**.
- Chỉ Admin sửa được; các sự kiện tự động như ghi nhận liên hệ, chuyển trạng thái và đặt/hủy lịch không thể sửa.
- Tránh mất dữ liệu khi nhiều Admin chỉnh cùng lúc bằng khóa phiên bản `updated_at` và lỗi `STALE_NOTE`.
- Server thực hiện RPC có kiểm tra quyền và ghi bản cũ trong cùng một giao dịch, không cấp UPDATE trực tiếp trên bảng ghi chú cho client.

## Bước tiếp theo: hoàn tất công việc chăm sóc
- Thêm nút **Hoàn thành công việc** cho lịch nhắc đang tồn tại.
- Khi hoàn thành, lịch nhắc hiện hành được bỏ khỏi danh sách đến hạn, thống kê và bộ lọc được cập nhật.
- Ghi sự kiện "Đã hoàn thành công việc nhắc liên hệ" vào dòng thời gian.
- **Không tự ghi nhận đã liên hệ thực tế**: hành động này không thay đổi `last_contacted_at` hoặc gia hạn dữ liệu 12 tháng.

## Kiểm thử và bảo mật
- Di trú `supabase/customer-care-edit-v1_7.sql` đã áp dụng vào Supabase hiện tại.
- Kiểm thử giao dịch `BEGIN...ROLLBACK`: chỉnh sửa, kiểm tra nhật ký, chặn ghi đè lỗi thời, chặn user không phải Admin, hoàn thành lịch nhắc mà không tác động lần liên hệ.
- Ghi chú thật và lịch nhắc hiện có vẫn nguyên vẹn; chưa tự sửa ghi chú "Đê" của người dùng.
- Ghi chú, phiên bản cũ và lịch sử chăm sóc được xóa cùng hồ sơ theo chính sách lưu tối đa 12 tháng, ngoại trừ nghĩa vụ lưu giữ hợp pháp.
- CI kiểm tra JavaScript, cấu trúc quyền và kiểm thử trình duyệt mô phỏng thao tác sửa/hủy/hoàn thành lịch nhắc.
- Email và thông báo đẩy vẫn chưa kích hoạt theo quyết định chủ website; công việc nhắc xem khi mở Admin.

## Sử dụng
Mở https://infiniti-money.github.io/Web-Design/admin.html, đăng nhập Admin, vào **Yêu cầu tư vấn → Hồ sơ**. Sửa ghi chú bằng nút bên cạnh từng ghi chú thủ công; xem các phiên bản cũ ở cuối hồ sơ. Tại **Nhắc liên hệ**, nhấn **Hoàn thành công việc** khi đã xử lý việc cần nhắc.
