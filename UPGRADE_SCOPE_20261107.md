# Nâng cấp website, quản trị và PC — 07/11/2026

Phạm vi chủ website chọn: cả website và quản trị/PC; thanh toán nhận đặt cọc công trình/báo giá; chat trực tiếp qua nhà cung cấp riêng. Chưa có tài khoản dịch vụ, ngân sách và ngày vận hành. Giữ GitHub Pages, ATELIER HOME, Supabase, URL, Title/Description và ảnh hiện có.

## Hiện trạng và thứ tự xử lý

- Nền hiện có: CRM/nhân sự, CMS và phê duyệt, báo giá, công trình, Catalog; PC 1.1.2 có feed cập nhật. Tận dụng các module này, không thay database hoặc xây CRM thứ hai.
- Số đo lịch sử v1.20: Lighthouse mobile 93 Performance, LCP 3,0 giây, FCP 1,7 giây. Đây không phải số đo hiện tại. Xem PERFORMANCE_BASELINE.md; cần đo lại ba lần trên cùng điều kiện và kiểm tra tài nguyên ngoài trước khi kết luận.
- Nội dung công trình thật/quyền ảnh, Search Console, UAT tài khoản thật, backup/restore độc lập và chứng thư ký Windows vẫn còn mở. Không hứa giữ hạng Google chỉ từ giữ URL và metadata.
- Rủi ro chính khi thêm dịch vụ: widget chat làm chậm LCP; webhook giả/trùng hoặc lệch số tiền; lộ hồ sơ khách/báo giá qua URL; CSP chặn SDK/Turnstile; ghi đè lịch sử báo giá. Chưa bật thanh toán/chat trước khi có môi trường thử và đối soát.

## Phân kỳ và dự toán công sức

Ước lượng ngày công kỹ thuật, chưa phải lịch cam kết hoặc báo giá tiền; không gồm thời gian chờ doanh nghiệp/nhà cung cấp. Các phần có thể làm song song sau khi chốt thiết kế.

| Phần | Bàn giao và điều kiện đạt | Ngày công dự kiến |
| --- | --- | --- |
| UI website + quản trị/PC | Thiết kế responsive, điều hướng, CTA, form, bảng/chi tiết, bàn phím, ảnh chụp các cỡ màn hình; không sửa dữ liệu SEO cũ | 4–6 |
| Hiệu suất | Đo ba lượt mobile trước/sau, phân tích LCP/TBT/CLS, tối ưu đường tải; mục tiêu LCP trung vị dưới 3 giây trong cấu hình đo ghi rõ | 2–3 |
| Bảo toàn SEO | Snapshot URL/Title/Description/canonical/ảnh/anchor; kiểm tra sitemap, schema, internal link và noindex admin; đối chiếu HTML sinh từ CMS | 1–2 |
| Đặt cọc | Payment intent gắn quote version, link thanh toán, webhook có chữ ký/idempotency, ledger và đối soát; sandbox đạt rồi mới mở thật | 4–6 |
| Chat nhân viên | Widget theo yêu cầu người dùng, lịch trực/offline, phân quyền agent và thông báo quyền riêng tư; bàn giao tài khoản cho chủ website | 1–2 |
| Kiểm thử/bàn giao | Browser/mobile, role thật có ủy quyền, diễn tập phục hồi cách ly, phát hành từng đợt, PC/feed và hướng dẫn vận hành | 2–3 |

Tổng sơ bộ 14–22 ngày công; điều chỉnh sau khảo sát thiết kế và thử API của nhà cung cấp. Công lập trình = ngày công được chốt × đơn giá hợp đồng; phiên này không có đơn giá/hợp đồng nên chưa thể ghi tổng tiền VND có căn cứ. Phí dịch vụ, giao dịch, hạ tầng và ký mã tách riêng. Không mua gói hoặc tạo khoản thu khi chưa được chủ website chọn.

## Phương án dịch vụ cần lựa chọn

Đối chiếu nguồn chính thức ngày 07/11/2026; điều kiện hợp đồng thực tế mới là căn cứ thu phí.

| Nhu cầu | Phương án | Phạm vi và chi phí cần làm rõ |
| --- | --- | --- |
| Đặt cọc chuyển khoản/QR | payOS | Có luồng link thanh toán và webhook; cần xác minh tài khoản và kênh thanh toán. Xác nhận ngân hàng, điều kiện và biểu phí áp dụng trực tiếp trước khi chọn. Không tự kết luận mọi phương thức đều miễn phí. |
| Cổng có thêm phương thức | VNPAY | Xác nhận phương thức được mở trong hợp đồng, hồ sơ merchant và mức phí theo kênh. Trang biểu phí chung nêu miễn phí hoặc thu đến 2,5%; không dùng mức tối đa này như báo giá merchant đã được duyệt. |
| Chat trực tiếp tiết kiệm | tawk.to | Dịch vụ chat cốt lõi được giới thiệu miễn phí; các dịch vụ bổ sung có thể thu phí. Doanh nghiệp vẫn cần nhân viên trực và lịch phản hồi. |
| Hộp thư hỗ trợ theo workspace | Crisp | Trang giá có Free và Mini 45 USD/workspace/tháng; kiểm tra giới hạn agent/profile, tính năng và thuế trước khi chọn. Chưa cần mua gói AI. |

