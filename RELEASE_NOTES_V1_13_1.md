# Tân Design v1.13.1 — Bản vá bảo mật phân quyền nhân viên

Phiên bản này giữ nguyên các chức năng **v1.13.0**: danh bạ nhân viên, lời mời Supabase Auth, 3 vai trò Admin / Quản lý / Nhân viên, gắn nhiệm vụ theo tài khoản và trang **Công việc của tôi**.

## Siết chặt quyền truy cập

- Thêm `private.current_staff_role()`, chỉ đọc vai trò từ hồ sơ nhân viên **đang hoạt động** và metadata quyền **hiện tại của Supabase Auth**, không dùng riêng vai trò trong JWT cũ.
- Các chính sách RLS của khách hàng, nhiệm vụ và lịch sử công việc chuyển sang kiểm tra vai trò thực tế qua hàm private.
- Trigger chỉ cho nhân viên chỉnh trạng thái nhiệm vụ mình đã được giao, kể cả khi phiên làm việc cũ còn JWT ghi vai trò Quản lý.
- Báo cáo hiệu suất kiểm tra vai trò thực tế; chỉ Admin và Quản lý đang có quyền được xem.
- Danh bạ nhân viên cũng hạn chế theo quyền hiện hành. Hàm bảo mật nằm trong schema `private`, không là API công khai.
- Không thay đổi nhiệm vụ, tài khoản Admin hiện tại hoặc các phiên bản ghi chú đã lưu.

## Kiểm thử và giới hạn

- Đã kiểm thử giao dịch RLS v1.13.0 trước bản vá: nhân viên chỉ thấy nhiệm vụ được giao, chặn sửa nội dung, được đổi trạng thái; không lưu dữ liệu thử.
- Sau bản vá, kiểm thử tĩnh bắt buộc các chính sách gọi hàm quyền hiện hành và không sử dụng JWT cũ làm nguồn quyền độc nhất.
- **Chưa gửi thư mời cho tài khoản thật** vì chưa được cung cấp email nhân viên. Để nghiệm thu đầy đủ ba vai trò, cần mời một tài khoản nhân viên thử trên hệ thống thật.
- Không tự chỉnh sửa/vô hiệu hóa Admin. Đối với Auth invitation cần whitelist `https://infiniti-money.github.io/Web-Design/admin.html` trong Supabase Authentication → URL Configuration.
- Chức năng email thông báo CRM/Resend vẫn chưa bật. Email mời nhân viên thuộc Supabase Auth.
- Những cảnh báo bảo mật Supabase còn lại gồm hàm đặc quyền hiện hữu và bảo vệ mật khẩu bị rò rỉ chưa bật theo lựa chọn trước đó.

## Theo lộ trình

Sau khi một tài khoản nhân viên thực đăng nhập và hoàn thành thử một nhiệm vụ, tiếp tục **v1.14.0 — Quy trình chăm sóc tự động**.
