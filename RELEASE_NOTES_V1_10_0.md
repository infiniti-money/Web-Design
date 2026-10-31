# ATELIER HOME / Tân Design v1.10.0 — Chỉnh sửa giao việc và lịch sử đầy đủ

## Nghiệm thu Kanban trên dữ liệu thật
- Công việc **Gửi báo giá**, phụ trách **Quang**, đã được người quản trị chuyển sang **Đang thực hiện**.
- Supabase ghi hai sự kiện: tạo việc và đổi trạng thái. Hạn hiện tại: **05/11/2026 14:10 (giờ Việt Nam)**.
- Không tự thay đổi trạng thái hoặc dữ liệu công việc thật trong quá trình phát hành.
- Nhật ký **chỉnh sửa ghi chú khách hàng** chưa có bản ghi thực; tính năng đã kiểm thử với giao dịch được rollback nhưng người dùng cần thực sự lưu ghi chú đã chỉnh sửa để nghiệm thu.

## Nâng cấp
- Trong **Yêu cầu tư vấn → Hồ sơ → Tiến độ công việc**, chọn **Sửa công việc** để sửa tên, nội dung, người phụ trách, ưu tiên hoặc hạn xử lý. Có nút **Hủy chỉnh sửa**, không tự tạo công việc trùng.
- Lịch sử công việc ghi từng lần đổi **tên, mô tả, ưu tiên, hạn xử lý, người phụ trách, trạng thái**, kèm nội dung trước/sau và thời điểm. Chỉ Admin được xem.
- Server chặn việc đổi `inquiry_id`, `id`, `created_at`, `created_by` của một công việc để ngăn gắn nhầm nhiệm vụ với khách hàng khác.
- Thời hạn công việc chỉnh sửa giới hạn tối đa 12 tháng kể từ thời điểm chỉnh sửa.
- Giữ tab **Công việc chăm sóc** với Kanban, thống kê, lọc theo người phụ trách, phân trang.
- Không bổ sung email tự động, không tạo tài khoản nhân viên ngoài ý muốn.

## Kiểm thử
- Migration `supabase/customer-care-task-edit-v1_10.sql` đã áp dụng lên Supabase đang dùng.
- Transaction `BEGIN…ROLLBACK` thử sửa nhiều trường, xác nhận đủ 5 sự kiện ban đầu và thay đổi, từ chối đổi khách hàng gốc, xác nhận dấu thời gian khi hoàn thành, chặn non-Admin.
- Chromium smoke test dùng Admin mô phỏng để kiểm tra cập nhật và hủy chỉnh sửa, nhật ký; không ghi khách hàng giả vào database thật.
- Không thay đổi các hồ sơ khách, dự án, khóa bảo mật, thời hạn xóa 12 tháng.
