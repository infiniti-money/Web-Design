# Tân Design v1.18.0 — Báo giá chi tiết và in A4/PDF
**DỰ THẢO — CHƯA PHÁT HÀNH.** Chỉ sử dụng sau khi xác nhận backup độc lập, kiểm thử tài khoản thật và migration thành công.

## Nâng cấp
- Nhập hạng mục vật tư / thi công, đơn vị, số lượng, đơn giá.
- Tạm tính, giảm giá VNĐ và VAT tùy chọn với tổng do PostgreSQL tính lại.
- Lưu snapshot hạng mục và tổng tiền theo phiên bản báo giá, không cho sửa/xóa phiên bản đã lưu.
- In A4 dọc, chọn Microsoft Print to PDF hoặc máy in; xuất bản in có tiếng Việt, số tiền, trạng thái duyệt, giữ bản nháp khác với đã duyệt.
- Duy trì phê duyệt và hợp đồng gắn phiên bản đã duyệt ở v1.17, không thay thế dữ liệu cũ.

## Kiểm chứng
- CI Node, Chromium Linux/Windows, PDF A4 và mô phỏng điện thoại 390 px.
- SQL end-to-end PostgreSQL `BEGIN ... ROLLBACK`: hợp lệ tổng tiền, không duyệt vượt quyền, phiên bản bất biến, hợp đồng gắn đúng bản duyệt.
- Người dùng xác nhận cả 6 tiêu chí thực tế đối với bản in.
- **Kiểm thử đăng nhập với phiên Supabase Auth thật trên giao diện v1.18 và khôi phục backup độc lập phải đạt trước khi phát hành.**

## Lưu ý
Website: https://infiniti-money.github.io/Web-Design/
Các migration trên GitHub dùng để theo dõi phiên bản; không chạy lặp trên project đã cập nhật.
Việc lưu trạng thái “đã ký” không thay thế chữ ký số hoặc hóa đơn điện tử.
