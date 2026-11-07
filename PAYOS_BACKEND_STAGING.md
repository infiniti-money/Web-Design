# Backend đặt cọc payOS — chế độ chuẩn bị

## Kết quả triển khai đã xác minh — cập nhật 08/11/2026

Mã nguồn `e33056526b9537a6bdb4a1c520921cd93e330a4f` đã lên main. Hai Edge Function `payos-deposits` và `payos-webhook` ACTIVE phiên bản 1. GET `/payos-deposits/health` trả HTTP 200, `credentialsPresent:true`, `paymentsEnabled:false`; chỉ xác nhận hiện diện secret, chưa gọi merchant. POST cả hai endpoint trả HTTP 503 `PAYMENTS_DISABLED`. Không tạo link hoặc chuyển tiền thật.

[Validate](https://github.com/infiniti-money/Web-Design/actions/runs/42393607537), [SQL/SDK cách ly](https://github.com/infiniti-money/Web-Design/actions/runs/42393607574), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42393607420) và [browser smoke sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42393646182) đều thành công. Kiểm tra production sau triển khai: ledger chưa tồn tại, 1 báo giá, 1 phiên bản báo giá, 0 quote-history guard; không áp dụng SQL staging.

Chủ website xác nhận chưa có backup độc lập và thử restore. Thực hiện [hướng dẫn sao lưu/khôi phục cách ly](SUPABASE_BACKUP_RESTORE_GUIDE.md) trước khi áp dụng migration lên dữ liệu thật. Kiểm thử SQL tổng hợp trong CI không thay thế điều kiện này.

Chủ website xác nhận đã lưu PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY vào Edge Function secrets. Không yêu cầu gửi lại giá trị. Dùng SDK chính thức `@payos/node@2.0.5`, tắt log và retry tạo link; không tự gọi API merchant trong kiểm thử.

## Phạm vi đợt này

- `payos-deposits`: GET `/health` chỉ trả cờ đủ ba secret và cờ mở thu tiền; không trả giá trị/tên ngân hàng hoặc xác nhận credentials hợp lệ. POST dự kiến tạo đặt cọc, chỉ cho Admin được Auth xác thực lại và hồ sơ còn active; database kiểm tra vai trò live lần nữa.
- `payos-webhook`: body xác thực bằng SDK payOS trước khi xử lý; không dùng JWT trình duyệt vì callback từ nhà cung cấp. Không tin return URL làm bằng chứng thanh toán.
- Cả hai POST có công tắc phát hành mặc định tắt trong mã (`releaseEnabled:false`), ngoài hai cờ server PAYOS_PAYMENTS_ENABLED/PAYOS_LEDGER_READY. Chưa bật các cờ hoặc tự tạo payment link thật.
- File `supabase/payos-deposits-staging.sql` được CLI tạo rồi giữ **ngoài thư mục migrations**, chỉ thử trong Postgres cách ly. Không áp dụng vào database thật trong đợt này.

## Quy tắc sổ thu

Reservation gắn Admin, báo giá accepted và đúng approved_version_id, snapshot version/total/hash nội dung. Tiền VND nguyên trong giới hạn số an toàn; khóa quote trước khi kiểm tra số dư và một link đang xử lý. Idempotency key chỉ được dùng lại với cùng tác nhân, báo giá và số tiền. Link chỉ chấp nhận HTTPS `pay.payos.vn`, khớp orderCode/amount/currency/ID từ SDK. Timeout giữ reservation unknown, chặn tạo mới; không tự retry vì nhà cung cấp có thể đã tạo link.

RPC ghi sổ chỉ service_role được EXECUTE; browser/anon không có quyền ghi. Admin live được đọc theo RLS, Manager/nhân viên không thấy sổ. Không copy raw webhook hay thông tin tài khoản ngân hàng/khách hàng vào ledger. Receipt duy nhất theo orderCode/reference; replay đúng không tạo bản ghi mới, replay đổi tiền/currency/link bị từ chối.

Chỉ khi reference mới, đúng link đã biết, đúng số tiền và VND mới đánh dấu paid. Thiếu/thừa tiền, sai link/currency, webhook đến trước lúc gắn link hoặc trạng thái review đều lưu để đối soát. Callback ký đúng nhưng không tìm thấy đơn được lưu unmatched (cũng có thể là dữ liệu xác minh webhook của nhà cung cấp), không tạo khoản đã thu. Không tự thay trạng thái hợp đồng, hoàn tiền hoặc xóa giao dịch.

Snapshot/hash và receipt là bằng chứng kỹ thuật, không tự trở thành hóa đơn hoặc biên nhận pháp lý. Không lưu FK từ ledger sang hồ sơ CRM để cron xóa hồ sơ tư vấn không bị chặn; cần chính sách giữ dữ liệu tài chính riêng trước khi mở thật.

## Kiểm chứng và điều kiện mở thật

Đã chạy 10 bài core/HTTP: disabled không gọi SDK/Auth/DB, sai quyền/số tiền/ID bị chặn, reservation từ máy chủ quyết định amount, replay không tạo link lần hai, timeout/URL hoặc amount sai phải đối soát, chữ ký sai không ghi, chỉ persist trường cho phép, health không lộ key, origin/body giới hạn. Node toàn repo 108 bài: 107 đạt, 1 bài gửi lead thật bỏ qua.

SDK 2.0.5 thật với key giả và fetch bị chặn: vector HMAC độc lập, sửa amount hoặc thiếu signature bị từ chối, request tạo link có chữ ký đúng và response mock được SDK kiểm chữ ký. Không dùng key merchant ở máy local hoặc CI. CI `payos-staging.yml` kiểm tra SQL/RLS và SDK trên Postgres 17 có dữ liệu tổng hợp.

Kiểm tra chỉ đọc trên production thấy 1 báo giá và **0 trigger quote-history guard** tại thời điểm khảo sát. Không áp dụng guard/ledger khi chưa có bằng chứng backup production và restore cách ly (Auth/Storage có phương án riêng). Advisor hiện có vẫn gồm [private table RLS không policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [RPC SECURITY DEFINER cho authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) và [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); đợt này không thay chúng.

Còn phải hoàn thiện trước thu tiền: backup/restore độc lập, áp dụng/test guard và ledger ở staging rồi production được kiểm soát; chính sách tài chính/giữ dữ liệu; UI Admin tạo và đối soát/giải quyết unknown-review-unmatched, hủy/hoàn tiền có nhật ký; thử song song/khôi phục lỗi; UAT Admin thật với báo giá được chấp nhận. Sau đó mới phát hành bật release switch và cờ runtime, đăng ký webhook chính thức, thử giao dịch thật do chủ website cho phép và xác nhận ngân hàng nhận tiền.

payOS không có sandbox riêng: [tài liệu chính thức](https://payos.vn/docs/moi-truong-test/). Vì vậy không tự tạo/chuyển tiền để thử khi chưa hoàn thành các cổng trên. Trang `payment-return.html` chỉ nhắc chờ đối soát, noindex và không đọc query để báo thành công.

Nguồn SDK/API: [SDK chính thức](https://github.com/payOSHQ/payos-lib-node), [API payOS](https://payos.vn/docs/api/). Có đủ secret chỉ là kiểm tra hiện diện, không chứng minh kênh merchant/ngân hàng được duyệt.
