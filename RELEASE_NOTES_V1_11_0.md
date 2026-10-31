# ATELIER HOME / Tân Design v1.11.0 — Trung tâm ưu tiên công việc & lịch liên hệ

## Trung tâm ưu tiên ngay trên trang Admin
- Bốn nhóm nhiệm vụ: **Công việc quá hạn**, **Công việc đến hạn trong 7 ngày**, **Lịch liên hệ đã đến hạn**, **Lịch liên hệ trong 7 ngày tới**.
- Mỗi nhóm hiển thị số đếm chính xác từ Supabase và tối đa 5 việc/hồ sơ có hạn gần nhất, kèm người phụ trách và thời điểm liên quan.
- Bấm vào một nhóm để mở tab **Công việc chăm sóc** hoặc **Yêu cầu tư vấn** với bộ lọc tương ứng. Bộ lọc cũ được xóa để tránh ẩn công việc cần xử lý.
- Nút **Làm mới ưu tiên** lấy dữ liệu mới nhất; trung tâm đồng bộ sau khi cập nhật công việc, hoàn thành nhắc việc hoặc sửa lịch.
- Mọi truy vấn vẫn dùng JWT Admin và RLS Supabase; không gửi thông tin khách hàng ra bên thứ ba.
- Tối ưu hiển thị responsive cho máy tính, tablet và điện thoại.

## Bằng chứng kiểm tra trên Supabase
- Công việc thực **Gửi báo giá**, phụ trách Quang, trạng thái **Đang thực hiện**, hạn 05/11/2026 lúc 14:10 giờ Việt Nam.
- Lúc kiểm thử: **1** việc sắp đến hạn 7 ngày; **0** việc quá hạn, **0** lịch liên hệ đến hạn và **0** lịch liên hệ trong 7 ngày.
- Nhật ký chỉnh sửa ghi chú thực tế vẫn **0** bản ghi. Không tự sửa ghi chú "Đê" hoặc công việc của Quang.
- Không thêm hoặc đổi quyền người dùng, database hay secret.

## Giới hạn
- Số đếm truy vấn toàn bộ hồ sơ Admin được phép xem; danh sách minh họa chỉ hiển thị tối đa 5 mục gần hạn nhất mỗi nhóm.
- Trung tâm chỉ cập nhật khi Admin tải hoặc làm mới giao diện, không có email/SMS/push tự động.
- Nhân viên được giao theo tên không tự có quyền truy cập Admin.
- Thời hạn xóa dữ liệu 12 tháng và Cloudflare Turnstile giữ nguyên.

## Kiểm thử
- Node CI tĩnh xác nhận UI và thao tác truy vấn dữ liệu.
- Browser smoke test với Supabase mô phỏng: kiểm tra số đếm theo việc cần xử lý, đặt/hủy nhắc, hoàn thành nhiệm vụ, điều hướng bộ lọc, giao diện trên điện thoại.
- CI không đăng nhập vào Admin thật và không ghi dữ liệu khách hàng giả lên Supabase thực.
