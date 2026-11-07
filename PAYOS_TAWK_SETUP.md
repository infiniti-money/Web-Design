# payOS và tawk.to — lựa chọn đã chốt 07/11/2026

## Cập nhật 08/11/2026: backend đã triển khai, vẫn tắt thu tiền

Sau khi chủ website lưu ba secret, health của Edge Function xác nhận đủ giá trị cấu hình (`credentialsPresent:true`) và thanh toán đang tắt (`paymentsEnabled:false`). Hai endpoint đã triển khai phiên bản 1; POST trả 503 `PAYMENTS_DISABLED`. Chưa xác minh merchant/ngân hàng, đăng ký webhook hoặc tạo link thu tiền. Các đoạn “không có endpoint” bên dưới ghi lại đợt chuẩn bị trước.

Chi tiết và CI: [PAYOS_BACKEND_STAGING.md](PAYOS_BACKEND_STAGING.md). Chủ website chưa có backup/restore độc lập: [hướng dẫn thực hiện](SUPABASE_BACKUP_RESTORE_GUIDE.md). Chưa áp dụng migration guard/ledger lên production. Chat giữ cấu hình đã được chủ website xác nhận mở được; không tự gửi tin nhắn.

## Kích hoạt tawk.to từ mã chủ website cung cấp

Chủ website đã xác nhận “Khung chat mở được” khi kiểm tra bằng trình duyệt thường sau khi nhận ID. Đây là xác nhận mở giao diện thực tế từ chủ website; không phải kiểm thử gửi/nhận tin nhắn với agent. Lỗi 403 bên dưới là giới hạn quan sát trong môi trường trình duyệt tự động, không được dùng để khẳng định khách thông thường bị chặn.

