# ATELIER HOME web v1.19.0 — Kiến thức HTML và lộ trình chuyên nghiệp

Ngày: 05/11/2026. [Lộ trình sáu chặng](WEBSITE_ROADMAP.md) mô tả kết quả bàn giao, điều kiện đạt và phần cần doanh nghiệp cung cấp.

## Đã thực hiện

- Trang Kiến thức có danh mục HTML và bài theo URL `/kien-thuc/<slug>/`, đọc được khi tắt JavaScript. Có canonical, Article/Breadcrumb schema, Open Graph và sitemap trong artifact triển khai.
- Ba hướng dẫn gốc: chuẩn bị brief thiết kế; đọc báo giá theo phạm vi; chuẩn bị kiểm tra/bàn giao. Không tạo hồ sơ công trình, đánh giá khách hàng hoặc số liệu doanh nghiệp chưa xác nhận.
- Bộ dựng lấy bài CMS qua API công khai và publishable key, chỉ chọn các trường công khai; không dùng service-role hay xuất author_id/lịch sử. Bản nháp, lưu trữ và bài hẹn giờ chưa đến hạn không được xuất.
- Xuất bản lại từ artifact mới giúp gỡ bài đã lưu trữ khỏi trang/sitemap sau lần triển khai thành công tiếp theo. API lỗi làm dừng build và giữ bản đang chạy.
- Đồng bộ vào phút 17 và 47 mỗi giờ bằng GitHub Actions; lịch có thể bị trễ. Có thể chạy thủ công workflow Pages để đồng bộ sớm hơn. Không hứa thời điểm lưu CMS là thời điểm trang đã xuất hiện.
- Markdown nội tuyến HTML được hiển thị dạng chữ; liên kết chỉ HTTPS/mailto; ảnh trong Markdown không tự được tải. Ảnh bìa dùng kiểm tra quyền xuất bản sẵn có của CMS.
- URL cũ `bai-viet.html?slug=...` chuyển sang trang slug; các URL quản trị và ứng dụng PC giữ nguyên.

## Kiểm chứng

68 bài Node: 67 đạt, 1 bài gửi lead thật được bỏ qua. Các bài mới kiểm tra HTML/schema/sitemap, bản nháp/hẹn giờ, slug, nội dung chèn mã, xung đột và API lỗi/phân trang/giới hạn trường.

Kiểm thử Chromium với JavaScript tắt đạt: danh mục, ba bài, nội dung/schema, menu điện thoại và không tràn ngang ở 390px. Các bài CMS tổng hợp chỉ dùng fixture; không thêm bài thử vào database production. API công khai hiện không có bài CMS nên đợt này xuất ba bài nền tảng từ nguồn biên tập.

Đây là hoàn thành phần xuất HTML/nội dung nền của chặng 3, chưa phải hoàn thành toàn bộ sáu chặng. Search Console, CWV thực địa, nghiệm thu người dùng thật và nội dung công trình/doanh nghiệp chưa được tự đánh dấu đạt.
