# Nghiệm thu production có kiểm chứng — 14/11/2026

**Dự án:** `atelier-home-web-design` / Supabase PostgreSQL 17.11, Singapore. **Quyết định phát hành database: HOLD** — không chỉnh RLS, index, hàm `SECURITY DEFINER`, Auth hay dữ liệu thật trước khi khắc phục các điều kiện chặn bên dưới.

Tài liệu này là **biên bản những gì đã kiểm tra thật**, không phải biên bản UAT hoàn tất. SQL đo lặp lại: `supabase/production-performance-baseline-readonly.sql`; kiểm toán quyền hiện hữu: `supabase/security-performance-audit-readonly.sql`; theo dõi [Issue #29](https://github.com/infiniti-money/Web-Design/issues/29). Không đưa thông tin khách, email, token, mật khẩu, database dump hoặc bản backup vào repository công khai.

## 1. Sao lưu và khôi phục — BLOCKED

- Kiểm tra tổ chức Supabase trực tiếp: **plan `free`**. Theo [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups), tự động backup hằng ngày chỉ có trên Pro/Team/Enterprise; Free cần dump thủ công và backup offsite. Tính năng này **không chứng minh rằng chưa có backup thủ công**; tuy nhiên kết nối hiện tại **không cung cấp chức năng liệt kê tệp backup/dump, tải backup hoặc kiểm tra một bản restore**.
- Cấu hình production: **PostgreSQL 17.11, dung lượng cơ sở dữ liệu 13 MB, 23 bảng public**. 14/11/2026 đã đối chiếu số dòng không tiết lộ PII:

| Đối tượng | Số dòng hiện có |
| --- | ---: |
| `auth.users` | 2 |
| `auth.identities` | 3 |
| `storage.buckets` | 0 |
| `storage.objects` | 0 |
| `public.projects` | 6 |
| `public.inquiries` | 2 |
| `public.customer_quotes` | 1 |
| `public.customer_quote_versions` | 1 |
| `public.customer_contracts` | 1 |
| `public.staff_profiles` | 2 |

- Repo có `.github/workflows/backup-restore-rehearsal.yml` và `tests/backup-restore-rehearsal.sh`: **chỉ thực hành pg_dump / pg_restore trên dữ liệu synthetic trong PostgreSQL CI**, không phải bằng chứng backup/restore production. Không chạy phục hồi lên project đang phục vụ khách hàng.

### Cổng nghiệm thu backup thật (chỉ thực hiện trên máy tin cậy có quyền)

1. Từ **Supabase Dashboard → Connect**, lấy host được chỉ định cho project. Dùng Supabase CLI tương thích và Docker trên máy riêng. Xem [hướng dẫn chính thức Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) về `supabase db dump --remote ... --role-only`, bản schema và bản data với `--use-copy --data-only`. **Không nhúng mật khẩu trong lịch sử lệnh, issue, log hoặc biến CI công khai**. Dùng cơ chế quản lý bí mật và không in connection string.
2. Sao lưu **Auth** (bao gồm `auth.users`/`auth.identities`) và thay đổi cấu hình Auth theo phương án tương thích được Supabase hướng dẫn; các `supabase db dump` mặc định **bỏ qua schema managed** như `auth` và `storage`, vì vậy ba file `roles/schema/data` **không tự chứng minh khôi phục toàn bộ Auth**. Sao lưu riêng **Storage objects** thực tế (hiện là 0, cần kiểm tra lại tại thời điểm backup); backup DB chỉ có metadata, không lưu file binary.
3. Lưu bản sao mã hóa ngoài máy và ngoài GitHub, kiểm tra kích thước, **SHA-256**, thời gian UTC, phiên bản PostgreSQL, schema/grants/RLS và bản ghi đối chiếu. Không upload dữ liệu thật vào Actions artifacts/repository.
4. **Khôi phục trên môi trường biệt lập**, tuyệt đối không sử dụng endpoint database production làm đích. Thực hiện kiểm tra checksum/row-count, ACL và chính sách RLS của `anon`/`authenticated`, hành trình Auth đăng nhập riêng và Storage thực tế nếu có; ghi lại thời gian khôi phục và lỗi. Chỉ kết luận PASS sau khi có bằng chứng file backup thật và restore thành công. Ghi RPO/RTO đo được, kế hoạch xử lý secret sau restore.
5. Đối chiếu kết quả với số liệu thời điểm dump (không lấy số đếm trước đó làm chuẩn tuyệt đối nếu dữ liệu đã thay đổi). Chốt lịch backup và kiểm tra restore định kỳ trước migration.

## 2. UAT vai trò thật — BLOCKED phần Employee

- **Trực tiếp 14/11/2026:** `auth.users` gồm 1 `admin`, 1 `manager`, **0 `employee`**. Cả hai tài khoản có profile active và role khớp `app_metadata`. Không có tài khoản Nhân viên để đăng nhập thử thật, không tự tạo/invite email khi chưa có danh tính được phê duyệt.
- Giao diện web/Windows đã có smoke tests bằng fixture, **không thay thế UAT thực**. Phải mời/duyệt một employee thật bằng quy trình quản trị, với sự đồng ý người dùng và tài khoản email hợp lệ. Người kiểm thử sử dụng 3 hồ sơ trình duyệt tách biệt + Windows thật; không chia sẻ mật khẩu/tokens.
- Bài UAT tối thiểu: đăng nhập/refresh/logout; employee chỉ xem việc/thông báo được giao; chặn truy cập trực tiếp CRM/dự án/Catalog/CMS/báo giá/báo cáo và RPC bị hạn chế bằng **HTTP/SQLSTATE server**, không chỉ dựa việc ẩn menu; hạ quyền/khóa profile và thử JWT cũ; kiểm tra Admin/Manager vẫn vận hành đúng; chỉ dùng dữ liệu test được phê duyệt. Ma trận chi tiết nằm tại `UAT_ROADMAP_20261114.md`.

## 3. Leaked Password Protection — BLOCKED bởi plan

- Security Advisor vẫn cho `auth_leaked_password_protection` = **WARN**. `free` không hỗ trợ tính năng; [tài liệu Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ghi chỉ từ **Pro trở lên**.
- Không nâng cấp gói, không chỉnh Auth settings. Khi chủ tài khoản chọn nâng cấp và có quyền cấu hình: bật leaked password protection, xác minh lại Advisor không còn WARN và thử quy trình đặt/đổi mật khẩu qua giao diện Auth; đừng suy ra bật thành công chỉ từ cấu hình giao diện.
- Trong lúc chờ: áp dụng mật khẩu dài/duy nhất, MFA và chống lộ bí mật theo quy trình nội bộ. Đây **không tương đương** kiểm tra mật khẩu bị lộ.

## 4. Đo hiệu suất production trước RLS / index — PASS baseline có giới hạn

Đã chạy `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` trên **5 câu SELECT không ghi** 14/11/2026, phía SQL admin. Số liệu thời gian **DB execution** của một mẫu, không bao gồm mạng/UI, và **không kiểm tra RLS khi đăng nhập bằng một role thật**:

| SELECT đại diện | Execution | Truy cập dữ liệu |
| --- | ---: | --- |
| Báo giá theo yêu cầu | 0.258 ms | Seq Scan `customer_quotes` (1 dòng); 5 shared cache hits |
| Hợp đồng theo báo giá | 0.235 ms | Seq Scan `customer_contracts` (1 dòng); 3 cache hits |
| Lịch sử công việc theo yêu cầu | 0.256 ms | Seq Scan `inquiry_care_task_events` (16 dòng); 5 cache hits |
| Điều phối theo công trình | 0.159 ms | Seq Scan `delivery_workspaces` (0 dòng) |
| Thông báo theo người nhận | 0.241 ms | Dùng `staff_notifications_inbox_idx`; 3 cache hits |

- Tất cả 5 câu không đọc thêm shared block từ đĩa trong mẫu này. CSDL hiện nhỏ, quét tuần tự có thể tối ưu hơn index scan. Tạo nhiều index khi bảng chỉ vài dòng sẽ tăng chi phí ghi/bảo trì mà chưa chứng minh cải thiện.
- Stats table (từ `pg_stat_user_tables`) ghi nhận `inquiries` khoảng 2 live rows, `projects` 6, `customer_quotes` 1, `inquiry_care_task_events` 16; `pg_stat_database.stats_reset` là 02/10/2026 17:54 UTC. `pg_stat_statements` chỉ là lịch sử cộng dồn, chưa đủ mẫu traffic thật để suy kết luận.
- Advisors vẫn có **8 `auth_rls_initplan` (WARN), 17 `unindexed_foreign_keys` (INFO), 6 `unused_index` (INFO)**. Không tự áp dụng `supabase/rls-initplan-review.sql`, không tự thêm/xóa index. Cần lấy backup thực + restore thử, đo trên staging với dữ liệu ẩn danh có quy mô, quyền đủ 3 role, sau đó chọn thay đổi có `EXPLAIN` cải thiện đo được.

## 5. Quyết định cuối đợt

| Hạng mục | Trạng thái |
| --- | --- |
| Kết nối DB production và Advisors | **PASS** |
| Đo baseline DB đọc dữ liệu | **PASS với giới hạn** |
| Bản backup production thật có hash, vị trí lưu an toàn | **BLOCKED — chưa kiểm chứng** |
| Restore thực tế từ bản backup vào nơi cách ly | **BLOCKED — chưa kiểm chứng** |
| UAT bằng Employee thật | **BLOCKED — thiếu tài khoản** |
| Leaked Password Protection | **BLOCKED — plan Free** |
| Migration RLS/index vào production | **HOLD** |

**Không đóng Issue #29, không đổi Supabase subscription, không tạo nhân viên giả và không làm thay đổi dữ liệu/ACL/Auth của production.**
