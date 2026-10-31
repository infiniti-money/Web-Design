# ATELIER HOME / Tân Design v1.9.0 — Bảng Kanban chăm sóc khách hàng

## Nâng cấp
- Tab **Công việc chăm sóc** có hai chế độ xem: **Danh sách** và **Bảng Kanban**.
- Bảng Kanban chia nhiệm vụ thành **Chờ thực hiện / Đang thực hiện / Hoàn thành**. Mỗi thẻ có tên công việc, khách hàng, người phụ trách, mức ưu tiên, hạn xử lý và cảnh báo quá hạn.
- Nút **Bắt đầu** chuyển từ Chờ thực hiện sang Đang thực hiện, **Hoàn thành** chuyển sang Hoàn thành, và **Mở lại** đưa công việc về Chờ thực hiện.
- Tất cả thao tác dùng API Supabase hiện có, chịu RLS chỉ-Admin và trigger ghi nhật ký thay đổi trạng thái. Không thêm secret, không sửa dữ liệu khách hàng thực.
- Đã tối ưu bảng Kanban trên điện thoại và dùng button chuẩn hỗ trợ thao tác bằng bàn phím.
- Bộ lọc theo người phụ trách, trạng thái, thời hạn hoạt động cho cả danh sách và Kanban; chuyển chế độ xem không làm mất bộ lọc.
- **Giới hạn minh bạch:** Kanban chỉ hiển thị tối đa 25 việc trên trang đang chọn, không phải tất cả việc của toàn bộ hệ thống. Thống kê phía trên vẫn là tổng số liệu trên database.

## Tình trạng nghiệm thu thực tế tại thời điểm bắt đầu v1.9
- Supabase đã có công việc **Gửi báo giá**, người phụ trách **Quang**, hạn **05/11/2026 14:10 giờ Việt Nam**, trạng thái **Chờ thực hiện**, nhật ký tạo công việc đã được ghi.
- Không tự thay đổi công việc này. Việc chuyển trạng thái thực tế do Admin quyết định.
- Ghi chú thủ công vẫn là `Đê`, chưa có bản ghi `inquiry_care_note_revisions`, vì vậy **chưa thể nghiệm thu ghi chú cũ/mới**; cần Admin tự lưu chỉnh sửa bằng giao diện.
- Email thông báo vẫn hoãn theo yêu cầu.

## Kiểm thử
- Kiểm thử giao diện giả lập bằng Chromium: xem Kanban, chuyển trạng thái Bắt đầu/Hoàn thành/Mở lại, quay lại bảng, phân trang/lọc, kiểm tra giao diện mobile.
- Kiểm thử cấu trúc JavaScript và HTML.
- Không dùng tài khoản/mật khẩu thật, không sửa hồ sơ thật trong CI.
