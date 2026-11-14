# ATELIER HOME — chặng tiếp theo sau v1.28.5 / PC 1.2.1

**Phạm vi bàn giao:** Web v1.28.6 / Windows Manager v1.2.2. Giữ production PostgreSQL 17.11 và dữ liệu hiện hữu; không có migration / Auth mutation.

## Những gì đã xác minh trước triển khai
- Production kết nối `ACTIVE_HEALTHY` và 8 `auth_rls_initplan` đã khắc phục ở bản trước.
- Auth trực tiếp: **Admin 1, Quản lý 1, Nhân viên 0** (đếm 14/11/2026). Không có đối tượng Employee thật để nghiệm thu vai trò.
- Performance Advisor: 17 unindexed FK INFO, 6 unused index INFO, không chứng minh index mới có lợi ở dữ liệu ít. Security Advisor: 4 SECURITY DEFINER WARN, 1 leaked password protection WARN và 2 bảng private RLS-no-policy INFO.
- Bằng chứng 08/11/2026 có backup và restore database mô tả trong `BACKUP_RESTORE_EVIDENCE_20261108.md`, nhưng **không thay thế backup gần thời điểm hiện tại và kiểm tra Auth/Storage dịch vụ thực**.

## Chức năng bổ sung
- `uat.html` + `assets/uat-readiness.js`: Admin-only, chỉ đọc Auth/profile của chính mình, không gọi RPC hoặc bảng nghiệp vụ; bảng cổng nghiệm thu không lưu localStorage; khi phiên lỗi sẽ ẩn và xóa.
- Xuất JSON tự khai; nội dung có `production_uat=NOT_CERTIFIED` ngay cả khi đủ 8/8 checkbox.
- `scripts/verify-recovery-evidence.cjs` kiểm SHA256 file backup, đếm bảng nguồn/đích do operator cung cấp và ba cờ xác nhận restore; đầu ra chỉ ở máy operator, **vẫn yêu cầu kiểm tra độc lập**.
- CI kiểm thử bằng fixture, không dùng service_role, password hoặc production dump.

## Cách kiểm tra backup trên máy tin cậy
1. Dùng hướng dẫn `SUPABASE_BACKUP_RESTORE_GUIDE.md`, xuất bản sao **mới**, giữ mã hóa trên thiết bị được phép. Không tải file backup vào GitHub/CI/chat.
2. Khôi phục bản đó vào **PostgreSQL/Supabase riêng cách ly**, so số dòng `auth.users`, `auth.identities`, `storage.buckets`, `storage.objects` và dữ liệu nghiệp vụ; xác minh dịch vụ đăng nhập và Storage nếu có.
3. Tạo **manifest JSON cục bộ** gồm `kind`, `backup_file`, `backup_sha256`, `captured_utc`, `source_counts`, `restored_counts`, `isolated_restore`, `auth_service_verified`, `storage_objects_verified`, `rto_seconds`, `rpo_seconds`. Không đưa email, user ID, mật khẩu, token, connection string hoặc nội dung bảng vào manifest.
4. Chạy `node scripts/verify-recovery-evidence.cjs /đường/dẫn/manifest.json`; dùng kết quả `REVIEW_REQUIRED` khi khớp SHA/counts và ba xác nhận tự khai, hoặc `BLOCKED` nếu thiếu/lệch. **`REVIEW_REQUIRED` không phải PASS**. Người có thẩm quyền so chứng cứ restore độc lập, Auth/Storage và RPO/RTO trước khi ký.
5. Thử UAT cả ba vai trò bằng tài khoản thật trên trình duyệt tách biệt và Windows. Không chụp hoặc lưu dữ liệu cá nhân vào Issue công khai.
6. Khi đủ điều kiện mới xem xét phát hành các thay đổi DB có tác động lớn; không tự thêm 17 index hay chỉnh Auth trong quá trình này.

## Việc vẫn cần đầu vào doanh nghiệp
- Tài khoản Employee có email được duyệt, người thực hiện đăng nhập/thu hồi quyền thật.
- Máy backup và bản sao lưu cập nhật được quản lý ngoài GitHub; môi trường restore cách ly có kiểm thử đăng nhập Auth.
- Nâng gói Supabase hoặc chấp nhận rủi ro/hạn chế hiện tại đối với leaked-password protection.
- Máy Windows thật để thử cài đè/bảo toàn thông tin DPAPI; quyền Search Console/CWV và hồ sơ công trình/ảnh/thông tin pháp lý thật.

**Theo dõi:** [UAT Issue #24](https://github.com/infiniti-money/Web-Design/issues/24), [Security Issue #29](https://github.com/infiniti-money/Web-Design/issues/29). Tuyệt đối không đóng UAT chỉ từ checkbox, dữ liệu giả lập hoặc GitHub Actions xanh.
