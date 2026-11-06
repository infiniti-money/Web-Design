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

Đã triển khai giao diện tại revision `e00f735ab85f82b7ca4e278b2cb81309d86ecbd8`, đối chiếu `release.json` rồi chạy script `tests/projects-admin-browser.cjs` trực tiếp trên Pages: đạt các ca dưới đây. Các ca dùng fixture trong trình duyệt, chặn API production; không tạo/sửa/xóa công trình thật. Bộ Node đạt 96/97 bài, 0 lỗi, 1 bài gửi dữ liệu thật chủ động bỏ qua.

- Trường hợp 0 hàng hoặc ID phản hồi khác không được báo lưu/xóa thành công.
- Khi ghi: khóa trường/nút tạo mới/hành động bảng, chặn gửi trùng. Khi lỗi mạng: giữ nội dung, không tự gửi lại.
- Cảnh báo nội dung chưa lưu; người dùng có thể hủy chuyển tab/tạo mới. Native beforeunload bảo vệ khi rời trang, còn phụ thuộc hành vi trình duyệt.
- Lỗi đọc: ẩn hàng cũ, số liệu “—”, thông báo chưa tải thay vì coi là 0. Lượt đọc chậm không ghi đè lượt đọc sau.
- Xác nhận ghi thành công nhưng tải lại lỗi phải tách biệt; không hướng dẫn gửi lại bản ghi đã xác nhận.
- Tạo/sửa/xóa được xác nhận, hiển thị điện thoại và kiểm tra lỗi JavaScript. CI PostgreSQL chạy migration thực và cùng bộ SQL với dữ liệu tổng hợp trong database tách biệt.

Các mục còn mở: UAT Admin/Quản lý/Nhân viên thật, thiết bị vật lý, backup/restore độc lập, migration quote history và nội dung công trình/ảnh thật. Bản vá này không đánh dấu hoàn tất toàn bộ UAT hoặc mọi cổng bảo mật của dự án.

## Bằng chứng triển khai đợt đầu

- [Validate](https://github.com/infiniti-money/Web-Design/actions/runs/42313926885) thành công, gồm migration thật và bộ kiểm thử vai trò trên PostgreSQL 17 cách ly.
- [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42313926828) lần đầu lỗi HTTP 500 khi tạo deployment. Chạy lại riêng job deploy thành công ở attempt 2; không đổi mã hoặc ghi lại dữ liệu để xử lý lỗi hạ tầng.
- Đã thêm ca ID trả về sai và fixture đầy đủ; chạy lại browser trên Pages đạt. Ảnh desktop/mobile kiểm tra ở đầu trang và sau khi menu mobile đóng ổn định. Bổ sung script vào browser smoke cho các đợt tiếp theo.
- Smoke tổng thể cũ cần cập nhật fixture project INSERT/UPDATE/DELETE để hỗ trợ `.select("id").single()` như API thực; lượt CI cũ dừng tại ca CRUD vì fixture trả Promise không có projection. Sau sửa riêng fixture, chạy lại `tests/browser-smoke.cjs` trên Pages đạt toàn bộ: công trình CRUD, CRM phân trang/KPI/CSV, mobile, form và trạng thái lỗi. Không nới kiểm tra ID trong mã ứng dụng; các ca trả 0 hàng/sai ID vẫn phải bị từ chối.

## PC 1.1.2

Đã phát hành [Windows Manager 1.1.2](https://github.com/infiniti-money/Web-Design/releases/tag/desktop-v1.1.2) qua [workflow Windows](https://github.com/infiniti-money/Web-Design/actions/runs/42314513514), giữ dependency, appId, kho phiên DPAPI và feed `desktop-stable`.

- 4 bài desktop security/updater đạt; Electron thật đạt UI local, sandbox/context isolation, mã hóa/xóa phiên giả, chặn tài nguyên ngoài allowlist, trạng thái updater và PDF báo giá mẫu. Đây là fixture, không đăng nhập bằng tài khoản thật.
- Setup và Portable dựng/phát hành thành công. Feed HTTP 200 trả version 1.1.2; đã tải đầy đủ Setup qua feed, 121.565.860 byte, SHA-512 `iV1ZGMUkIiTiI3xyvf20z+5jr+fN8Js/WGDxcrvZdp9np0XQpy4dNfVBSd2QBe5/9kg/Pt/CD+HFmLHS3hbUgg==` khớp `latest.yml`.
- Portable 110.663.810 byte, URL release trả HTTP 200; không đồng nhất kiểm tra tải được với kiểm tra checksum hoặc chạy Portable thực tế.
- Log build xác nhận bỏ qua ký số vì chưa có chứng thư. Chưa nghiệm thu cài đè/nâng cấp trên máy đang có bản cũ; không ghi đạt UAT cài nâng cấp chỉ từ feed/checksum.

## Gói nguồn web

[Release v1.24.0](https://github.com/infiniti-money/Web-Design/releases/tag/v1.24.0) ở revision `134f1a5cf27680e53f156a228ceb6eca98a67791`, [workflow đóng gói](https://github.com/infiniti-money/Web-Design/actions/runs/42314512897) thành công. Đã tải ZIP 591.454 byte, SHA-256 `948fa9b0985156b59862c6b8fa3f3a84e883c2ccc00083e87a97d9e10fb57470` khớp `SHA256SUMS.txt`. Tag/gói giữ nguyên; sửa fixture smoke sau tag tiếp tục trên nhánh chính, không đổi mã ứng dụng đã đóng gói.

## Xác nhận cuối ngày 07/11/2026

Website trả revision `df691d92ad57b004fa09d8a34ad024433e631d7b` từ `release.json`. [Validate](https://github.com/infiniti-money/Web-Design/actions/runs/42314938007), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42314937918) và [browser smoke sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42315006081) đều thành công toàn bộ, gồm ca quản trị công trình mới, fixture CRUD đã sửa và các module hiện có. Khác biệt sau tag chỉ ở fixture smoke/tài liệu; web và PC giữ cùng mã chức năng công trình đã kiểm tra. Đã đẩy báo cáo/roadmap lên main; chưa coi các điều kiện UAT/backup/ký số còn mở là hoàn tất.
