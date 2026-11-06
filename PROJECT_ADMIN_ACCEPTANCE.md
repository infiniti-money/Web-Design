# Nghiệm thu quản trị công trình v1.24

URL: https://infiniti-money.github.io/Web-Design/admin.html#projects

## Ưu tiên đã xử lý

P0: policy projects trước đây đọc vai trò từ JWT nên có cửa sổ quyền cũ. P1: UPDATE/DELETE không trả bản ghi vẫn có thể báo thành công, thao tác đang ghi chưa khóa đủ, chưa cảnh báo biểu mẫu chưa lưu và danh sách cũ còn hiển thị sau lỗi đọc.

Migration `20261106233736_projects_authoritative_admin_roles` đã triển khai: giữ nguyên bảng/quyền GRANT, dùng helper private hiện có để đối chiếu Auth app_metadata và staff_profiles còn active. Tách SELECT anon để khách không phải gọi helper hoặc đọc nhân sự. Không sửa helper, không thêm RPC public, không áp dụng migration lịch sử báo giá đang chờ nghiệm thu riêng.

## Kết quả database sau triển khai — 07/11/2026

- SQL `tests/projects-authoritative-rls-rollback.sql` đạt: anon chỉ đọc published và không đọc nhân sự; Admin hợp lệ CRUD; Manager, Employee mang claim Admin giả, UID không tồn tại, Admin bị thu hồi Auth, profile inactive và role không khớp đều bị chặn. Mọi fixture Auth/nhân sự/công trình được ROLLBACK, không gửi email.
- Trước/sau: 6 công trình, 6 published, SHA-256 toàn bộ hàng theo thứ tự ID cùng là `5b5f89cc235d60ed161cf0b122d2d1fe9e66262684cd63f0999c9ec01227ab84`. Không có tài khoản fixture còn lại. Đây là đối chiếu dữ liệu, không phải backup/restore production hay đăng nhập UAT bằng tài khoản thật.
- Advisor sau thay đổi không thêm nhóm cảnh báo: vẫn có [bảng private bật RLS không policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [4 RPC SECURITY DEFINER được authenticated gọi](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) và [leaked-password protection chưa bật](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Không tự thay đổi các cấu hình/RPC ngoài phạm vi đợt này.

## Giao diện và kiểm thử sau phát hành

Đã hoàn thiện mã giao diện và script `tests/projects-admin-browser.cjs`; chờ đối chiếu revision Pages rồi chạy kiểm thử trực tiếp. Các ca dùng fixture trong trình duyệt, chặn API production; không tạo/sửa/xóa công trình thật.

- Trường hợp 0 hàng hoặc ID phản hồi khác không được báo lưu/xóa thành công.
- Khi ghi: khóa trường/nút tạo mới/hành động bảng, chặn gửi trùng. Khi lỗi mạng: giữ nội dung, không tự gửi lại.
- Cảnh báo nội dung chưa lưu; người dùng có thể hủy chuyển tab/tạo mới. Native beforeunload bảo vệ khi rời trang, còn phụ thuộc hành vi trình duyệt.
- Lỗi đọc: ẩn hàng cũ, số liệu “—”, thông báo chưa tải thay vì coi là 0. Lượt đọc chậm không ghi đè lượt đọc sau.
- Xác nhận ghi thành công nhưng tải lại lỗi phải tách biệt; không hướng dẫn gửi lại bản ghi đã xác nhận.
- Tạo/sửa/xóa được xác nhận, hiển thị điện thoại và kiểm tra lỗi JavaScript. CI PostgreSQL chạy migration thực và cùng bộ SQL với dữ liệu tổng hợp trong database tách biệt.

Các mục còn mở: UAT Admin/Quản lý/Nhân viên thật, thiết bị vật lý, backup/restore độc lập, migration quote history và nội dung công trình/ảnh thật. Bản vá này không đánh dấu hoàn tất toàn bộ UAT hoặc mọi cổng bảo mật của dự án.