Nguồn: [payOS webhook](https://payos.vn/docs/du-lieu-tra-ve/webhook/), [luồng payOS](https://payos.vn/docs/), [VNPAY biểu phí](https://vnpay.vn/bieu-phi-dich-vu-0f61zmr3hwgs), [tawk.to](https://www.tawk.to/why-free/), [Crisp giá](https://crisp.chat/en/pricing/).

Đề xuất kỹ thuật ban đầu: thử payOS nếu đặt cọc chủ yếu qua ngân hàng/QR và tawk.to cho chat người thật; đánh giá VNPAY khi cần thêm phương thức, Crisp khi cần tổ chức hộp thư sâu hơn. Đây là đề xuất, chưa phải lựa chọn được chủ website phê duyệt.

## Thiết kế đặt cọc và chat

Admin tạo yêu cầu đặt cọc từ báo giá/phiên bản được phép → máy chủ lấy snapshot và số tiền VND, không tin tổng tiền từ trình duyệt → tạo payment intent gắn ID nội bộ và mã merchant → khách nhận URL token khó đoán, có hạn, không chứa tên/điện thoại → thanh toán tại nhà cung cấp. Return URL chỉ hiển thị đang kiểm tra; webhook được xác minh chữ ký, mã đơn, tiền, tiền tệ và giao dịch trước khi ghi ledger. Ràng buộc unique event/transaction, xử lý replay, hết hạn, thiếu/thừa tiền, nhiều đợt đặt cọc, hoàn tiền và đối soát thủ công có nhật ký. Không tự sửa trạng thái hợp đồng hay đánh dấu paid từ URL/click.

RLS: khách không đọc bảng CRM/ledger; Admin và người được giao quyền xem đúng phạm vi. Secrets chỉ phía máy chủ. Trước migration dữ liệu thật cần backup/restore cách ly và kiểm tra cổng quote-history còn mở. Không sao chép dữ liệu riêng vào repo hoặc CI.

Chat: tải widget khi khách mở, giữ kênh liên hệ hiện có khi nhà cung cấp lỗi; không che CTA/form trên mobile. Agent đăng nhập trên hệ thống nhà cung cấp; không tự chuyển toàn bộ CRM sang bên thứ ba. PC chỉ mở dashboard được chọn trong trình duyệt ngoài với allowlist hẹp, không mở quyền webview hoặc Node cho nội dung ngoài. Chốt lịch trực, thông báo offline và lưu giữ hội thoại trước khi mở công khai.

## Đợt nền tảng bắt đầu trong phiên này

- Snapshot các trang HTML công khai hiện có vào `tests/fixtures/public-preservation.json`; test ngăn đổi metadata, canonical, ảnh, link và anchor ngoài kế hoạch. CMS HTML sinh từ dữ liệu cần đối chiếu thêm ở bản dựng, không được coi snapshot nguồn là toàn bộ Search Console.
- CSS riêng cho trang chủ: phân cấp chữ/overlay, CTA dễ bấm, form rõ hơn, input mobile 16px, khoảng cách và menu/tablet. Giữ nguyên ảnh, nội dung, URL và handler tư vấn; không thêm SDK chat/thanh toán.
- Chưa có cam kết tải mọi trang dưới 3 giây, tăng conversion hay giữ thứ hạng. Đo hiệu suất và conversion thực tế là hạng mục có bằng chứng riêng; chưa cài analytics/tracker mới.

Kiểm chứng trước phát hành: 98 bài Node, 97 đạt, 1 bài gửi thật bỏ qua; home experience và consultation browser đạt trên preview (ghi form dùng fixture). Đã xem ảnh mobile và kiểm tra không tràn ngang. Đo online bản cũ ngày 07/11/2026 bằng Lighthouse mobile mặc định, một lượt: Performance 95, Accessibility/Best Practices/SEO 100; FCP 1,6 giây, LCP 2,8 giây, TBT 30 ms, CLS 0,001. Mẫu này chưa đủ để kết luận ổn định hoặc so sánh tăng tốc. JSON local: `dist/audits/upgrade-program-before.json`.

Hoàn thành toàn bộ chương trình khi UI được nghiệm thu trên web/PC, số đo trước/sau có điều kiện rõ, sandbox và giao dịch thật được chủ website cho phép đã đối soát, chat có người phụ trách, CI xanh, backup/UAT có bằng chứng và có phương án rollback. Hiện chưa đánh dấu toàn bộ chương trình hoàn tất.
