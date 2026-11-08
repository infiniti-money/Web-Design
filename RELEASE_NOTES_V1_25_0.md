# ATELIER HOME web 1.25.0

## Website và nội dung

- Bổ sung Catalog HTML tĩnh theo ID ổn định, đọc được khi tắt JavaScript, có canonical, metadata chia sẻ và breadcrumb; giữ URL, bộ lọc, dữ liệu và quản trị Catalog cũ.
- Chốt duyệt nội dung và quyền ảnh độc lập: mục chưa xác minh noindex và không xuất vào sitemap, ảnh chưa xác nhận không xuất sang trang mới. Không tạo giá, tồn kho hoặc đánh giá giả.
- Thêm bài gốc về đối chiếu hồ sơ vật liệu, nâng tổng số hướng dẫn gốc trong nguồn lên bốn. Bổ sung kế hoạch nhóm chủ đề và quy trình duyệt catalog.
- Kiểm toán SEO công khai bằng GET: sitemap, metadata/canonical, H1, JSON-LD, Open Graph, index/noindex, trạng thái URL và neo liên kết. CI chạy hàng ngày và sau deploy không theo lịch; giữ báo cáo 14 ngày, lỗi P1 làm job thất bại; kèm đo Lighthouse mobile trang chủ trong môi trường lab.

## Kiểm chứng và giới hạn

Kiểm thử tĩnh và trình duyệt độc lập cho catalog 320/390/1440 px, không JavaScript, bàn phím, cập nhật/gỡ mục, URL cũ, chống chèn mã và giới hạn dữ liệu công khai. Không ghi dữ liệu doanh nghiệp thật. Xem báo cáo `SEO_AUDIT.md` và `PERFORMANCE_BASELINE.md` để biết số đo và việc còn mở.

Giữ các bảo vệ và cấu hình payOS/tawk.to đã vận hành ở main trước bản này; không mở thêm luồng thanh toán hoặc sửa cơ sở dữ liệu trong đợt Catalog. Bản này là gói website, không phải bộ cài PC mới. Các bằng chứng doanh nghiệp, quyền ảnh công trình, UAT nhân sự thật và Search Console/CWV thực địa vẫn cần chủ website cung cấp.
