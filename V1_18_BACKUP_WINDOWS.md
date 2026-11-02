# Tân Design v1.18 — Sao lưu an toàn trên Windows trước khi migration

**Tài liệu dành cho quản trị viên. Không đưa dữ liệu sao lưu, mật khẩu, database URL hoặc thông tin khách hàng lên GitHub/PR.**

## Tại sao cần
Dự án Supabase hiện tại đã chứa khách hàng, 1 báo giá, 1 phiên bản báo giá và 1 hợp đồng. Bản SQL `BEGIN ... ROLLBACK` chỉ là kiểm thử, **không phải bản sao lưu có thể khôi phục**.

Supabase Free không cung cấp bản backup hằng ngày tải từ Dashboard như gói Pro. Có thể tự sao lưu với [Supabase CLI — Backup and Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) và lưu bản sao ngoài máy chủ.

## Trên Windows — PowerShell
1. Cài **Supabase CLI** và **Docker Desktop** theo hướng dẫn chính thức.
2. Mở [Supabase Dashboard — dự án Tân Design](https://supabase.com/dashboard/project/mswiegltusllzvuavjdh), chọn **Connect** và lấy kết nối PostgreSQL của **dự án này**, không phải dự án Hưng Yên Jobs. Dùng direct hoặc session pooler nếu mạng không hỗ trợ IPv6.
3. Trong PowerShell riêng trên máy tin cậy, đặt biến `SUPABASE_DB_URL` chứa chuỗi kết nối. Không nhập mật khẩu/database URL vào cửa sổ chat hoặc GitHub.
4. Tạo thư mục lưu backup riêng, bên ngoài repository:
   ```powershell
   $folder = Join-Path $HOME ("Documents\TanDesignBackups\v1.18-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
   New-Item -ItemType Directory -Path $folder -Force | Out-Null
   if (-not $env:SUPABASE_DB_URL) { throw "Thiếu biến môi trường SUPABASE_DB_URL" }
   supabase db dump --db-url "$env:SUPABASE_DB_URL" -f (Join-Path $folder "roles.sql") --role-only
   if ($LASTEXITCODE -ne 0) { throw "Backup roles thất bại" }
   supabase db dump --db-url "$env:SUPABASE_DB_URL" -f (Join-Path $folder "schema.sql")
   if ($LASTEXITCODE -ne 0) { throw "Backup schema thất bại" }
   supabase db dump --db-url "$env:SUPABASE_DB_URL" -f (Join-Path $folder "data.sql") --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
   if ($LASTEXITCODE -ne 0) { throw "Backup data thất bại" }
   Get-ChildItem $folder | Select-Object Name,Length
   ```
5. Xác minh cả 3 tệp tồn tại, có dung lượng phù hợp và **thử quy trình phục hồi trên môi trường tách biệt** trước khi ghi nhận bản sao lưu đáng tin cậy. Mã hóa và lưu ở vị trí an toàn ngoài máy chủ.
6. Dọn biến môi trường sau khi sao lưu:
   ```powershell
   Remove-Item Env:SUPABASE_DB_URL -ErrorAction SilentlyContinue
   ```

**Chú ý:** Không chạy lệnh `psql` phục hồi trên project production. Kiểm thử khôi phục dữ liệu có thể cần môi trường riêng và phát sinh chi phí; không tạo Supabase branch/project khi chưa chấp thuận chi phí.

## Trước khi xác nhận UAT
- [ ] Backup có 3 tệp, xác minh mở/khôi phục được.
- [ ] Ghi nhận thời điểm sao lưu, nơi lưu an toàn, không đưa đường dẫn chứa thông tin nhạy cảm lên PR.
- [ ] Chạy `supabase/v1_18-preflight.sql`, đối chiếu số lượng khách/báo giá/phiên bản/hợp đồng.
- [ ] Thử Auth Admin/Quản lý trên môi trường đã có schema v1.18, không dùng JWT giả lập thay thế.
- [ ] Chạy migration và `supabase/v1_18-postflight.sql`, đối chiếu dữ liệu và quyền.
- [ ] Sau khi tất cả đạt, mới gộp PR #18 và chạy workflow phát hành v1.18 thủ công.

Tài liệu chính thức: https://supabase.com/docs/guides/platform/backups

## Phạm vi sao lưu và xác minh khả năng phục hồi tài khoản — kiểm tra bổ sung 02/11/2026

**Lưu ý bảo vệ nhân sự:** Theo tài liệu CLI chính thức, `supabase db dump` mặc định **loại trừ schema do Supabase quản lý**, bao gồm `auth` và `storage`. Vì vậy ba lệnh ở trên bảo vệ dữ liệu nghiệp vụ và schema ứng dụng, nhưng **không đủ bằng chứng** để khẳng định phục hồi được `auth.users`, `auth.identities`, thiết lập nhà cung cấp đăng nhập hoặc các đối tượng Storage. Không đánh dấu gate backup đạt chỉ nhờ có `roles.sql`, `schema.sql` và `data.sql`.

Đối chiếu production chỉ đọc lúc **22:03 ICT, 02/11/2026**: 1 Admin và 1 Quản lý đang active, đã xác minh email, `app_metadata.role` khớp `staff_profiles.role`; chưa có Nhân viên active; Storage hiện có 0 bucket. Số liệu này là **mốc đối chiếu**, không phải bản sao lưu.

### Bằng chứng bắt buộc trước khi mở gate
- [ ] Có `roles.sql`, `schema.sql`, `data.sql` lưu ngoài repository và ngoài máy chủ production. Chạy `Get-ChildItem $folder -File | Get-FileHash -Algorithm SHA256` trong PowerShell, lưu riêng bản ghi checksum và thời điểm; không đăng lên GitHub các tệp dump hoặc đường dẫn nhạy cảm.
- [ ] Xác minh dữ liệu nghiệp vụ thật sự có trong dump, và bản dump có thể **khôi phục** trên một Postgres/Supabase *tách biệt*, không chạy restore ở production. Đối chiếu `inquiries=2`, `care_tasks=2`, `quotes=1`, `quote_versions=1`, `contracts=1`, `commercial_audit=11` theo snapshot tại 22:03 ICT (nếu có hoạt động sau mốc đó, dùng snapshot mới ngay trước dump).
- [ ] Có phương án **khôi phục Auth** được kiểm thử riêng: dữ liệu `auth.users` và danh tính `auth.identities`, hai vai trò Admin/Quản lý cùng metadata cần được bảo toàn, hoặc có backup nền tảng/khôi phục project mới được xác minh là bao gồm Auth. Khôi phục xong phải đăng nhập thử bằng tài khoản được chủ sở hữu cho phép. Không giả định dump mặc định đã chứa Auth.
- [ ] Kiểm tra lại danh sách và đối tượng Storage tại thời điểm backup; nếu có tệp Storage, thực hiện sao lưu đối tượng riêng (backup database chỉ có metadata), kiểm tra khả năng phục hồi tệp.
- [ ] Lưu bản sao đã mã hóa ở nơi độc lập, kiểm tra checksum **sau khi sao chép**, lưu biên bản khôi phục (thời điểm, phạm vi, kết quả, không ghi bí mật/PII).
- [ ] Không tạo project/branch Supabase có thể phát sinh chi phí khi chưa được chủ dự án đồng ý; không sử dụng production làm môi trường restore.

**Tài liệu đối chiếu:** [Supabase CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump), [Backup and Restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Database Backups](https://supabase.com/docs/guides/platform/backups).

**Kết luận lúc lập biên bản:** Chưa được kiểm chứng bản sao lưu độc lập có thể khôi phục cả dữ liệu nghiệp vụ và tài khoản Auth → **BLOCK RELEASE**.
