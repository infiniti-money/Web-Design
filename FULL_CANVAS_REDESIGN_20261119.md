# Rà soát và thay thế hệ khung — 19/11/2026

## Thiết kế

Một canvas ảnh minh họa cố định phủ viewport cho website công khai; các section không còn dải nền đặc chia cắt. Nội dung nằm trên kính sáng màu ngà/xanh, viền phản sáng, bo góc20–26px, bóng nhẹ. Khung tư vấn và lợi thế dùng kính rừng tối để chữ trắng đủ rõ. Header/menu/footer, nút và trường nhập theo cùng vật liệu. Ảnh gốc và hình nền minh họa được giữ đúng ý nghĩa; không tạo hồ sơ công trình hoặc chứng thực mới.

| Phạm vi | Các khung đã rà soát/thay thế |
| --- | --- |
| Trang chủ | Giới thiệu, stats, công trình tiêu biểu/danh sách, dịch vụ, sáu bước, lợi thế, dự toán, ý tưởng, lời dẫn, tư vấn, footer |
| Dịch vụ/công trình | Hero full ảnh, khung nội dung, cards, thông số, trạng thái chưa có dữ liệu, FAQ, CTA |
| Kiến thức | Listing, bộ lọc, pagination, bài chi tiết, mục lục, bảng/code, bài liên quan |
| Catalog | Listing động/tĩnh, card, bộ lọc, sách mẫu, popup, ghi chú, link chia sẻ và chi tiết |
| Tài khoản/tiện ích | Đăng ký, hoàn thiện hồ sơ, yêu cầu khôi phục, đặt mật khẩu, trả về thanh toán,404; nền kiến trúc cục bộ |
| Quản trị/PC | Dashboard/CMS/Catalog, bảng dữ liệu, vận hành, công trình, báo cáo, nghiệm thu, thanh toán, thông báo, chat, popup, sáng/tối |

Trạng thái cảnh báo, lỗi, đã chọn, badge nghiệp vụ và hình ảnh so sánh giữ chức năng/màu có ý nghĩa. Không đổi vị trí dữ liệu hoặc quyền qua CSS.

## Hiệu suất và truy cập

Nền fixed bằng CSS, không dùng background-attachment:fixed hoặc vòng xử lý JavaScript theo scroll; reuse ảnh đã có. Blur giảm14→8px trên mobile, hạn chế blur lồng trong card. prefers-reduced-transparency tắt blur và dùng nền rõ; backdrop-filter không hỗ trợ có fallback; giữ prefers-reduced-motion. Có bản in nền trắng.

## Kiểm chứng

-179 Node tests:178pass,1 kiểm thử lead thật bỏ qua chủ động. Bảo toàn title/meta/canonical/URL, ảnh, anchor và liên kết cũ.
- Full-canvas browser:18 trang công khai/tài khoản x4 độ rộng320/390/1024/1440, scroll nhiều vị trí, canvas viewport, lớp nền section, kính khung/biểu mẫu/bộ lọc, no-JS và reduced-transparency; không ghi API.
- Public shell/experience/image motion: font tiếng Việt, header/CTA, menu bàn phím, touch rails, zoom hover, motion fallback. Chat và workspace3vai trò fixture đã qua; dự toán/so sánh giữ tương tác. Electron thật nạp UI, sandbox/phiên mã hóa/allowlist/PDF/route chat đã qua.
- Catalog no-JS chuyển sang context độc lập mỗi viewport để tránh native View Transition bị hủy do resize ngay giữa navigation; giữ mọi assertion.

Nguồn chuẩn bị web1.31.0 và PC1.3.1. Bằng chứng CI/release/deployed/checksum sẽ bổ sung sau khi phát hành. Không đổi schema/RLS, Auth, API, bí mật, bảng giá, nội dung hoặc dữ liệu production. UAT tài khoản thật, thiết bị vật lý và đo CWV thực địa vẫn cần nghiệm thu riêng.
