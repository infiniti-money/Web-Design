# Sao lưu thủ công và thử phục hồi database — 08/11/2026

Đã đăng nhập Supabase CLI bằng luồng trình duyệt của chủ sở hữu. Gói Supabase Free đã xuất logical backup thành công, không nâng gói và không cần mật khẩu database trong chat.

## Bản sao độc lập với dịch vụ

- Nguồn: project `mswiegltusllzvuavjdh`, PostgreSQL 17.11; mã nguồn lúc thực hiện `8b0cf35bd7c15c34386de0506cede8c13820d80b`.
- Lưu tại máy chủ sở hữu: `C:\AtelierPrivateBackups\2026-11-08-002336`, ngoài Git/OneDrive; thư mục đã bỏ kế thừa ACL và cấp quyền cho tài khoản thực hiện cùng SYSTEM.
- Đã xuất roles, schema, data COPY, migration schema/data, schema Auth/Storage tham chiếu và lịch sử migration Auth/Storage bổ sung. Có danh sách kích thước, SHA-256 và kiểm kê số dòng nguồn/đích. Không đưa dump hoặc dữ liệu khách hàng vào GitHub.
- CLI dump mặc định bỏ dữ liệu migration nội bộ Auth/Storage; bản bổ sung giữ 82 phiên bản Auth và 80 phiên bản Storage để tránh chỉ sao chép cấu trúc mà mất lịch sử quản lý schema.
- Storage tại thời điểm kiểm tra: 0 bucket, 0 object; không có file Storage cần tải trong lần này. Vault có 0 secret. Không đọc hoặc xuất khóa payOS/Edge secrets.

## Kiểm tra phục hồi thực tế

Dùng image Supabase PostgreSQL `17.11.0.011`, network Docker riêng có `internal=true`, không publish port, PostgreSQL không lắng nghe TCP và `cron.launch_active_jobs=off`. Không triển khai Edge Function, SMTP hoặc webhook trên đích thử. Container cuối `atelier-restore-20261108-002336-v2` đã dừng sau kiểm tra.

Đã phục hồi trong transaction dừng khi lỗi từ các file độc lập. Image mới có skeleton Auth cũ, vì vậy bước thử đầu bị lỗi thiếu cột và rollback; chỉ trên đích thử trống đã thay schema Auth/Storage skeleton bằng schema tham chiếu từ backup rồi phục hồi lại thành công. Không áp dụng thao tác thay schema này lên production hoặc môi trường có dữ liệu cần giữ.

Kết quả:

- 59/59 bảng thuộc public, private, auth, storage và supabase_migrations có số dòng khớp kiểm kê nguồn.
- Có 2 Auth users, 3 identities, 2 staff profiles, 6 projects, 1 báo giá và 1 phiên bản báo giá. Đây là kiểm tra dữ liệu, không phải thử đăng nhập bằng tài khoản thật.
- Hash nội dung toàn bộ hàng của customer_quotes, customer_quote_versions và projects khớp nguồn.
- Thử cả migration quote-history guard và SQL ledger payOS trên database phục hồi: tạo đối tượng thành công; UPDATE/DELETE phiên bản báo giá bị chặn; ledger bật RLS, browser/anon không có quyền ghi trực tiếp hay gọi RPC ghi sổ, service_role có quyền RPC theo thiết kế. Toàn bộ lần thử migration đã ROLLBACK, giữ bản phục hồi làm đối chứng.
- Không tạo payment link, gọi merchant, gửi email/chat hoặc chuyển tiền thật.

## Giới hạn và bước tiếp theo

Đạt bước **sao lưu và khôi phục ở mức database**. Chưa nghiệm thu toàn bộ website/Auth service: đích hiện chỉ có PostgreSQL, chưa có ứng dụng/Auth/Storage service để kiểm thử đăng nhập qua trình duyệt. Kiểm tra grants/trigger không thay thế toàn bộ UAT theo vai trò và nghiệp vụ. Chưa kiểm thử đồng thời luồng đặt cọc.

Các file được xuất tuần tự, không dùng chung một snapshot xuyên mọi lần dump; chưa cam kết mốc phục hồi nguyên tử cho toàn hệ thống. Ba nhóm dữ liệu đã so hash khớp, nhưng chưa băm toàn bộ bảng. Không sao chép nội dung secret, khóa mã hóa hay cấu hình dịch vụ từ Dashboard. Bản sao hiện nằm trên máy này; chưa có bản mã hóa trên thiết bị khác và chưa thử giải mã từ thiết bị khác.

Trước production migration cần bản sao mới gần thời điểm thay đổi, xem lại tính nhất quán và kế hoạch xử lý sự cố. Trước mở thu tiền vẫn cần giao diện tạo/đối soát, xử lý unknown/review, webhook merchant, chính sách lưu dữ liệu tài chính và UAT. Kết quả này không tự bật release switch hoặc thanh toán.

[Hướng dẫn sao lưu và phục hồi](SUPABASE_BACKUP_RESTORE_GUIDE.md) · [Trạng thái backend payOS](PAYOS_BACKEND_STAGING.md).
