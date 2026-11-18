# Giao diện công khai v1.29 — 18/11/2026

## Phạm vi

Trang chủ, bốn trang dịch vụ, danh sách/chi tiết công trình, Catalog tương tác và HTML tĩnh, kiến thức/danh sách/bài viết theo slug, bài viết động cũ và quyền riêng tư. Giữ GitHub Pages và thương hiệu ATELIER HOME. Hình thức lấy cảm hứng từ https://www.ezviz.com/vn; không tải hoặc sao chép ảnh/logo/script của EZVIZ. Không chuyển framework hoặc thay hosting.

Hai tài nguyên public-experience.css/js dùng chung qua helper public-shell và các trang nguồn. CSS/JS có version URL 1.29.0. Trình sinh HTML tự động áp dụng cùng giao diện khi CMS/Catalog có dữ liệu công khai mới. Không sửa nội dung công trình hoặc thay điều kiện xác minh ảnh.

## Thiết kế và tương tác

Hero trang chủ giữ gallery toàn màn hình có điều khiển từ v1.28.3, dùng ảnh cũ, thẻ khám phá bốn nhu cầu, nút tư vấn/dự toán/trợ lý, nội dung bố trí thành từng phần rõ ràng. Bốn trang dịch vụ dùng ảnh Unsplash đã có trên trang chủ, bổ sung srcset 480/900, sizes, kích thước và nhãn minh họa; không mô tả là công trình bàn giao. Header/menu, hero, thẻ, CTA, form và bài viết dùng cùng hệ thống bo góc, màu, khoảng cách và phông local.

Mobile dùng overflow/scroll-snap gốc cho dịch vụ, ý tưởng và cảm hứng; không chiếm quyền cuộn dọc. Nút trước/sau min 46px, có nhãn/aria-controls và trạng thái đầu/cuối. Dải cuộn nhận focus bàn phím khi tràn. Menu details vẫn hoạt động khi không có JS; JS bổ sung Escape/nhấp ngoài và trả focus về nút mở.

Hiệu ứng opacity/transform chỉ gắn vào khối ngoài màn hình sau khi IntersectionObserver tồn tại. Khối đầu trang không bị giấu; reduced motion tắt animation và dọn trạng thái đang chờ, focus và pageshow BFCache khôi phục nội dung. Không thêm thư viện animation, handler wheel/touchmove, router hoặc video tự tải. Giữ bản sửa font và native navigation v1.28.1.

## Kiểm thử cục bộ

- Node: kiểm tra lại toàn bộ sau khi hợp nhất main v1.28.6; kết quả cuối ghi tại phần triển khai. Desktop security 2 đạt.
- public-shell-browser: tám route × 1440/1024/390/320; glyph tiếng Việt thực tế, header, CTA, menu bàn phím, no-JS/font lỗi, không tràn.
- public-experience-browser: 11 route × bốn kích thước; menu Escape/nhấp ngoài/focus, rail và nút cuộn/bàn phím, chuyển reduced-motion lúc đang mở, no-JS/font lỗi/script lỗi, không tràn, không request ghi/video.
- navigation-browser: ảnh hero bị giữ tải, phông không chờ ảnh, nhấp năm mục, reduced motion, Back/Forward.
- turnkey-browser: form chuẩn bị dự toán và chuyển nhu cầu sang form giữ nguyên/deduplicate; slider so sánh bàn phím/no-JS ở fixture; không gửi thông tin hay tự tải video.
- Kiểm tra ảnh chụp thực tế bằng Edge tại desktop/mobile: home, dịch vụ, kiến thức, Catalog; ảnh tại screenshots/experience-*.png (local, ignored). Đã sửa lỗi pseudo-element của hero Catalog gây tràn màn hình và kiểm tra lại đạt.
- Kiểm tra bảo toàn yêu cầu title/meta/canonical chính xác và mọi ảnh/link/ID cũ còn nguyên. Cho phép bổ sung ảnh minh họa dịch vụ và liên kết mới; không cập nhật baseline để xóa tài sản cũ.

## Giới hạn

Ảnh công trình thật/video, bảng giá đã duyệt, thông tin pháp lý và UAT tài khoản vẫn theo điều kiện nghiệm thu trước. Không thêm lời chứng thực, số công trình, tiết kiệm 20%, độ chính xác 99% hoặc cam kết mới. Hiệu năng lab và CI bản Pages ghi bổ sung sau triển khai; không suy ra CWV người dùng thật hoặc bảo đảm mọi máy luôn dưới 3 giây. Không có bộ cài PC mới.

## Hợp nhất cập nhật main

Đã rebase lên aa07fa9 (web 1.28.6 / PC 1.2.2), giữ toàn bộ cải tiến Admin/UAT/RLS/reports và auto-release của main. Xử lý xung đột homepage theo hướng giữ gallery fullscreen và điều khiển/pause/reduced-motion; chỉ thêm giao diện/khám phá mới. Không sửa các migration hoặc triển khai backend. Kiểm thử gallery cũ bổ sung vào nghiệm thu bản hợp nhất.

Sau hợp nhất: 175 kiểm thử Node, 174 đạt/1 lead thật chủ động bỏ qua; desktop security 2 đạt. Hero gallery kiểm tra ở 320/390/768/1024/1440/1920, đổi ảnh bằng tay/bàn phím, pause, reduced motion và no-JS đều đạt trên Edge. Bộ public-experience và navigation kiểm tra lại đạt. Giữ auto-promote website của main để chỉ phát hành sau Validate thành công.
