# ATELIER HOME — Website thiết kế nội thất (v1.1 codebase)

Website giới thiệu thiết kế nội thất bằng tiếng Việt, responsive, triển khai theo dạng static website không cần build.

## Phiên bản v1.1 — Nền tảng quản trị
- Giao diện `admin.html` với đăng nhập Supabase Auth (không có tài khoản admin mặc định).
- Quản lý dự án và yêu cầu tư vấn khi đã kết nối Supabase.
- Database schema và chính sách phân quyền trong `supabase/schema.sql`.
- Cấu hình frontend tại `app-config.js` (chỉ chứa URL và publishable key).
- Hướng dẫn thực tế: [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

**Hiện chưa có Supabase project được cấu hình.** Chưa thể khẳng định chức năng quản trị và lưu khách hàng trực tuyến đang hoạt động. Khi cấu hình trống, website tự dùng demo localStorage như trước.

## Chạy website
- Tải repository về máy và mở `index.html` trên trình duyệt.
- Hoặc dùng VS Code Live Server.
- Khi bật GitHub Pages cho nhánh `main` thư mục `/ (root)`, trang có thể xuất bản trực tiếp từ `index.html`.

## Chức năng hiện có
- Landing page cao cấp, responsive, điều hướng theo khu vực.
- Giới thiệu, dịch vụ, quy trình, bộ sưu tập cảm hứng.
- Danh sách dự án mẫu và bộ lọc căn hộ / biệt thự / nhà phố / thương mại.
- Xem chi tiết dự án trong modal, hỗ trợ thao tác bàn phím.
- Form yêu cầu tư vấn có kiểm tra dữ liệu nhập và checkbox đồng ý.
- Chế độ demo xem và xuất JSON các yêu cầu đã lưu cục bộ, xóa dữ liệu demo.
- Metadata cơ bản và hình ảnh lazy-load.

## Giới hạn của bản demo
**Chưa có backend hoặc xác thực.** Dữ liệu form chỉ lưu bằng localStorage trên máy/trình duyệt đang sử dụng; không gửi mail, không đồng bộ và không tự chuyển đến doanh nghiệp. Khu vực "Quản lý yêu cầu (demo)" không phải hệ thống quản trị bảo mật, không phù hợp lưu dữ liệu khách hàng thật.

Tên ATELIER HOME, các dự án, con số thống kê, thời gian hoạt động và nội dung mô tả là **nội dung minh họa**, không phải thành tích hay thông tin đã được xác minh. Hình ảnh tải từ Unsplash và phải kiểm tra bản quyền / giấy phép sử dụng trước khi đưa vào hoạt động thương mại.

## Các bước để triển khai sản phẩm thật
1. Xác nhận tên thương hiệu, thông tin liên hệ, logo, dự án thực tế và dịch vụ.
2. Kết nối backend/API lưu yêu cầu tư vấn, gửi email thông báo, chống spam và bảo vệ dữ liệu cá nhân.
3. Xây dựng trang quản trị có đăng nhập và phân quyền, quản lý dự án, ảnh, bài viết, dịch vụ, khách hàng.
4. Cài đặt domain, HTTPS, analytics, sitemap, SEO, chính sách bảo mật và quy trình sao lưu.
5. Kiểm thử trên các thiết bị và trình duyệt trước khi công bố.

## Công nghệ
HTML5, CSS3, JavaScript thuần. Không cần package manager hay môi trường build.

Copyright: Website concept for Web-Design repository.
