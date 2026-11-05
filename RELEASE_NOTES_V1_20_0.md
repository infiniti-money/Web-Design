# ATELIER HOME web v1.20.0 — Hiệu suất và khả năng sử dụng trang chủ

Ngày: 05/11/2026. Tiếp tục các việc đã ghi trong PERFORMANCE_BASELINE.md và chặng 4/6 của WEBSITE_ROADMAP.md.

## Thay đổi

- CSS phông chữ tải với media không chặn hiển thị; chỉ kích hoạt font sau khi ảnh hero hoàn tất/tải lỗi để ưu tiên tài nguyên chính. Có nhánh stylesheet đã cache và fallback font hệ thống khi dịch vụ font không tải được. Giữ phông thương hiệu khi tải thành công.
- Hero giảm mức chất lượng ảnh CDN; thẻ dự án dùng srcset 480/760/1100 và sizes theo bố cục. Chỉ tạo biến thể với Unsplash; ảnh trên host khác giữ URL gốc.
- Logo và thẻ dự án lấy tên truy cập từ chữ đang hiển thị, tránh nhãn tùy chỉnh bỏ sót nội dung. Giữ mở/đóng gallery bằng Enter/Escape và trả focus như trước.
- Bản HTML ban đầu dùng lời giới thiệu tư vấn trung tính thay cho thông báo demo cũ. Khi JavaScript tắt, ẩn biểu mẫu phụ thuộc API/anti-bot và hiện email liên hệ có sẵn; không để trình duyệt gửi các trường liên hệ bằng GET mặc định.

## Kiểm chứng

- Node: 70 bài, 69 đạt, 1 bài gửi lead thật bỏ qua có chủ đích.
- Browser smoke hiện có đạt: API công khai, bộ lọc, gallery bàn phím, gửi tư vấn giả lập, CRM, mobile và lỗi mạng.
- Home experience: font tải được/mất kết nối, tên truy cập, ảnh responsive, modal bàn phím, mobile và liên hệ khi JavaScript tắt đạt. Unit test kiểm tra nhánh stylesheet đã cache, hero đã tải hoặc tải lỗi.
- So sánh Lighthouse local cùng máy: bản cũ 88 hiệu suất/LCP 3,5 giây; bản mới 90/LCP 3,4 giây. CSS font chặn hiển thị từ khoảng 931 ms trong bản đối chứng thành danh sách rỗng ở bản mới; audit label-content-name-mismatch từ fail thành pass. CLS bản mới 0,003. Một lần đo mỗi cấu hình chưa đủ kết luận tăng tốc ổn định.

Đo online sau triển khai được ghi riêng trong PERFORMANCE_BASELINE.md. Không so trực tiếp điểm local với điểm online 94 ở đợt trước để tuyên bố tăng/giảm tốc; điều kiện đo khác nhau. Chưa có CWV thực địa hoặc Search Console được cấp quyền. Không đổi dữ liệu, tài khoản, email gửi ra hoặc domain.