Bản cấu hình cuối xác minh qua release.json: `abf6b11bee253ed22bc838eb9bf642f100f376ef`. [Validate](https://github.com/infiniti-money/Web-Design/actions/runs/42391198948), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42391199050) và [browser smoke sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42391254009) đều thành công. Không gửi tin nhắn, tự mời agent hoặc thay đổi lịch trực của tài khoản chủ website trong kiểm thử.

Kiểm tra thực tế: website đã lên revision `288b1cb4367f1c8b2fe2ad351263c21c1e2a2abd`. HTTP client nhận SDK 200/application/x-javascript và header CORS `*`; trình duyệt tự động nhận HTTP 403 không có header CORS (Cốc Cốc báo ORB, Edge báo CORS). Chưa xác định được lớp chặn ở nhà cung cấp/mạng hay thiết lập tài khoản, nên không kết luận widget hỏng hoặc agent đang online. Chưa mở thành công hội thoại thật và không gửi tin nhắn. Đã yêu cầu chủ website kiểm tra bằng trình duyệt thường.

Bổ sung `crossOrigin="anonymous"` cho script để tương ứng với hành vi thuộc tính crossorigin của mã nhúng được cung cấp. Kiểm thử SDK giả lập có header CORS trên Edge đạt: tắt/ID sai, tải theo click, một SDK, mở lại và thử lại khi lỗi. Fallback form/email tiếp tục dùng được; không vô hiệu hóa bảo vệ CORS/ORB của trình duyệt để báo kết quả đạt giả.

Chủ website đã cung cấp mã nhúng với Property ID `6aef0ec47c126a3c334ec009`, Widget ID `1k6qt3cal`. Đã cấu hình `enabled:true` trong bộ tải sẵn có, giữ tải SDK sau khi khách bấm nút trong mục Liên hệ. Không dán thêm mã nhúng tự chạy để tránh tải trùng. Bổ sung thông báo xử lý dữ liệu chat trong nội dung privacy.html, giữ nguyên Title/Description/canonical/ảnh và link cũ.

Kiểm thử Node trước triển khai: 98 bài, 97 đạt, 1 bài gửi thật bỏ qua. Các đoạn ghi “ID trống/enabled:false” bên dưới là bằng chứng của đợt chuẩn bị trước, không phải cấu hình kích hoạt mới. Chưa tự gửi tin nhắn cho nhân viên hoặc thay đổi tài khoản/lịch trực trong dashboard tawk.to. payOS vẫn chưa bật.

Chủ website chọn payOS cho đặt cọc chuyển khoản/QR và tawk.to cho chat nhân viên. Thay thế trạng thái “đang cân nhắc” trong UPGRADE_SCOPE_20261107.md. Chưa có merchant credentials hay Property/Widget ID được cung cấp trong phiên này; không giả lập trạng thái đang nhận tiền/chat thật.

## Chat: mã đã chuẩn bị, mặc định tắt

`assets/integration-config.js` chỉ chứa enabled và hai ID công khai. Khi có tài khoản tawk.to của chủ website: tạo Property, cấu hình tên website và widget, lấy Property ID/Widget ID từ mã embed trong dashboard; cung cấp hai ID công khai để cấu hình. Không gửi mật khẩu hoặc secret trong chat.

`assets/customer-chat.js` chỉ hiện nút khi enabled và ID hợp lệ. Chỉ tải SDK từ embed.tawk.to sau khi khách bấm nút; không tự gửi tên/email/điện thoại từ form hoặc CRM vào widget. Có timeout, chống bấm trùng, thử lại và nhắc dùng form/email khi lỗi. Thu nhỏ widget sẽ ẩn launcher của nhà cung cấp để tránh che CTA; nút trong mục liên hệ mở lại chat. Bật dịch vụ chỉ sau khi kiểm tra lịch trực/offline, mobile, thông báo quyền riêng tư và tài khoản agent do chủ website quản lý.

Đăng ký/đăng nhập: https://dashboard.tawk.to/ . Tham khảo [API chính thức](https://developer.tawk.to/jsapi/). Không tự tạo tài khoản hoặc mời nhân viên thay chủ website.

## payOS: chưa bật thu tiền

1. Chủ website tạo/xác minh tài khoản tại https://my.payos.vn và kênh thanh toán; đối chiếu tài khoản ngân hàng nhận tiền, phí và điều kiện dịch vụ.
2. Client ID, API key và checksum key phải lưu trong Supabase Edge Function secrets qua dashboard quản trị được ủy quyền, không vào app-config.js, repo, issue hoặc chat. Phiên này không ghi/đọc secret.
3. Trước migration ledger/payment intent: cần backup/restore cách ly, kiểm tra quyền và cổng lịch sử báo giá đang mở. Yêu cầu đặt cọc phải gắn đúng phiên bản báo giá, số tiền VND nguyên do máy chủ xác minh, tổng đã thu và số còn lại.
4. API tạo link theo [tài liệu payOS](https://payos.vn/docs/api/): máy chủ ký request, tạo mã đơn duy nhất, URL return/cancel cố định và link có hạn. Không chuyển khóa merchant vào PC/trình duyệt. Không tự gọi endpoint production hoặc tạo giao dịch có thể thu tiền chỉ để thử.
5. Webhook phải xác minh chữ ký theo hướng dẫn/SDK chính thức, unique transaction/event, kiểm tra đơn, amount và currency. Return URL không có quyền đánh dấu paid. Giao dịch trùng, lệch tiền, thiếu/thừa, hủy/hết hạn và hoàn tiền được đối soát theo ledger, không tự sửa hợp đồng.
6. Kiểm thử giả lập trước; xác nhận chế độ thử mà nhà cung cấp hỗ trợ, không mặc định rằng có sandbox riêng. Giao dịch thật chỉ sau khi chủ website cho phép, ngân hàng/merchant xác nhận và UAT/đối soát đạt.

Không có payment endpoint hoặc migration thanh toán được triển khai trong đợt chuẩn bị này. Không tạo nút nhận cọc giả hoặc báo đã thanh toán khi chưa có backend xác thực. Các phần giao diện quản trị/PC tiếp tục theo kế hoạch tổng thể; PC hiện hành vẫn 1.1.2.

## Kiểm chứng mã chuẩn bị

Trước triển khai: 98 bài Node, 97 đạt và 1 bài gửi dữ liệu thật bỏ qua. `tests/customer-chat-browser.cjs` đạt trên preview với SDK giả lập: tắt/ID sai không gọi nhà cung cấp, chỉ tải khi bấm, một SDK cho nhiều lần mở, lỗi tải cho phép thử lại. Không dùng tài khoản/agent thật. CI Validate chạy cùng ca trên preview cách ly. Test bảo toàn metadata/ảnh/URL hiện có tiếp tục đạt. Chưa đánh dấu chat merchant hoạt động thật hoặc thanh toán payOS đã được tích hợp backend.

Đã triển khai mã chuẩn bị tại revision `f754ee92f8a700ec184cb8edae08a8ecf8167fbd`, xác nhận `release.json`. [Validate](https://github.com/infiniti-money/Web-Design/actions/runs/42369050611), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42369050562) và [browser smoke sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42369086221) đều thành công. Chạy lại ca chat trực tiếp trên URL Pages với cấu hình/SDK giả lập cũng đạt; cấu hình phát hành thật vẫn `enabled:false`, ID trống. Không có thanh toán, hội thoại nhân viên thật hoặc thay đổi database trong đợt này.
