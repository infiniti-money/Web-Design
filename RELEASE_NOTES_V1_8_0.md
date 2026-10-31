# ATELIER HOME / Tân Design v1.8.0 — Phân công chăm sóc và theo dõi tiến độ

## Xác minh ghi chú (trước nâng cấp)
- Đối chiếu Supabase thực tế: ghi chú do Admin nhập vẫn là **"Đê"**, **chưa có bản lịch sử chỉnh sửa thật** ở thời điểm kiểm tra.
- Không tự sửa ghi chú của người dùng hoặc tạo nội dung chỉnh sửa giả để làm thay đổi lịch sử.

## Phân công chăm sóc
- Mở **Yêu cầu tư vấn → Hồ sơ → Phân công chăm sóc khách hàng**.
- Tạo nhiệm vụ với tiêu đề, người phụ trách **theo tên**, mức ưu tiên, hạn hoàn thành và mô tả.
- Chuyển người phụ trách và cập nhật trạng thái **Chờ thực hiện → Đang thực hiện → Hoàn thành**.
- Khi hoàn thành, hệ thống ghi thời điểm hoàn thành; nếu mở lại nhiệm vụ, thời điểm hoàn thành được đặt lại.
- Các thao tác giao việc, chuyển người phụ trách và đổi trạng thái được ghi trong lịch sử theo giờ máy chủ.
- **Lưu ý:** chỉ có một tài khoản Admin hiện tại; tên người được giao không tạo tài khoản hoặc quyền đăng nhập, không gửi thông báo email/SMS. Việc giao cho nhân viên chưa phải tự động giao đến tài khoản riêng.

## Bảng tiến độ toàn hệ thống
- Tab **Công việc chăm sóc** hiển thị tổng số công việc, chờ thực hiện, đang thực hiện, hoàn thành và quá hạn.
- Bộ lọc trạng thái, người phụ trách và hạn xử lý.
- Danh sách 25 nhiệm vụ mỗi trang, truy vấn và đếm từ Supabase.
- Trong từng hồ sơ có lịch sử của công việc, ghi tên nhiệm vụ gắn với mỗi sự kiện.

## Bảo mật và vận hành
- Chỉ tài khoản Admin xác thực được xem, tạo và thay đổi nhiệm vụ. Supabase RLS chặn đọc dữ liệu với tài khoản thông thường.
- Nhật ký nhiệm vụ chỉ cho Admin đọc; client không thể giả tạo sự kiện trực tiếp, các sự kiện được ghi bởi trigger trên máy chủ.
- Nhiệm vụ và lịch sử bị xóa theo hồ sơ khách hàng (12 tháng từ lần liên hệ cuối hoặc ngày gửi, trừ trường hợp giữ theo nghĩa vụ pháp lý).
- Giữ nguyên dự án, khách hàng, ghi chú, lịch nhắc, GitHub Pages URL và Supabase Free.
- Tính năng email và thông báo đẩy vẫn hoãn theo lựa chọn chủ website.

## Kiểm thử
- Giao dịch SQL `BEGIN … ROLLBACK`: tạo nhiệm vụ, đổi trạng thái, chuyển người, xác minh đủ sự kiện và thời gian hoàn thành, chặn non-Admin; không ghi dữ liệu giả vào hệ thống thực.
- Kiểm thử Chromium tự động: tạo nhiệm vụ, đổi trạng thái, xem lịch sử, mở bảng tổng quan, lọc; tài khoản Admin mô phỏng, không đăng nhập bằng mật khẩu thật.
- Cần nghiệm thu một lần tạo/giao nhiệm vụ bằng Admin thật sau khi phát hành.
