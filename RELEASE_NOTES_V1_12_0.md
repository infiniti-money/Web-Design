# ATELIER HOME / Tân Design v1.12.0 — Báo cáo hiệu suất chăm sóc

## Báo cáo mới trong Admin
- Tab **Báo cáo hiệu suất** với kỳ **7 ngày / 30 ngày / 90 ngày / 12 tháng** và biểu đồ nhóm **theo tuần / theo tháng**.
- Các chỉ số: số việc tạo trong kỳ, số việc trong kỳ hiện hoàn thành, **tỷ lệ hoàn thành**, số việc đang thực hiện, số việc quá hạn chưa hoàn thành, **số việc thực sự hoàn tất trong kỳ**.
- Bảng hiệu suất theo **tên người phụ trách hiện tại**, số việc được giao, đang làm, đã hoàn thành, quá hạn và tỷ lệ hoàn thành.
- Biểu đồ nhóm công việc theo ngày tạo: tổng công việc và số việc **hiện đã hoàn thành**; có cả tuần/tháng không phát sinh công việc để tránh sai lệch đồ thị.
- Tất cả thống kê tính ở Supabase bằng RPC, không bị giới hạn bởi 25 công việc mỗi trang. Không chuyển dữ liệu liên hệ riêng tư của khách hàng vào báo cáo.

## Định nghĩa để đọc đúng
- Kỳ báo cáo lọc **công việc có ngày tạo nằm trong kỳ**, không phải giao dịch hoàn thành trong kỳ.
- **Tỷ lệ hoàn thành = số công việc tạo trong kỳ có trạng thái hiện tại là Hoàn thành / tổng số công việc tạo trong kỳ**. Không phải hiệu suất tại thời điểm lịch sử hay cam kết KPI của nhân viên.
- **Hoàn tất trong kỳ** tính theo `completed_at` và **có thể gồm công việc đã giao từ kỳ trước**.
- Người phụ trách được tổng hợp theo **tên hiện tại**, chưa có tài khoản nhân viên riêng; khi chuyển người phụ trách, thống kê kỳ trước tính cho người phụ trách mới.
- Biểu đồ tổng hợp theo múi giờ **Việt Nam**, tuần bắt đầu thứ Hai.
- Dữ liệu quá hạn dựa trên thời điểm hiện tại, chỉ tính việc chưa hoàn thành.

## Bảo mật và vận hành
- RPC `public.care_performance_report` là `SECURITY INVOKER`, dùng RLS và kiểm tra `auth.uid()` cùng `app_metadata.role=admin`.
- Chỉ role authenticated có quyền gọi; anon bị thu hồi `EXECUTE`, non-admin bị từ chối bằng mã quyền.
- Giới hạn kỳ truy vấn tối đa 366 ngày, tham số bucket chỉ nhận `week` hoặc `month`.
- Không thay đổi khách hàng, lịch nhắc, nhiệm vụ của Quang, gói Supabase, secret hay lịch xóa dữ liệu 12 tháng.
- Email và thông báo đẩy chưa kích hoạt theo lựa chọn chủ website.

## Kiểm thử
- Dữ liệu thật tại 31/10/2026 gồm một nhiệm vụ `Gửi báo giá`, phụ trách Quang, trạng thái `Đang thực hiện`; trong kỳ tháng 10, tỷ lệ hoàn thành **0%** (0/1).
- Kiểm thử SQL giao dịch read-only với Admin giả lập: tổng 1, đang làm 1, hoàn thành 0, tỷ lệ 0%, đúng tên người phụ trách; thử cả tuần/tháng với khoảng trống; non-admin bị chặn.
- CI kiểm thử cấu trúc, quyền, DOM và trình duyệt với dữ liệu **mô phỏng**. Không có bản ghi kiểm thử bị lưu vào Supabase thật.
