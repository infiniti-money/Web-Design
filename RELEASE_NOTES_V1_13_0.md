# Tân Design / ATELIER HOME v1.13.0 — Quản lý nhân viên và phân quyền

## Tài khoản nhân viên
- Giữ nguyên tài khoản Admin đang dùng; bổ sung danh bạ `public.staff_profiles` (Admin / Quản lý / Nhân viên).
- Tab **Nhân viên và phân quyền** chỉ dành cho Admin: nhập họ tên, email, vai trò và gửi **lời mời Supabase Auth**. Hệ thống gửi thư mời xác thực tài khoản; đây không phải CRM email alert/Resend.
- Dịch vụ `staff-management` đã triển khai riêng trên Supabase: kiểm tra JWT bằng Supabase Auth, vai trò Admin và trạng thái đang hoạt động trước khi sử dụng Admin Auth API. Service role **chỉ ở máy chủ**, không xuất hiện trong GitHub Pages.
- Admin có thể đổi vai trò/vô hiệu hóa tài khoản nhân viên qua API; tự hạ quyền/vô hiệu hóa Admin bị từ chối nhằm tránh khóa tài khoản hiện hữu.
- Quyền mới hoặc bị vô hiệu hóa có thể cần **đăng xuất, đăng nhập lại** do JWT hiện tại còn hiệu lực đến khi hết hạn. Các quyền truy cập công việc/khách hàng được kiểm tra thêm với `staff_profiles.active`.

## Phân quyền
- **Admin:** tất cả dự án, khách hàng, ghi chú, công việc, báo cáo và quản lý nhân viên.
- **Quản lý:** bảng công việc của nhóm, chuyển người phụ trách theo tài khoản, báo cáo hiệu suất, lịch sử công việc; không sửa dự án hoặc quyền nhân viên.
- **Nhân viên:** chỉ tab **Công việc của tôi**, công việc được giao vào đúng `assignee_user_id` và hồ sơ khách hàng tương ứng; chỉ được đổi trạng thái công việc của mình. Không được chuyển người, sửa tiêu đề, mô tả, hạn xử lý, ưu tiên hay thông tin khách hàng.

## Giao việc bằng tài khoản
- Biểu mẫu giao việc mới chọn tài khoản đang hoạt động, tự lấy tên người phụ trách; lưu liên kết `assignee_user_id` thay vì chỉ tên văn bản.
- Công việc cũ `Gửi báo giá` của **Quang** được giữ nguyên tên, trạng thái `Đang thực hiện`, và `assignee_user_id=NULL` cho đến khi Admin xác nhận tài khoản chính xác. Không tự khớp tên để tránh giao nhầm.
- Bảng công việc có nút **Chuyển tài khoản** (nhập email tài khoản trong danh bạ). Mọi thay đổi người nhận được ghi trong lịch sử.
- **Công việc của tôi** hiển thị tối đa 100 nhiệm vụ và 15 lịch liên hệ đầu tiên mà người đăng nhập được phân quyền.

## Bảo mật và kiểm thử
- RLS theo `app_metadata.role`, `auth.uid()`, trạng thái nhân viên và `assignee_user_id`. Chặn nhân viên đọc công việc/khách hàng khác.
- Trigger phía máy chủ `private.staff_task_guard` chặn giả mạo cập nhật ngoài giao diện; chỉ cho nhân viên đổi trạng thái nhiệm vụ của họ.
- SQL `supabase/staff-roles-v1_13.sql` và `supabase/staff-manager-report-v1_13.sql` được lưu trong repo; đã áp dụng lên Supabase hiện tại.
- SQL test `BEGIN…ROLLBACK`: Admin gắn tài khoản, nhân viên thấy đúng nhiệm vụ/hồ sơ, đổi trạng thái được, sửa tiêu đề bị chặn, nhân viên khác không thấy; quản lý đọc được báo cáo, nhân viên không được xem báo cáo.
- Không tạo tài khoản khách giả, không mời người dùng thật khi chưa được cung cấp email; chưa thể nghiệm thu email mời bằng địa chỉ thực.
- Supabase linter còn cảnh báo về hàm SECURITY DEFINER cũ và bảo vệ mật khẩu rò rỉ đã tắt theo lựa chọn trước đó; cần xem lại trước khi mở rộng khách hàng.

## Một cấu hình Auth cần xác nhận
- Trong **Supabase → Authentication → URL Configuration → Redirect URLs**, cho phép
  `https://infiniti-money.github.io/Web-Design/admin.html`.
- Auth email của Supabase phải hoạt động. Nếu số lượng thư mời vượt giới hạn dịch vụ mặc định, cấu hình SMTP riêng trong một giai đoạn sau.
- Thử mời một email do chủ website quản lý, xác nhận thư, đặt mật khẩu và đăng nhập bằng vai trò Nhân viên. Không tự kích hoạt email thông báo CRM.

## Chặng tiếp theo
v1.14.0: pipeline tiếp nhận → tư vấn → khảo sát → báo giá → hợp đồng; triển khai sau khi nghiệm thu việc mời/đăng nhập nhân viên.
