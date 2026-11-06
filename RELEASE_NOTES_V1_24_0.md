# ATELIER HOME web v1.24.0 — Quản trị công trình tin cậy

Ngày: 07/11/2026. Ưu tiên lỗi quyền và độ tin cậy khi thao tác công trình.

- RLS kiểm tra vai trò Auth hiện tại khớp hồ sơ nhân sự còn hoạt động. Claim Admin cũ/giả hoặc hồ sơ bị vô hiệu hóa không cho sửa/xóa, thêm hay đọc nháp. Khách vẫn chỉ đọc công trình công khai.
- Lưu/xóa phải nhận đúng ID từ máy chủ trước khi báo thành công. Không còn coi UPDATE/DELETE 0 hàng là thành công.
- Khóa biểu mẫu và thao tác trùng khi đang ghi. Khi chưa xác nhận được kết quả, giữ nội dung và hướng dẫn kiểm tra danh sách trước khi gửi lại.
- Cảnh báo tạo mới, đổi công trình, chuyển tab, đăng xuất hoặc rời trang khi có thay đổi chưa lưu; trạng thái biểu mẫu hiển thị rõ. Không lưu nội dung công trình trong localStorage.
- Khi đọc danh sách lỗi, ẩn dữ liệu cũ và hiển thị số liệu chưa xác định. Phản hồi đọc cũ không ghi đè lượt mới. Ghi thành công nhưng tải lại lỗi được thông báo riêng, không yêu cầu gửi lại.
- Thêm kiểm thử SQL rollback, PostgreSQL tách biệt và browser fixture; môi trường browser Validate chuyển sang image đã khóa phiên bản/digest như smoke sau triển khai.

Migration policy đã áp dụng; không đổi bản ghi công trình, tài khoản hoặc quyền ảnh. Tổng 6 công trình và checksum giữ nguyên. Giao diện được đưa lên Pages trước rồi kiểm thử sâu sau theo lựa chọn chủ website; giữ các chốt CI hiện có. Xem [báo cáo và giới hạn nghiệm thu](PROJECT_ADMIN_ACCEPTANCE.md). PC vẫn ở phiên bản độc lập 1.1.1; chưa có bộ cài PC mới trong đợt này.
