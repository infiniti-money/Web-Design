# Nghiệm thu kính mờ và chat — 19/11/2026

## Bản phát hành

- Mã nguồn: 9d576f89e7cdc4535a57c1c7157751c054166aaf. Web v1.30.0 và desktop-v1.3.0 cùng trỏ revision này. Pages release.json xác nhận đúng revision; chat.html trả HTTP200/noindex.
- [CI Validate](https://github.com/infiniti-money/Web-Design/actions/runs/44354495085): tất cả 4 job xanh ở attempt2. Lần đầu Catalog no-JS báo native View Transition bị hủy khi resize viewport; chạy lại riêng job đã qua, không sửa/gỡ assertion. SQL và Windows packaging đã qua trước đó.
- [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/44354495652), [deployed browser](https://github.com/infiniti-money/Web-Design/actions/runs/44354613507), [SEO/Lighthouse](https://github.com/infiniti-money/Web-Design/actions/runs/44354613246), [gói web](https://github.com/infiniti-money/Web-Design/actions/runs/44355804753), [bộ cài PC](https://github.com/infiniti-money/Web-Design/actions/runs/44355756364): thành công.

## Kiểm tra

- Node: 179 tests,178 pass,1 bài kiểm thử lead thật được bỏ qua chủ động. Electron renderer chạy thật: sandbox/context isolation, phiên thử mã hóa, allowlist, cập nhật, PDF báo giá và route chat đóng gói.
- Chat fixture Admin/Manager/Employee trên local và đúng bản Pages: mất acknowledgment giữ tin để retry cùng ID không trùng; XSS được hiển thị như văn bản; archive, tawk operator link, mobile không tràn ngang, signout xóa tin và bản nháp. Không gửi tin production.
- SQL fixture: membership, owner-only group update, inactive/mismatched roles, anonymous/deleted/expired sessions, denied direct writes, unread/read markers và cursor trùng timestamp. Migration thử trên bản phục hồi và kiểm tra metadata production; GET anon chat_bootstrap/chat_messages trả HTTP401, SQLSTATE42501. File migration khớp SQL lịch sử sau chuẩn hóa whitespace (MD5 5ff6cc184f2f9f5481008d62227ce0ce).
- Public: 11 route/4 độ rộng 320/390/1024/1440; font tiếng Việt, menu bàn phím, hover tiêu đề bài làm zoom cover, native touch scroll, reduced-motion/no-JS, bảo toàn URL/title/description/canonical/ảnh. Ảnh nền minh họa tải được trong lần xem trực tiếp; không tạo công trình/ảnh chưa xác minh.
- Lighthouse mobile trang chủ (một lần đo lab): Performance87,Accessibility100,Best Practices100,SEO100; LCP2225.997ms,CLS0. Không phải dữ liệu CWV thực địa hoặc cam kết mọi lần tải dưới3s.

## Đối chiếu gói tải

- Source ZIP: SHA256 ed1948e39fb982138aef21e82cc02119b245dda31745cea920c66ef770500f34; tệp tải khớp digest GitHub, chứa chat/migration, không có env bí mật.
- Setup1.3.0: 121791485 bytes; SHA256 3c8d869a58aba13bfdd401071c1af8b0a7cb75e1f86e3ddf696d88e4479ee043; SHA512 aycRw4e2yAcN+w9l49qTeosmkZ7NtDS4B/efhdlfJybqN8Pr6c9WHVIj89bhEVdUi5Xff+8tN4Ml9zY6uHibWw==. Metadata stable/latest.yml trả version1.3.0 và SHA512 khớp gói phiên bản.

## Nghiệm thu còn lại

Hai tài khoản thật gửi/nhận và thu hồi quyền; quyền agent/tin nhắn khách thật ở tawk.to; cài đè PC với phiên hiện có, thiết bị di động vật lý. Setup phát hành chưa có chữ ký Authenticode. Không đánh dấu hoàn thành chặng5 hay khôi phục toàn bộ dịch vụ từ fixture. Backup database mới: [bằng chứng phục hồi](BACKUP_RESTORE_EVIDENCE_20261118.md). [Vận hành chat](CHAT_RUNBOOK.md).

Đã tải và băm cả binary thực tế tại desktop-stable: 121791485 bytes, SHA512 khớp feed và bản phiên bản; Windows Get-AuthenticodeSignature xác nhận NotSigned.
