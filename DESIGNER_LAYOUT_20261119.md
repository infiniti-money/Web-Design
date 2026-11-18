# Thiết kế studio và chuyển động hai phía — 19/11/2026

Phản hồi chủ website: nền và khung phải cùng hệ màu; còn nhiều khoảng trống; cần bố cục chuyên nghiệp và ảnh/chữ chạy vào từ hai phía. Đây là thay đổi bố cục/chuyển động, ngoài đợt vật liệu nền1.31.

- Lưới1360px thay1240px, lề32px desktop/16px mobile. Khoảng cách giữa khung giới thiệu và công trình52px desktop/32px mobile, thay các section padding90–115px mỗi phía. Trong lần xem1440x1000, khung giới thiệu cao494.7px, nội dung và ảnh cùng hàng, không cắt nội dung.
- Ảnh intro280–420px, chữ/cấp tiêu đề/khung điều khiển cân lại. Quy trình3cột desktop,2cột mobile từ360px,1cột màn nhỏ hơn; khung tư vấn, dự toán, dịch vụ và nội dung chờ dữ liệu thu gọn. Không dùng nội dung giả để lấp khoảng trống.
- Kiến thức2–4cột desktop,1cột mobile. Bài chi tiết có cột đọc và mục lục sticky240px bên phải, xếp mục lục trước bài trên màn nhỏ. Giữ toàn bộ tiêu đề, anchor, nội dung và liên kết.
- Paired entry dùng IntersectionObserver, dịch chuyển64px desktop/24px mobile và opacity trong0.9giây. Desktop ảnh và chữ dùng chung thời điểm; mobile khối xếp dọc vào khi từng phần nhìn thấy. Không xử lý theo từng pixel scroll, không đổi geometry, không đưa ảnh hero/so sánh vào hiệu ứng. Keyboard focus/reduced-motion/no-JS/BFCache có fallback đọc được.
- Quản trị/PC giảm padding ngoài và khoảng trống module, không tăng mật độ dữ liệu bảng hoặc bỏ tùy chọn người dùng. Không thay database/Auth/keys.

Kiểm tra local: designer-layout browser xác nhận vectơ chuyển động trái/phải, đồng hồ chênh dưới20ms, geometry không đổi, gap và chiều cao giới thiệu, lưới1/2/3cột, sidebar bài viết, touch/reduced-motion; giữ các kiểm thử bảo toàn SEO và tương tác. Bằng chứng CI/Pages/release được bổ sung sau phát hành.
