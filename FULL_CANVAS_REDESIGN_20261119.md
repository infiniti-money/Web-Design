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

Nguồn phát hành web1.31.0 và PC1.3.1: 0a819a550e5a5e25bb7041ce2b7aca568027c996. Cả hai tag trỏ đúng commit này. Không đổi schema/RLS, Auth, API, bí mật, bảng giá, nội dung hoặc dữ liệu production. UAT tài khoản thật, thiết bị vật lý và đo CWV thực địa vẫn cần nghiệm thu riêng.

## Bằng chứng phát hành

- [Validate](https://github.com/infiniti-money/Web-Design/actions/runs/44361002561): cả4 job xanh ở lần chạy đầu, gồm full-canvas browser và đóng gói Windows.
- [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/44361002508), [deployed browser](https://github.com/infiniti-money/Web-Design/actions/runs/44361105447), [SEO/Lighthouse](https://github.com/infiniti-money/Web-Design/actions/runs/44361105123) thành công. release.json và live visual xác nhận đúng revision,18 route x4 độ rộng đã qua trên Pages, không ghi API.
- Source ZIP tải thật khớp SHA2561b77e919a9731790da401df3edcf0acdcc50e6bbc910fff9f3a1a763ef934e57;1155735 bytes.
- Lighthouse mobile lần cuối: Performance93,Accessibility100,Best Practices100,SEO100;LCP3070.976ms,CLS0. Lần đo trước LCP2924.711ms. Đây là phép đo lab có dao động; không khẳng định mọi lượt tải dưới3giây hoặc đã đạt CWV thực địa. Nhãn điều hướng nhỏ được tăng tương phản để khắc phục finding4.19:1.

Bản PC1.3.1 đã build/publish thành công qua workflow44361792283. Bố cục tiếp tục được thu gọn và bổ sung hiệu ứng hai phía ở1.32: xem DESIGNER_LAYOUT_20261119.md.
