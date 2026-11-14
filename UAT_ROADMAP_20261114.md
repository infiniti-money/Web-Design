# UAT & bảo mật ATELIER HOME — đợt 14/11/2026

## Phạm vi và nguyên tắc
Website công khai `v1.28.3` đã nghiệm thu Deploy, browser, SEO. Đợt `v1.28.4` cải thiện workspace quản trị dùng chung Windows Manager `1.2.0`. Tuyệt đối không đưa mật khẩu, access/refresh token, hồ sơ khách, service_role key vào GitHub/issues/CI/chat.

**Kiểm tra dữ liệu Auth production (chỉ đếm, không đọc danh tính):** Admin 1, Quản lý 1, Nhân viên 0. Vì vậy bài kiểm thử mô phỏng 3 vai trò trong CI không được ghi thành UAT đăng nhập thật. Phải sử dụng quy trình chính thức Admin mời/duyệt một tài khoản employee thật với sự đồng ý người sử dụng rồi mới nghiệm thu tiếp.

## Ma trận UAT thực tế

| Trường hợp | Admin | Quản lý | Nhân viên |
|---|---|---|---|
| Đăng nhập thật, refresh token, đăng xuất | Chờ UAT | Chờ UAT | Chưa có tài khoản |
| Danh mục điều hành + theme/compact/mobile | Chờ UAT | Chờ UAT | Chưa có tài khoản |
| Nhân sự: mời, xét duyệt, đổi role, vô hiệu hóa | Được phép | Phải bị chặn | Phải bị chặn |
| CRM/khách hàng, lịch chăm sóc | Được phép | Theo quy trình | Chỉ khách gắn với việc |
| Dự án công khai/nội bộ | CRUD | Theo quyền hiện tại (không CRUD admin) | Không quản trị dự án |
| Giao việc/nhận việc/thông báo | Toàn đội | Theo quyền quản lý | Chỉ việc được giao |
| Bài viết CMS: duyệt và công bố | Được phép | Soạn/chờ duyệt | Không tự công bố |
| Báo giá, hợp đồng, phê duyệt | Phê duyệt | Theo workflow | Phải bị chặn |
| Báo cáo nâng cao và đối soát payOS | Theo quyền Admin | Báo cáo có quyền | Phải bị chặn |
| Phiên JWT cũ khi hạ quyền, khóa profile | Phải bị từ chối | Phải bị từ chối | Phải bị từ chối |
| Windows Setup nâng cấp 1.1.2→1.2.0 và DPAPI | Chờ máy thật | Chờ máy thật | Chưa có tài khoản |

**Cách thực hiện:** dùng trình duyệt hồ sơ tách biệt cho từng vai trò; chỉ dùng khách/dự án test được phê duyệt, gỡ ngay khi hoàn tất; ghi giờ, trình duyệt, người thực hiện, hành động, HTTP/SQLSTATE, ảnh sau khi che PII; so sánh thay đổi trên hai giao diện web/PC. Chạy thử cả tình huống bị thu hồi quyền sau khi đã đăng nhập mà chưa refresh; không dựa vào ẩn nút client để kết luận bảo mật. Không thử chuyển khoản/thanh toán thật khi chưa được cho phép.

## Ngưỡng chốt bảo mật production
1. Lấy bản backup mới độc lập và khôi phục thử cách ly, ghi SHA/hash và khả năng rollback. Không dùng bản ngày 08/11 làm bằng chứng backup mới.
2. Rà soát 4 `SECURITY DEFINER` RPC: `care_advance`, `commercial_action`, `edit_inquiry_care_note`, `generate_task_due_notifications`. Production hiện không cho role `anon` thực thi, các hàm kiểm tra vai trò hiện hành qua `private.current_staff_role()`; vẫn phải kiểm thử theo hành động/owner. Không thu hồi `authenticated` của hàm phục vụ CRM khi chưa đổi API/client.
3. Trong <https://supabase.com/dashboard/project/mswiegltusllzvuavjdh/auth/providers>, kiểm tra/tùy gói bật [Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); chỉ coi hoàn tất khi Advisor không còn cảnh báo. Connector hiện không có chức năng chỉnh cấu hình Auth này.
4. Hai bảng `private.inquiry_rate_limits` và `private.payos_pilot_policy` bật RLS nhưng không có policy là cách ly chủ ý: `anon` và `authenticated` không có SELECT; không tự thêm policy.
5. Tối ưu 8 `auth_rls_initplan` bằng `supabase/rls-initplan-review.sql` đã chuẩn bị; chỉ triển khai sau backup + matrix quyền rollback + code review. Bản PR **không tự thay đổi production**. Sau áp dụng chạy lại Security và Performance Advisor, đo `EXPLAIN (ANALYZE, BUFFERS)` trên bản sao/đường truy vấn có quyền.
6. 17 FK thiếu chỉ mục và 6 chỉ mục chưa dùng hiện là INFO, bảng còn nhỏ; ưu tiên theo truy vấn nóng và số liệu thống kê, không tạo/xóa hàng loạt. Theo dõi `pg_stat_user_tables`, `pg_stat_user_indexes` và I/O trước/sau.

## Chặng phát hành
- Web v1.28.4: CI Node + database + Playwright → merge main → Pages → smoke trực tiếp → Public SEO Audit.
- Windows 1.2.0: smoke Electron trong workflow Windows → build Setup và Portable → tag `desktop-v1.2.0` sau nghiệm thu tự động → kiểm tra checksum/feed. Xác minh cài đè, ký số và dữ liệu DPAPI trên máy thật là cổng riêng.
- Search Console/CWV: kiểm tra quyền sở hữu domain, index coverage, Lighthouse lab và Web Vitals thực địa; không suy từ điểm phòng lab thành xếp hạng SEO.
- Công trình thật, giá, ảnh bản quyền và nội dung pháp lý phải được chủ doanh nghiệp phê duyệt trước khi xuất bản.

## Tự động phát hành PC sau CI — cấu hình triển khai

Workflow `.github/workflows/desktop-promote.yml` chỉ kích hoạt khi `Validate ATELIER HOME` đạt **success trên push main thuộc repository chính**, không dùng build từ fork/PR để tạo tag. Nó so SHA validated với `origin/main`, xác minh `desktop/package.json` và `desktop/package-lock.json` cùng phiên bản và có release notes rồi mới tạo `desktop-v<version>`. Nếu tag đã có thì bỏ qua. Tag được tạo bằng `GITHUB_TOKEN` không tự khởi chạy workflow theo push, nên sử dụng `workflow_dispatch` để gọi workflow đóng gói Windows trên đúng tag. Quy trình tạo GitHub Release và cập nhật `desktop-stable/latest.yml` do `desktop-release.yml` đảm nhiệm.

**Cổng kiểm chứng sau phát hành:** workflow `desktop-release.yml` thành công; tag đúng source SHA; download Setup, Portable; kiểm tra feed `latest.yml`, SHA-512 và version; thông báo người dùng chỉ sau khi kiểm tra. Trường hợp tag tạo thành công nhưng workflow dispatch hoặc build thất bại, kiểm tra/rerun thủ công workflow từ tag thay vì tự tạo lại tag. Đây không thay thế nghiệm thu cài đè trên máy thật hoặc ký số.
