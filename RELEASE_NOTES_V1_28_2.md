# ATELIER HOME web v1.28.2

## Nâng cấp

- Trang bài viết công khai hiển thị thêm ngày **Cập nhật** khi phiên bản nội dung mới hơn ngày đăng. Giữ ngày đăng và dữ liệu có cấu trúc Article `dateModified` đồng nhất, không đổi URL và canonical.
- Kiểm toán SEO sau triển khai nay đọc `cms-publication.json` (chỉ dữ liệu đã công khai) và đối chiếu bài CMS với sitemap, chính sách index, HTML trang bài và `Article.dateModified`. Phát hiện thiếu sitemap, manifest lỗi/trùng slug, bài thiếu hoặc revision không khớp.
- Thêm hồi quy Node cho manifest hợp lệ, sitemap thiếu, revision không khớp, manifest vắng và ngày cập nhật hiển thị.

## Giới hạn và an toàn

- Chỉ dùng GET công khai trong kiểm toán; không đăng nhập, không gọi nghiệp vụ ghi, không truy cập thông tin khách hàng.
- Giữ Supabase Auth/RLS, các bảng CRM/báo giá, payOS, tawk.to và gói Windows Manager nguyên trạng.
- Các bài viết tạo từ nội dung tĩnh vẫn hợp lệ dù không có trong manifest CMS. Website chỉ coi bài CMS đã được tạo ra ở bản Pages đang chạy là đã triển khai.
- Workflow Public SEO audit chạy sau deploy và theo lịch; báo lỗi P1 để điều tra, không tự sửa hoặc gỡ bài production.
- Cần xác nhận CI và website thực tế sau khi gộp trước khi phát hành tag.
