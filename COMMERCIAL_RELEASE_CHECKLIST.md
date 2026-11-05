# Tân Design v1.17 — Kiểm thử và phát hành an toàn

> Tài liệu lịch sử chuẩn bị nghiệm thu ngày 02/11/2026. v1.17 sau đó đã phát hành theo RELEASE_NOTES_V1_17_0.md; các checkbox dưới đây không phải trạng thái phát hành hiện tại. Kiểm thử giả lập/SQL không thay thế nghiệm thu tài khoản thật. Xem [bảng theo dõi hiện tại](RELEASE_HISTORY.md).

## Đã xác minh (02/11/2026)
- GitHub Actions `Validate ATELIER HOME` thành công trên nhánh tích hợp.
- Supabase project hiện tại: `atelier-home-web-design` (`mswiegltusllzvuavjdh`). Không tạo project/database mới.
- Đã áp dụng 2 migration tăng cường vào **database hiện hữu**:
  - `commercial_quote_guard_evidence_v1_17_1`: bắt buộc liên kết báo giá, nguyên nhân từ chối và căn cứ chấp nhận.
  - `commercial_approved_quote_snapshot_v1_17_2`: lưu và kiểm tra đúng phiên bản được duyệt.
- Kiểm tra SQL tại database: `customer_contracts.quote_id` và `quote_version_id` không cho NULL; `anon` không được gọi RPC `commercial_action`.
- Kiểm thử giao dịch trong subtransaction **cố ý rollback** với JWT giả lập cho Admin/Quản lý đã xác minh các trạng thái:
  - Tạo → thêm phiên bản → trình duyệt → từ chối có lý do → sửa phiên bản → trình lại → duyệt → gửi → ghi nhận khách chấp nhận → hợp đồng → xem xét → xác nhận ký.
  - Bị từ chối đúng khi Quản lý cố duyệt/ký, khi thiếu lý do/căn cứ, thiếu báo giá, sai khách hàng hoặc sai phiên bản được duyệt.
  - Sau kiểm thử: báo giá, hợp đồng và nhật ký thử vẫn bằng **0**.
- Kiểm thử bằng JWT giả lập **không thay thế** việc đăng nhập bằng tài khoản thực tế qua trình duyệt.

## Bổ sung kiểm thử giao diện mô phỏng (02/11/2026)
- Đã thêm `tests/commercial-ui.test.cjs` vào GitHub Actions; CI thành công.
- Mock DOM và Supabase kiểm tra: khách chưa đăng nhập; tài khoản Nhân viên; tài khoản đã vô hiệu hóa; vai trò không khớp JWT; lỗi truy cập Auth.
- Kiểm tra Quản lý tạo báo giá, giữ lựa chọn khách hàng sau tải lại; ngăn thao tác trùng; hợp đồng dùng mã phiên bản đã duyệt; xử lý đúng khi RPC lưu thành công nhưng tải lại thất bại.
- Đây là kiểm thử mô phỏng phía trình duyệt, **không** phải thử đăng nhập thật hay thử giao diện trực quan trên điện thoại.

## Bản xem trước đã tạo (02/11/2026)
- GitHub Actions đã chạy [Preview v1.17](https://github.com/infiniti-money/Web-Design/actions/runs/41365896771) trên runner `ubuntu-24.04`, với Chromium và Supabase giả lập.
- Tải bộ ảnh: [tan-design-v1-17-preview](https://github.com/infiniti-money/Web-Design/actions/runs/41365896771/artifacts/13107435442), gồm 4 ảnh PNG, README và report.json.
- Viewport được kiểm tra: Admin desktop 1440x900, Admin mobile 390x844, Manager desktop 1280x800, Employee mobile 390x844. Không phát hiện lỗi JS hoặc tràn ngang; Nhân viên bị chặn đúng trong mô phỏng.
- **Giới hạn:** Chưa kiểm tra bằng phiên đăng nhập thực; ảnh và phản hồi đều là dữ liệu mô phỏng, không được dùng làm bằng chứng vận hành production.
- Supabase đang có 2 tài khoản Auth (Admin và Quản lý), **0 tài khoản Nhân viên**. Mời một địa chỉ email Nhân viên hợp lệ bằng màn hình quản trị (không tạo user giả qua SQL), xác minh thư mời rồi kiểm tra đăng nhập thực.
- Chưa phát hành v1.17 hoặc gộp PR #15 vì còn thiếu UAT qua trình duyệt với tài khoản thật.

## Bản demo ngoại tuyến có thể thao tác (02/11/2026)
- Artifact mới: [Tải ZIP demo v1.17](https://github.com/infiniti-money/Web-Design/actions/runs/41369258618/artifacts/13108531370).
- Trong ZIP, mở `interactive-demo.html` từ máy tính hoặc điện thoại; bản dựng chỉ sử dụng dữ liệu và tài khoản mô phỏng trong bộ nhớ, không tải SDK Supabase và không gọi dịch vụ ngoài.
- Chromium đã chạy kiểm thử thực tế trên bản demo: tạo báo giá, Admin duyệt và gửi, ghi nhận khách chấp nhận, tạo hợp đồng bằng phiên bản được duyệt, trình xem xét và ghi nhận ký.
- CI kiểm tra mã: [Validate ATELIER HOME](https://github.com/infiniti-money/Web-Design/actions/runs/41369258634) thành công.
- CI kiểm thử preview: [Preview v1.17](https://github.com/infiniti-money/Web-Design/actions/runs/41369258618) thành công; ZIP có ảnh chụp các viewport và ảnh sau quy trình demo.
- Demo không phải chữ ký số, không tạo hợp đồng thật, không phải kết quả đăng nhập tài khoản thực.

## Cần hoàn thành trước khi gộp/phát hành
- [ ] Đăng nhập bằng tài khoản Admin thực, tạo và duyệt/từ chối báo giá thử; kiểm tra nhật ký và mã phiên bản.
- [ ] Đăng nhập bằng tài khoản Quản lý thực, tạo/sửa/trình báo giá; xác nhận không thể duyệt hoặc ký.
- [ ] Kiểm thử tài khoản Nhân viên thực sau khi doanh nghiệp cấp tài khoản; không được mở trang thương mại hoặc đọc báo giá ngoài quyền.
- [ ] Xác nhận khách hàng thực tế chỉ được ghi nhận là "đã chấp nhận" khi có bằng chứng bên ngoài hệ thống; không giả mạo chữ ký.
- [ ] Kiểm tra hiển thị trên điện thoại, dấu tiếng Việt, danh sách dài, phản hồi khi mất kết nối.
- [ ] Kiểm tra GitHub Pages sau khi merge: `commercial.html`, phân quyền hiển thị các liên kết và thử lại RLS.
- [ ] Kiểm tra bản sao lưu và số lượng hồ sơ trước/sau deploy; chỉ tạo Release khi toàn bộ tiêu chí đạt.

## Quy tắc migration
- **Không chạy lại** ba tệp schema/links/actions ban đầu trên database đang sử dụng: các bảng, policy và RPC đã tồn tại.
- Hai tệp `...safety-hardening.sql` và `...approved-snapshot.sql` là bản tương ứng với các migration đã áp dụng. Không áp dụng lặp khi không cần.
- Với cơ sở dữ liệu mới, chạy schema → link → actions theo thứ tự (hoặc quy trình migration được kiểm thử), sau đó kiểm tra `pg_policies` và `information_schema.columns`.
- Không đưa mật khẩu, session JWT, `service_role` hay secret Supabase vào mã nguồn client, log hoặc PR.
