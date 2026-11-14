# Báo cáo triển khai RLS production — 14/11/2026

**Dự án:** `atelier-home-web-design`, Supabase `mswiegltusllzvuavjdh`. **Kết quả:** 8 chính sách RLS đã cập nhật thành công; **0 index mới**. Thay đổi đã chạy trực tiếp trên production theo chỉ đạo người sử dụng, mặc dù **chưa có bằng chứng backup/restore thật và chưa có UAT tài khoản Employee**. Không được diễn giải báo cáo này thành nghiệm thu an toàn toàn diện.

## Thay đổi đã thực hiện

- Supabase migration: `20261114084129 optimize_eight_rls_initplans_20261114` (xác minh trong `supabase_migrations.schema_migrations`).
- Git mirror migration: `supabase/migrations/20261114084129_optimize_eight_rls_initplans_20261114.sql`, cùng 8 `ALTER POLICY` với `supabase/rls-initplan-review.sql`.
- Các policy: `care_workflow_read`, `care_workflow_events_read`, `quotes_staff_read`, `quote_versions_staff_read`, `contracts_staff_read`, `commercial_audit_read`, `staff_notification_read`, `staff_notification_mark_read`.
- Chỉ thay `auth.uid()` và `auth.jwt()` bằng `(select auth.uid())` và `(select auth.jwt())` để PostgreSQL dùng initPlan; **không đổi vai trò được cấp**, `staff_profiles.active`, `app_metadata.role`, `recipient_id` hoặc `WITH CHECK`.
- **Rollback sẵn có**: `supabase/rls-initplan-rollback.sql` được đối chiếu từ `pg_policies` trước thay đổi và vượt CI isolated PostgreSQL 17. Chưa chạy rollback production vì bước xác minh hậu triển khai đạt.

## Kiểm chứng sau triển khai

- Đọc trực tiếp 8 policy production: tất cả giữ `roles={authenticated}`, có biểu thức initPlan cho `auth.uid()` / `auth.jwt()`, kiểm tra hồ sơ đang hoạt động và `app_metadata`; UPDATE notification giữ `WITH CHECK`.
- Supabase Performance Advisor: `auth_rls_initplan` **8 → 0**; còn 17 `unindexed_foreign_keys` INFO, 6 `unused_index` INFO.
- Security Advisor còn 4 `SECURITY DEFINER` RPC WARN, 1 `auth_leaked_password_protection` WARN và 2 private tables RLS-without-policy INFO (cách ly chủ ý).
- Kiểm tra tổng số dòng sau thay đổi: `customer_quotes=1`, `customer_quote_versions=1`, `customer_contracts=1`, `projects=6`, `inquiries=2` — khớp số trước đó.

## Phép đo lại (3 lượt, 14/11/2026)

`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` trên 5 câu **SELECT chỉ đọc**, cùng mẫu SQL trước và sau migration. Số liệu là thời gian thực thi trong Postgres cho tài khoản SQL quản trị, **không phải** độ trễ HTTP/UI hay benchmark RLS có JWT thực. Dao động warmup/kế hoạch có thể lấn át hiệu ứng initPlan.

| Câu SELECT | Trước: 3 lượt (ms) | Trung vị trước | Sau: 3 lượt (ms) | Trung vị sau |
| --- | --- | ---: | --- | ---: |
| Báo giá theo inquiry | 1.598 / 0.253 / 0.258 | 0.258 | 1.023 / 0.259 / 0.283 | 0.283 |
| Hợp đồng theo báo giá | 1.541 / 0.226 / 0.222 | 0.226 | 0.296 / 0.239 / 0.229 | 0.239 |
| Sự kiện chăm sóc theo inquiry | 1.036 / 0.258 / 0.257 | 0.258 | 0.282 / 0.258 / 0.278 | 0.278 |
| Điều phối theo công trình | 0.206 / 0.159 / 0.166 | 0.166 | 0.159 / 0.159 / 0.148 | 0.159 |
| Hộp thông báo | 0.829 / 0.228 / 0.207 | 0.228 | 0.228 / 0.216 / 0.218 | 0.218 |

Tất cả 30 phép EXPLAIN ghi `Shared Read Blocks = 0`; hệ thống rất nhỏ (0–16 dòng trên nhiều bảng). **Không kết luận RLS chạy nhanh hơn từ kết quả này**. Để chứng minh tối ưu thực sự phải đo dưới `authenticated`, tập bản ghi đại diện, và truy cập qua API/ứng dụng thật.

## Quyết định về index

**Không tạo bất kỳ index nào.** 3 ứng viên `customer_quotes(inquiry_id)`, `customer_contracts(quote_id)`, `inquiry_care_task_events(inquiry_id)` hiện chưa chứng minh lợi ích trên dữ liệu thật. PostgreSQL chọn seq scan trên các bảng rất nhỏ; riêng `staff_notifications` đã sử dụng `staff_notifications_inbox_idx`. Duy trì file candidate + rollback để dùng khi số liệu tải/tăng trưởng thực tế cho thấy lợi ích và đã đo tác động lên INSERT/UPDATE.

## Cảnh báo chưa thể đóng

1. **Backup/restore production chưa được xác minh.** Tổ chức Supabase Free, không có chứng cứ backup thủ công độc lập, hash và restore cô lập. Cần xuất bản backup thật + thử phục hồi ngay; không coi rollback SQL là backup dữ liệu.
2. **Employee UAT thật chưa thực hiện.** Auth vẫn 1 Admin / 1 Manager / 0 Employee khi tái kiểm tra. CI thử role tổng hợp không phải phiên đăng nhập Employee thật; nên cần thử quyền CRM, quote, notification, token revocation sau khi có tài khoản hợp lệ.
3. **Bảo vệ mật khẩu bị lộ** vẫn chưa bật do gói Free.
4. Theo dõi sau triển khai: kiểm tra truy cập Admin/Manager trên web và Windows, lỗi HTTP 401/403, log PostgREST, row-permission và p95; khi có lỗi dùng `supabase/rls-initplan-rollback.sql` có kiểm soát.

Theo dõi: [Issue #29](https://github.com/infiniti-money/Web-Design/issues/29); [PR #37](https://github.com/infiniti-money/Web-Design/pull/37).
