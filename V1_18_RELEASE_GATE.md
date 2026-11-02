# Tân Design v1.18.0 — Cổng nghiệm thu trước migration và Release

**Trạng thái:** bản nháp PR #18. Không chạy migration SQL lên production và không phát hành khi còn điều kiện chưa đạt.

## Kiểm thử tự động đã đạt — 02/11/2026
- [x] [Node/CI Validate](https://github.com/infiniti-money/Web-Design/actions/runs/41406003677) chạy bộ kiểm thử cấu trúc.
- [x] [Chromium preview desktop và mobile](https://github.com/infiniti-money/Web-Design/actions/runs/41406003689) — editor, snapshot giả lập, xuất PDF A4.
- [x] [Windows 2022 Chromium](https://github.com/infiniti-money/Web-Design/actions/runs/41406003686) — tính tiền, tạo PDF A4 trên Windows runner, màn hình 390 px. **Không thay thế** thử máy in Windows thực hay Safari iOS.
- [x] Supabase SQL test trong `BEGIN ... ROLLBACK` với **JWT giả lập trên mã tài khoản Admin/Quản lý hiện hữu**: Manager không duyệt được; sai tổng tiền bị chặn; Admin duyệt và hợp đồng gắn đúng phiên bản; UPDATE/DELETE phiên bản và sửa qua RPC sau duyệt đều bị chặn.
- [x] Đối chiếu sau rollback: 2 hồ sơ tư vấn, 1 báo giá, 1 phiên bản và 1 hợp đồng giữ nguyên; `commercial_quote_totals` chưa được cài trên production.
- [x] Bản in có tên Tân Design, chi tiết hạng mục, đơn giá, VAT/tổng tiền và nhãn nháp/đã duyệt, không in banner demo.

## Báo cáo tiền phát hành ngày 02/11/2026
- [x] Người sử dụng đã xác nhận **đủ 6 tiêu chí kiểm tra bản in trên thiết bị thực tế** đạt.
- [x] Kiểm thử SQL `BEGIN ... ROLLBACK` được chạy lại: tổng tiền từ server, quyền Admin/Quản lý, khóa UPDATE/DELETE phiên bản, hợp đồng tham chiếu phiên bản duyệt.
- [x] Supabase production: `inquiries=2`, `care_tasks=2`, `quotes=1`, `quote_versions=1`, `contracts=1`, `commercial_audit=11`.
- [x] Preflight: **0** hợp đồng thiếu báo giá, **0** hợp đồng sai khách, **0** hợp đồng trỏ sai phiên bản được duyệt, **0** phiên bản báo giá không có báo giá cha.
- [x] Sau rollback: `commercial_quote_totals` và trigger khóa phiên bản **không tồn tại** trên production; không ghi thay đổi test.
- [x] Đã chuẩn bị `supabase/v1_18-preflight.sql`, `supabase/v1_18-postflight.sql`, ghi chú phát hành dự thảo và workflow Release thủ công (chỉ cho phép chạy trên `main`, có nhập xác nhận riêng).
- [ ] **Chưa có bản sao lưu độc lập có thể khôi phục đã được xác minh.** Đã bổ sung [hướng dẫn sao lưu Windows](V1_18_BACKUP_WINDOWS.md); tham khảo [Supabase Backup](https://supabase.com/docs/guides/platform/backups).
- [ ] Chưa kiểm thử đăng nhập phiên Supabase Auth thật với tính năng mới trong môi trường có schema v1.18.
- [ ] Chưa áp dụng migration vào production; PR vẫn nháp; chưa có tag hoặc Release v1.18.0.
- [ ] Security Advisor vẫn cảnh báo RPC `SECURITY DEFINER` có thể gọi bởi tài khoản đăng nhập; `commercial_action` cố ý dùng RPC có xác minh `staff_profiles` và claim vai trò, cần review định kỳ.

## Chưa đạt / phải xác nhận trước khi phát hành
- [ ] Đăng nhập Admin thật qua Supabase Auth trên máy tính, xác minh quyền, tạo/sửa hạng mục, phê duyệt, in thử bản v1.18; không chia sẻ mật khẩu, JWT hoặc ảnh chứa thông tin khách hàng ra nơi công cộng.
- [ ] Đăng nhập Quản lý thật, xác minh tạo và trình báo giá nhưng không thể phê duyệt hoặc sửa phiên bản đã duyệt.
- [ ] Đăng nhập Nhân viên thật để xác minh bị chặn truy cập. Hiện chưa có tài khoản Nhân viên active.
- [x] Người sử dụng xác nhận 6 tiêu chí bản in thực tế đạt; chưa ghi nhận riêng hệ điều hành và kiểu máy in/thiết bị.
- [ ] Khi chạy UAT có Auth thật, kiểm tra thêm thao tác lưu trực tuyến và mở tài liệu đã lưu trên chính trình duyệt được sử dụng.
- [ ] Kiểm tra phiên bản đã được Admin duyệt trong dữ liệu thật không đổi, hợp đồng đã lưu vẫn tham chiếu đúng phiên bản. Kiểm tra trên bản sao/transaction rollback trước; không chỉnh sửa dữ liệu khách đang sử dụng.
- [ ] Đánh giá Supabase Security Advisor warning cũ về các RPC `SECURITY DEFINER`; không gỡ quyền cần thiết nếu chưa thay thế bằng API an toàn.
- [ ] Xác nhận sao lưu và kiểm tra count trước/sau migration, tối thiểu `inquiries`, `customer_quotes`, `customer_quote_versions`, `customer_contracts`, `commercial_audit`.

## Phương án migration an toàn (sau khi ký duyệt UAT)
1. Xác minh đúng Supabase project `mswiegltusllzvuavjdh`; sao lưu trước thao tác.
2. Áp dụng `supabase/quotes-detailed-v1_18.sql`, sau đó `supabase/quotes-version-lock-v1_18.sql` **trong cùng một quy trình migration được ghi nhận**.
3. Kiểm tra kết quả số lượng bản ghi và quyền `EXECUTE` của hàm tính tiền (không cấp trực tiếp cho `anon` hoặc `authenticated`).
4. Chạy regression SQL có rollback; kiểm tra RPC bằng tài khoản được ủy quyền.
5. Chỉ khi nghiệm thu đạt: gộp PR #18 vào `main`, xác minh GitHub Pages, phát hành tag `v1.18.0`.

**Không dùng script rollback để xác nhận đăng nhập thật.** Nó kiểm tra ràng buộc phía SQL và mô phỏng quyền JWT, không kiểm tra cookie/phiên người dùng trong trình duyệt.

## Kiểm chứng Supabase trực tiếp — 02/11/2026 lúc 22:03 ICT

**Phạm vi thao tác:** chỉ truy vấn `SELECT` trên production `mswiegltusllzvuavjdh`. Không đăng nhập thay người dùng, không ghi dữ liệu, không chạy DDL, không restore và không tạo project tính phí. Những dấu tích bên dưới chỉ xác nhận bằng chứng tương ứng, không phải ký duyệt phát hành.

### 1. Preflight production — ĐẠT (READ ONLY)

- [x] Project trạng thái `ACTIVE_HEALTHY`, PostgreSQL 17.
- [x] Snapshot: `inquiries=2`, `inquiry_care_tasks=2`, `customer_quotes=1`, `customer_quote_versions=1`, `customer_contracts=1`, `commercial_audit=11`.
- [x] Toàn vẹn quan hệ: `contracts_missing_quote=0`, `contracts_wrong_customer=0`, `contracts_wrong_approved_version=0`, `orphan_quote_versions=0`.
- [x] `commercial_quote_totals(jsonb)` chưa cài; trigger khóa phiên bản v1.18 chưa tồn tại/bật. `anon` không có EXECUTE đối với `commercial_action`, `authenticated` có EXECUTE đúng thiết kế hiện tại.
- [x] Bảy bảng quan trọng (`staff_profiles`, `inquiries`, `inquiry_care_tasks`, `customer_quotes`, `customer_quote_versions`, `customer_contracts`, `commercial_audit`) đều bật RLS và có ít nhất một policy.
- [x] Đối chiếu Auth metadata (không đọc email/mật khẩu/token): 1 Admin active, 1 Quản lý active; cả hai có user Auth, email xác minh, đã từng đăng nhập trong 7 ngày qua, không sai `app_metadata.role`; **0 Nhân viên active**.
- [x] Storage bucket hiện có 0; cần kiểm tra lại ở thời điểm sao lưu.

**Giới hạn:** Dấu hiệu `last_sign_in_at` không chứng minh đã thử luồng v1.18 bằng Supabase Auth thật. RLS/policy tồn tại cũng không thay thế phép thử chặn quyền end-to-end.

### 2. Bằng chứng sao lưu — CHƯA ĐẠT

- [ ] Lưu dump độc lập đã mã hóa, có 3 tệp `roles.sql`, `schema.sql`, `data.sql`, kích thước/sha256 và thời điểm tạo.
- [ ] Thử **khôi phục thành công trên môi trường tách biệt** và đối chiếu lại snapshot dữ liệu nghiệp vụ; không được restore đè production.
- [ ] Xác nhận **phục hồi được tài khoản Auth và danh tính** (hoặc phương án backup nền tảng riêng được kiểm thử). CLI `supabase db dump` mặc định loại trừ `auth`/`storage` — 3 tệp SQL **không tự chứng minh** có thể phục hồi tài khoản.
- [ ] Kiểm tra lại Storage objects và sao lưu file riêng nếu có.

Xem [V1_18_BACKUP_WINDOWS.md](V1_18_BACKUP_WINDOWS.md) và [Supabase CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump). **Không chuyển trạng thái backup sang ĐẠT khi chưa có biên bản restore.**

### 3. UAT đăng nhập thật trên schema v1.18 — CHƯA ĐẠT

Chạy trên **môi trường thử nghiệm cách ly** có đủ hai migration v1.18, dùng account/phiên Supabase Auth thật do chủ dự án kiểm soát, không dùng JWT dựng bằng `set_config`. Không thử ghi đè vào dữ liệu khách production; nếu cần tạo project Supabase mới có chi phí, phải có chấp thuận trước.

- [ ] **Admin:** đăng nhập/đăng xuất/đăng nhập lại; tạo báo giá với hạng mục, lưu phiên bản, tải lại trang và mở phiên bản vừa lưu; tổng tiền server và bản in A4/PDF đúng; phê duyệt thành công; bản đã duyệt không thể sửa/xóa; hợp đồng chỉ tham chiếu phiên bản đã duyệt.
- [ ] **Quản lý:** đăng nhập thật; tạo/sửa nháp, trình báo giá; không thể duyệt/từ chối thay Admin; không sửa/xóa bản đã duyệt; không đọc dữ liệu vượt phạm vi.
- [ ] **Nhân viên:** hiện **chưa có tài khoản active**. Chỉ có thể ký đạt sau khi được chủ dự án tạo/mời tài khoản thử nghiệm hợp lệ; xác nhận không mở màn thương mại và không gọi RPC vượt quyền.
- [ ] **Kiểm thử trực tuyến:** lưu và mở lại dữ liệu trên cùng trình duyệt với từng phiên Auth, kiểm tra thông báo lỗi 401/403, đổi tài khoản không rò dữ liệu hoặc giữ quyền cũ.
- [ ] **Bằng chứng:** ghi môi trường, thời điểm, vai trò, kết quả pass/fail và commit/URL; KHÔNG đưa mật khẩu, JWT, token, email khách hoặc ảnh chứa PII lên PR.

**Chặn kỹ thuật:** production hiện chưa có schema v1.18. Không được xem kiểm thử phiên v1.17 trên production là UAT thành công của v1.18.

### 4. Supabase Security Advisor — CÒN HẠNG MỤC RÀ SOÁT

- [ ] Kiểm tra 4 cảnh báo `authenticated_security_definer_function_executable`: `care_advance`, `commercial_action`, `edit_inquiry_care_note`, `generate_task_due_notifications`. Chỉ giữ quyền EXECUTE công khai cho vai trò đã được xác minh đầy đủ ở phía server; không thu hồi tùy tiện khiến chức năng đang chạy hỏng. [Cách xử lý](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- [ ] Đánh giá và bật bảo vệ mật khẩu bị rò rỉ khi gói/cấu hình cho phép. [Tài liệu](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- [ ] Xác nhận cảnh báo thông tin `RLS Enabled No Policy` ở `private.inquiry_rate_limits` là dự kiến, schema `private` không bị lộ qua Data API và truy cập bị chặn.

### 5. Quyết định cổng nghiệm thu

**Kết luận 02/11/2026: NO-GO / BLOCK RELEASE v1.18.0.** Các truy vấn chỉ đọc đã đạt, nhưng chưa có chứng cứ backup có thể khôi phục đầy đủ, phiên Auth thật trên v1.18 chưa được thử và vai trò Nhân viên chưa có tài khoản. Security Advisor cần rà soát bổ sung.

Chỉ đánh dấu **GO** khi backup + restore độc lập, UAT ba vai trò (hoặc ngoại lệ Nhân viên được ghi nhận/phê duyệt bằng văn bản), kiểm soát Security Advisor, preflight/migration/postflight và đối chiếu dữ liệu đều có bằng chứng đạt. Giữ PR #18 ở Draft, chưa merge, chưa tag/release.

## Kiểm thử lại migration trong transaction — 02/11/2026

**Phạm vi:** Từ GitHub nhánh `feat/v1-18-detailed-quote-print`, thực thi nguyên văn `supabase/quotes-detailed-v1_18.sql` rồi `supabase/quotes-version-lock-v1_18.sql` trên project production `mswiegltusllzvuavjdh` trong **một phiên SQL có `BEGIN; ... ROLLBACK;`**. Đây chỉ là thử nghiệm giao dịch, **không ghi migration history, không phát hành, không thay đổi schema vĩnh viễn**.

- [x] Trong giao dịch: cả 2 hàm và trigger bảo vệ được tạo; `anon` và `authenticated` không có EXECUTE trực tiếp trên `commercial_quote_totals(jsonb)`; `authenticated` có EXECUTE trên `commercial_action` theo đúng thiết kế.
- [x] Regression `tests/quote-detail-v1_18-rollback.sql` hoàn tất không lỗi: tổng 1.427.250 VNĐ; chặn tổng tiền sai; Manager không phê duyệt; Admin phê duyệt; bản đã duyệt không sửa/xóa được; hợp đồng tham chiếu phiên bản đã duyệt.
- [x] Sau `ROLLBACK` xác nhận `commercial_quote_totals(jsonb)` và `commercial_quote_version_append_only()` **không tồn tại**, trigger phiên bản **không tồn tại**, production vẫn có `inquiries=2`, `quotes=1`, `quote_versions=1`, `contracts=1`, `commercial_audit=11`.
- [x] Kiểm tra trạng thái GitHub: PR #18 vẫn `open`, `draft=true`, chưa merge.
- [ ] **CHẶN ÁP DỤNG THẬT:** chưa có bản sao lưu độc lập được khôi phục thử (bao gồm phương án bảo toàn Supabase Auth), chưa UAT Auth thật trên schema v1.18 và chưa kiểm tra đóng các cảnh báo bảo mật.
- [ ] Khi vượt gate: chạy migration **có ghi migration history** và pre/postflight, đối chiếu snapshot, kiểm thử Auth thật, rồi mới xét merge và release. Không xem dry-run như migration production.

**Kết luận:** DRY-RUN **PASS**; PRODUCTION MIGRATION **NOT APPLIED / BLOCKED**. Lưu nguyên trạng dữ liệu đang dùng.
