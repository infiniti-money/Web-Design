# ATELIER HOME web 1.25.1

Trung tâm vận hành xóa số liệu cũ ngay khi tải lại, đăng xuất hoặc mất kết nối. Một lần tải có giới hạn 15 giây và có thể thử lại thủ công. Kết quả đến muộn không được đưa lên màn hình sau khi tài khoản đổi hoặc đăng xuất.

Xác minh Auth và hồ sơ nhân sự trước và sau khi đọc số liệu. Chỉ hiển thị khi cùng ID tài khoản, cùng vai trò Admin/Quản lý còn hoạt động; đổi vai trò hoặc refresh token yêu cầu tải lại bên ngoài callback Auth. Hủy yêu cầu cũ khi có lượt tải mới. Giữ truy vấn chỉ đếm HEAD, RLS, phạm vi 7 ngày và nhân sự chỉ Admin; lỗi riêng từng nhóm vẫn hiển thị dấu “–”.

Bổ sung kiểm thử timeout/thử lại, thu hồi quyền trong lúc đọc, đổi tài khoản/vai trò, offline và phản hồi muộn sau đăng xuất vào Node và Playwright. Chạy Playwright vận hành cả trước và sau triển khai. Không sửa schema/RLS, không tạo hồ sơ thật hay gửi thông báo. Đây là bản web; UAT nhân sự thật và nâng cấp bản cài PC vẫn cần nghiệm thu riêng. Xem `OPERATIONS_RUNBOOK.md`.
