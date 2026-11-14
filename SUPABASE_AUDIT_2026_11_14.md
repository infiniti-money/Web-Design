# Đợt kiểm toán Supabase 14/11/2026 (issue #29)

Đây là bước **nghiệm thu không phá hủy** sau website v1.28.4 và Windows Manager v1.2.0. Chạy `supabase/security-performance-audit-readonly.sql` trên môi trường đã xác minh bằng công cụ SQL có quyền; tệp chỉ chứa sáu truy vấn `SELECT`, không chạy RPC ghi dữ liệu, không dùng tài khoản thật để giả lập quyền. Mọi kết quả là snapshot tại thời điểm chạy, cần xem lại trước khi thay đổi hệ thống.

## Đã kiểm tra trực tiếp với Supabase production 14/11/2026

- Security Advisor: 4 cảnh báo `authenticated_security_definer_function_executable`; tất cả 4 RPC `SECURITY DEFINER` thuộc `postgres`, khóa `search_path`, `anon EXECUTE=false`, `authenticated EXECUTE=true`, và gọi `private.current_staff_role()`. Hàm này được bảo vệ bởi role dữ liệu nhân sự và `app_metadata` từ Auth. **Không tự thu hồi quyền `authenticated` hoặc đổi sang invoker** vì CRM, báo giá và thông báo nội bộ đang cần các đường gọi này.
- Security Advisor: `auth_leaked_password_protection` vẫn `WARN`. Bật từ Supabase Auth Dashboard chỉ sau khi xác nhận gói hỗ trợ và thử đăng nhập/đặt lại mật khẩu.
- Hai `private` table bật RLS nhưng không có policy là hành vi chặn mặc định; trước đó đã xác nhận không có quyền SELECT cho `anon` và `authenticated`. Không thêm policy mở công khai.
- Performance Advisor: 8 `auth_rls_initplan` cảnh báo; bản chỉnh sửa nằm tại `supabase/rls-initplan-review.sql` và đã qua PostgreSQL 17 cô lập bằng `tests/rls-initplan-isolated.sql`. Chưa triển khai thật; trước đó phải có snapshot/backup mới, UAT phân quyền và rollback.
- Performance Advisor: 17 `unindexed_foreign_keys`, nhưng 11 bảng có FK liên quan chỉ khoảng 16–64 kB, từ 0 đến khoảng 16 bản ghi ước lượng/bảng khi kiểm tra. Không thêm index tràn lan; đo câu truy vấn nóng, tần suất, `EXPLAIN (ANALYZE, BUFFERS)` trên staging, đánh giá write overhead và index đã tồn tại trước khi chọn từng FK.
- Health Advisor: không có cảnh báo. Auth hiện có 1 tài khoản `admin`, 1 `manager`, chưa có `employee`. Smoke 3 vai trò đang sử dụng phiên giả nên **không được báo UAT thật 3 vai trò đã hoàn tất**.

## Cổng triển khai các bước tiếp theo

1. **Bảo mật:** rà soát cụ thể tính cần thiết của từng RPC và chức năng `generate_task_due_notifications`; xác minh role âm tính (anon/employee/inactive/stale JWT) trong môi trường kiểm thử; xét bật Auth leaked-password protection theo tính năng gói.
2. **Hiệu suất:** chụp snapshot production, lưu `pg_policies`, ACL, thống kê truy vấn; chọn một hạng mục RLS/index có lợi ích đo được và xác minh rollback độc lập. SQL review RLS không nằm trong thư mục migration có chủ đích.
3. **Nghiệm thu:** chuẩn bị tài khoản Nhân viên thật bằng quy trình tạo tài khoản an toàn, đồng ý dùng test data, thực hiện hành trình Admin/Quản lý/Nhân viên từ website lẫn Windows Manager; kiểm tra đăng xuất, JWT cũ, CRUD CRM, Catalog, CMS, dự án và quyền đối tượng.
4. **Release:** chỉ sau khi UAT và backup được chứng minh, kiểm tra lại Supabase Advisors, CI, site và Windows. Windows v1.2.0 đã có bản phát hành, không cần phát hành lại cho một tệp báo cáo.

Thông tin tham chiếu: [Issue #29](https://github.com/infiniti-money/Web-Design/issues/29), [RLS optimization](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select), [Security Definer Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
