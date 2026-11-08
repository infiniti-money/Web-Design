# Mở thu đặt cọc chính thức — 08/11/2026

**Đã mở thu đại trà theo yêu cầu chủ website.** Health production đã xác minh `paymentsEnabled:true`, `pilotOnly:false`; private policy có enabled=true và general_availability=true. Không còn giới hạn một báo giá, một yêu cầu hoặc số tiền cố định 10.000 VND của đợt pilot.

## Cách sử dụng

Đăng nhập Admin rồi mở [Thu tiền & đối soát](https://infiniti-money.github.io/Web-Design/payments.html), tải lại trang để lấy giao diện mới. Chọn báo giá đã được khách chấp nhận, nhập số tiền VND nguyên dương trong phần còn có thể yêu cầu, tạo link payOS rồi gửi link cho khách bằng kênh của doanh nghiệp.

Màn hình hiển thị tổng được duyệt và số tiền còn có thể tạo yêu cầu, tính cả khoản đã thu cùng reservation chưa hủy. Báo giá đã hết số dư không xuất hiện để tạo thêm. Khi có yêu cầu đang xử lý, cần đối soát yêu cầu đó trước. Sau một khoản đã paid, có thể tạo đợt tiếp theo nếu còn số dư. Khoản pilot đã thu được giữ nguyên và tiếp tục được tính vào tổng, không đặt lại lịch sử.

Admin là người tạo link và xử lý sổ thu; khách thanh toán trên link payOS. Không mở API tạo khoản thu cho người chưa đăng nhập hoặc nhân viên không có quyền. Các tình huống unknown/review/unmatched tiếp tục xử lý theo [hướng dẫn đối soát](PAYOS_RECONCILIATION_ADMIN.md).

## Các kiểm soát còn giữ

- Auth Admin được xác thực lại, staff profile phải active và khớp vai trò; database kiểm tra live role một lần nữa sau khi có khóa báo giá.
- Báo giá phải accepted, có đúng phiên bản được duyệt; tổng yêu cầu không vượt giá trị phiên bản trừ các khoản đã giữ/đã thu. Một yêu cầu chưa xử lý chặn tạo yêu cầu tiếp theo cho cùng báo giá.
- Request key được khóa trước khi kiểm tra nhằm chống tạo trùng, kể cả dùng cùng key cho hai báo giá khác nhau. Webhook, truy vấn đối soát và tạo yêu cầu cùng dùng thứ tự khóa quote → intent để hạn chế tranh chấp số dư.
- SDK kiểm chữ ký callback và response provider, callback replay không ghi thu lần hai. Không tin return URL làm bằng chứng đã nhận tiền. Timeout không tự tạo lại link hoặc giải phóng reservation.
- RLS và nhật ký bất biến giữ nguyên. Việc mở chế độ không tạo payment link thử, chuyển khoản, gửi thông báo hay hoàn tiền tự động.

## Bằng chứng phát hành

- Mã tài chính `0d02be2633afa77740739ba75973112519a7b011`; bản website sau sửa kiểm thử menu CMS `0706a8adbce5e9f69bd16795b6c70122e1372079`, đã đối chiếu release.json.
- [CI SQL/SDK/HTTP và general collection](https://github.com/infiniti-money/Web-Design/actions/runs/42401819749) đạt, gồm 18 nhóm HTTP/PostgreSQL/SDK và ca giữ pilot, nhiều báo giá, nhiều đợt, số dư, hủy, replay và dừng tạo mới.
- [Validate](https://github.com/infiniti-money/Web-Design/actions/runs/42401990194), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42423171470) và [smoke bản đang chạy](https://github.com/infiniti-money/Web-Design/actions/runs/42423219691) đều thành công. Lần Validate trước bị lỗi thời điểm xử lý breakpoint trong bài kiểm tra bàn phím CMS; đã chờ hai animation frame sau đổi viewport, giữ nguyên kiểm tra inert/menu và chạy lại đạt.
- Node toàn repo: 118 bài, 117 đạt, 1 bỏ qua có chủ đích vì gửi lead thật; 2 bài route/protocol PC đạt. UI fixture đạt trên desktop/mobile, gồm nhập số tiền khác pilot và cập nhật phần còn lại sau tạo.
- Backup mới ngoài repository tại `C:\AtelierPrivateBackups\2026-11-08-pre-general-012226`; đã phục hồi ở PostgreSQL cách ly, network internal, không TCP port, cron tắt. Trên bản phục hồi đã thử migration mới và reservation trong phần còn lại, sau đó rollback. Không gọi merchant từ rehearsal.
- Migration production `20261107183121_payos_general_availability.sql` đã áp dụng; source khoản đã thu, receipt và lịch sử được giữ nguyên. Postflight không có yêu cầu/receipt thật mới do thao tác mở chế độ.
- Kiểm tra live sau bật: POST không có phiên đăng nhập vào payos-admin/payos-deposits vẫn HTTP 401 AUTH_REQUIRED; webhook thiếu chữ ký HTTP 403 INVALID_WEBHOOK_SIGNATURE. Advisor không thêm WARN so với trước: bốn RPC SECURITY DEFINER cũ, leaked-password protection cũ; hai INFO private table không có policy là mặc định từ chối.

Đây là mở nghiệp vụ trên website. Mã nguồn PC đã chuẩn bị route/UI và kiểm thử allowlist; bộ cài Windows đang phát hành vẫn 1.1.2, chưa tự nhận màn hình mới cho tới đợt phát hành PC tiếp theo. Không khẳng định đã kiểm thử cài/nâng cấp Windows hoặc mọi giao dịch ngân hàng tương lai trong đợt mở chế độ này.

## Tạm dừng tạo khoản thu mới

Người quản trị database có thể đặt enabled=false trên singleton của private.payos_pilot_policy. Giữ webhook hoạt động để nhận callback muộn và tiếp tục đối soát; không xóa hoặc hạ trạng thái các khoản đã paid. Không chỉ đổi biến môi trường về pilot rồi giả định database cũng đã trở về giới hạn cũ; phải kiểm tra cả policy và runtime nếu cần thay chế độ.
