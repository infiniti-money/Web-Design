# Sao lưu và thử khôi phục ATELIER HOME

Ngày lập: 08/11/2026. Project nguồn đang chạy: `mswiegltusllzvuavjdh`.

**Cập nhật 08/11/2026: đã xuất backup dữ liệu thật trên gói Free và thử khôi phục database cách ly.** 59/59 bảng khớp số dòng; ba nhóm dữ liệu báo giá/phiên bản/dự án khớp hash. Đã cài và kiểm tra Docker, PostgreSQL client và CLI. [Bằng chứng, giới hạn và việc còn thiếu](BACKUP_RESTORE_EVIDENCE_20261108.md). Chưa nghiệm thu đăng nhập qua Auth service hoặc toàn bộ ứng dụng; payOS vẫn tắt thu tiền. Các bước dưới đây là runbook để lặp lại.

## Dành cho project gói Free — bắt đầu tại đây

Gói Free vẫn xuất logical backup thủ công được. Supabase khuyến nghị người dùng Free dùng `supabase db dump` và giữ bản ngoài dịch vụ; không cần nâng gói Supabase để xuất theo cách này. Mục Backups trong Dashboard không phải bước bắt buộc cho project này. Nguồn: [Database Backups, phần giới thiệu](https://supabase.com/docs/guides/platform/backups).

Lộ trình cho ATELIER HOME:

1. Chuẩn bị thư mục riêng ở bước 1. Bỏ qua bước 2 nếu Dashboard không cung cấp backup.
2. Chuẩn bị Docker Desktop và CLI theo [hướng dẫn xuất của Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Máy này đã cài Docker Desktop 4.98.0, PostgreSQL client 17.11 và CLI 3.0.0; mở terminal mới để nhận User PATH. Việc cài công cụ riêng lẻ chưa tạo bản backup.
3. Thực hiện lệnh xuất ở bước 3 bằng tài khoản chủ sở hữu. Mật khẩu database khác ba khóa payOS; chỉ nhập qua prompt riêng trên máy, không gửi vào chat. Nếu mạng không hỗ trợ IPv6, dùng kết nối **Session pooler** trong Dashboard → Connect theo tài liệu; không chọn Transaction pooler cho dump.
4. Lưu file Storage/cấu hình ở bước 4. Kiểm tra dung lượng truyền và giới hạn đang dùng; xuất thủ công không cấp thêm quota cho gói Free.
5. Khôi phục vào Supabase local riêng ở bước 5 để thử mà không cần mua thêm project cloud; kiểm tra khả năng tương thích và nghiệm thu ở bước 6.

Không đổi gói hoặc tạo dịch vụ trả phí trong quy trình này. Lần xuất dữ liệu thật ngày 08/11 đã thành công sau khi chủ sở hữu đăng nhập CLI. Các secrets payOS không thay thế quyền kết nối PostgreSQL để sao lưu; CLI dùng quyền đăng nhập Supabase cho lần xuất này.

## 1. Chuẩn bị nơi lưu độc lập

- Dùng thư mục riêng ngoài Git/OneDrive, ví dụ `C:\AtelierPrivateBackups\2026-11-08`. Chỉ tài khoản chủ sở hữu và người phụ trách phục hồi được đọc. Lưu thêm bản mã hóa trên thiết bị khác; kiểm tra có thể giải mã, giữ khóa trong trình quản lý mật khẩu riêng.
- SQL có thể chứa hồ sơ khách hàng và dữ liệu Auth nhạy cảm. Không đưa dump, file Storage, token, mật khẩu, khóa mã hóa hoặc khóa payOS vào repository, issue hay chat. Không bật PowerShell transcript/debug khi nhập thông tin xác thực.
- Ghi giờ bắt đầu/kết thúc, phiên bản PostgreSQL/Supabase CLI, commit website, người thực hiện và phạm vi. Thống nhất khoảng ngừng ghi của nhân viên khi xuất bộ sao lưu để các file roles/schema/data và Storage không lệch nhau; website công khai có thể tiếp tục đọc. Nếu vẫn phát sinh ghi, ghi rõ giới hạn tính nhất quán và làm lại bản cuối trước migration.

## 2. Kiểm tra backup có sẵn trong Dashboard

Mở [Dashboard của dự án](https://supabase.com/dashboard/project/mswiegltusllzvuavjdh), vào **Database → Backups**, ghi thời điểm và loại backup gần nhất. Khả năng tải/khôi phục tùy loại backup và gói đang dùng. Nếu có tải xuống, lưu bản độc lập vào thư mục trên. Không bấm Restore vào dự án nguồn để thử: thao tác đó có thể gián đoạn website và thay dữ liệu đang chạy.

Nếu không có bản tải phù hợp, dùng logical export ở bước 3. Bản tự động trên cùng dịch vụ không thay thế bằng chứng đã khôi phục từ bản độc lập. Xem [tài liệu Database Backups](https://supabase.com/docs/guides/platform/backups).

## 3. Xuất database bằng CLI đã kiểm tra cú pháp

Cài/chạy Docker Desktop và Supabase CLI 3.0.0; cài PostgreSQL client phù hợp để phục hồi sau này. Kiểm tra `supabase --version`, `supabase db dump --help` và `supabase link --help`. CLI 3 mặc định chọn local, vì vậy các lệnh xuất dưới đây **ghi rõ project nguồn bằng --remote**.

Đăng nhập CLI bằng luồng chính thức trên máy riêng. Tại checkout, liên kết đúng project nguồn bằng lệnh dưới; nếu được hỏi mật khẩu, nhập qua prompt. Không thêm mật khẩu/token vào lệnh, URL hoặc script. Nếu quyền CLI/tài khoản không đủ, dừng và cấp quyền qua Dashboard; không lấy secret từ frontend để thay thế.

```powershell
supabase link --project-ref mswiegltusllzvuavjdh
if ($LASTEXITCODE -ne 0) { throw 'Không liên kết được project nguồn' }

$atelierBackup = 'C:\AtelierPrivateBackups\2026-11-08'
New-Item -ItemType Directory -Path $atelierBackup -Force | Out-Null

supabase db dump --remote=mswiegltusllzvuavjdh --role-only --file "$atelierBackup\roles.sql"
if ($LASTEXITCODE -ne 0) { throw 'Xuất roles thất bại' }

supabase db dump --remote=mswiegltusllzvuavjdh --file "$atelierBackup\schema.sql"
if ($LASTEXITCODE -ne 0) { throw 'Xuất schema thất bại' }

supabase db dump --remote=mswiegltusllzvuavjdh --data-only --use-copy --exclude storage.buckets_vectors --exclude storage.vector_indexes --file "$atelierBackup\data.sql"
if ($LASTEXITCODE -ne 0) { throw 'Xuất data thất bại' }

supabase db dump --remote=mswiegltusllzvuavjdh --schema supabase_migrations --file "$atelierBackup\history_schema.sql"
if ($LASTEXITCODE -ne 0) { throw 'Xuất migration schema thất bại' }

supabase db dump --remote=mswiegltusllzvuavjdh --schema supabase_migrations --data-only --use-copy --file "$atelierBackup\history_data.sql"
if ($LASTEXITCODE -ne 0) { throw 'Xuất migration data thất bại' }

Get-ChildItem -LiteralPath $atelierBackup -Filter '*.sql' |
  Get-FileHash -Algorithm SHA256 |
  Export-Csv -LiteralPath "$atelierBackup\sql-sha256.csv" -NoTypeInformation
```

Các bảng vector bị loại trừ theo hướng dẫn CLI của Supabase; nếu dự án sử dụng vector buckets/indexes, phải có phương án sao lưu riêng, không ký nghiệm thu thiếu chúng. Kiểm tra file có dung lượng hợp lý và kiểm kê bảng nghiệp vụ, Auth users/identities, staff, phiên bản báo giá, private schema và sequences thực sự có trong bộ xuất. Không coi exit code 0 hoặc checksum là bằng chứng đủ dữ liệu. Lịch sử migration được xuất riêng; tùy chỉnh trigger/policy trong schema Auth/Storage phải rà từ migration thực tế và phục hồi riêng vì dump chuẩn có loại trừ đối tượng do nền tảng quản lý.

## 4. Những phần phải lưu ngoài SQL

| Phần | Cách chuẩn bị và xác nhận |
| --- | --- |
| Storage | Kiểm kê mọi bucket/path, số file, tổng byte, cấu hình public/private và policy. Tải file qua công cụ được ủy quyền, giữ nguyên đường dẫn/MIME và lập checksum từng file. Với nhiều file phải phân trang và đi hết thư mục con. So lại số lượng/byte sau tải. Database chỉ có metadata, không có nội dung file. |
| Auth | Kiểm kê users/identities và liên kết staff bằng ID, không xuất thông tin nhạy cảm ra báo cáo công khai. Lưu riêng cấu hình provider, redirect URL, MFA và SMTP; phục hồi tài khoản không đồng nghĩa khôi phục được mọi phiên đăng nhập/provider. Kiểm tra bằng tài khoản thử do chủ sở hữu kiểm soát. |
| Mã và cấu hình | Ghi commit/tag, Edge Function source, cấu hình domain, Auth, Storage, cron, database webhooks, extensions và Realtime publications. Lưu cấu hình quản trị ở nơi riêng. |
| Secret/mã hóa | Secret Edge, mật khẩu custom login roles và vật liệu mã hóa cần phương án riêng do chủ sở hữu quản lý. Không mặc định dump chứa được chúng. Nếu dùng Vault/column encryption, theo nhánh encrypted restore của tài liệu Supabase; không tự trích/xuất khóa trong chat hoặc chạy restore thông thường rồi coi thành công. |

## 5. Dựng nơi thử khôi phục cách ly

Ưu tiên một Supabase local riêng trên Docker, trong thư mục thử nghiệm mới, không liên kết production. Dùng phiên bản tương thích nguồn; PostgreSQL trống đơn lẻ chưa đủ để kiểm tra Auth/Storage của Supabase. Phương án khác là một Supabase staging riêng do chủ sở hữu tạo sau khi kiểm tra chi phí; không dùng chung database hoặc bucket với nguồn.

Trước khi nhập dữ liệu:

1. Ghi rõ host, port, database và project ref **đích**. Đích không được là `mswiegltusllzvuavjdh`, hostname database/pooler hoặc API nguồn. Xác nhận đích mới, không có dữ liệu cần giữ.
2. Chặn outbound từ môi trường thử trước khi nhập. Không đưa SMTP/payOS/tawk.to production vào đích; cron, retention, database webhook và HTTP jobs phải vô hiệu ở đích. Không gửi email, thu tiền hoặc xóa hồ sơ theo lịch trong rehearsal.
3. Chỉ bản app local trỏ đến đích; không sửa cấu hình website GitHub Pages để thử. Không đưa dữ liệu phục hồi ra URL công khai.
4. Bật các extension cần thiết, kiểm tra managed roles và tùy chỉnh Auth/Storage. Nếu có Vault/encryption, giải quyết khả năng giải mã theo tài liệu chính thức trước khi tiếp tục.

Người phụ trách kỹ thuật phục hồi theo [quy trình CLI chính thức](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore): roles → schema → data trong transaction có dừng khi lỗi; dùng thiết lập replication role theo hướng dẫn để tránh trigger xử lý lặp dữ liệu mã hóa. Rà các grant/custom roles xung đột trên bản sao làm việc, không sửa bản gốc. Khôi phục lịch sử migration, tùy chỉnh managed schema và publication riêng. Không dùng lệnh bỏ qua mọi lỗi. Lưu log riêng đã che thông tin xác thực.

Hướng dẫn này không cung cấp lệnh restore tự chạy với URL đích chưa xác minh. Khi đã có đích cụ thể, chuẩn bị lệnh kết nối không chứa mật khẩu và kiểm tra đích trước khi nhập. Không chạy `db reset --remote`, `db push` hoặc restore vào nguồn để diễn tập.

File Storage phải upload lại vào bucket **đích** bằng đường dẫn/cấu hình đúng; chỉ nhập metadata SQL chưa làm ảnh mở được. Đối chiếu mapping owner/Auth ID và quyền truy cập sau nhập.

## 6. Nghiệm thu từ bản phục hồi

- So số dòng chính xác từng bảng nghiệp vụ và Auth/staff với mốc sao lưu; so ID, nội dung/hash của báo giá và phiên bản, số tiền, sequence và quan hệ. Không chỉ so tổng số bảng. Ghi nhận mọi thay đổi nguồn xảy ra sau mốc sao lưu.
- Đăng nhập Admin thử: đọc được dữ liệu được phép; Manager/nhân viên không được xem nội dung ngoài quyền. Thử tài khoản đã vô hiệu và truy cập anon. RLS, grants và trigger phải hoạt động sau restore.
- Mở ảnh/file trên app thử; so số file, tổng byte/checksum; file private không đọc được khi chưa được phép.
- Thử mở CRM, bài viết, dự án và báo giá trên bản app local. Các thao tác ghi chỉ dùng hồ sơ thử ở đích. Kiểm tra cron/outbound vẫn tắt.
- Trên bản đích đã phục hồi, chạy thử migration bảo vệ lịch sử báo giá rồi ledger payOS; xác minh UPDATE/DELETE lịch sử bị chặn và nghiệp vụ cũ vẫn dùng được. Kiểm thử payment dùng dữ liệu/SDK giả, chưa giao dịch thật.
- Ghi thời gian khôi phục thực tế, phần chưa khôi phục được và người xác nhận. Kết quả thiếu Auth/Storage hoặc lệch dữ liệu là **chưa đạt**, không chuyển thành đạt nhờ CI tổng hợp.

## 7. Biên bản lưu riêng

```text
Nguồn / mốc dữ liệu / commit:
Người thực hiện / thời gian bắt đầu-kết thúc:
Vị trí backup chính / bản mã hóa độc lập:
Phiên bản PostgreSQL / Supabase CLI:
Danh sách file / kích thước / SHA256:
Đích cách ly / cách chặn outbound:
Kết quả bảng + hash báo giá:
Kết quả Auth + RLS + tài khoản vô hiệu:
Kết quả Storage + checksum + private access:
Kết quả migration guard/ledger trên đích:
Thời gian khôi phục / sai lệch / việc còn thiếu:
Kết luận ĐẠT hoặc CHƯA ĐẠT / người xác nhận:
```

Chỉ đưa trạng thái tổng hợp không có dữ liệu khách hàng vào repository. Khi biên bản đạt, chuẩn bị bản sao lưu mới ngay trước thay đổi production và kế hoạch xử lý sự cố; các migration staging không tự được phép áp dụng chỉ vì đã tạo file backup.
