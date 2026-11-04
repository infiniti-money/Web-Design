# Nâng cấp giao diện ATELIER HOME — 05/11/2026

## Trải nghiệm làm việc

Giao diện quản trị dùng chung giữa web và Windows Manager 1.1.0: màu xanh đậm, bề mặt sáng, biểu tượng riêng theo chức năng, bảng dữ liệu dễ đọc và tổng quan ưu tiên. Điều hướng theo vai trò, menu thu gọn trên máy tính; drawer có quản lý bàn phím trên điện thoại. Chế độ gọn/thoáng và lựa chọn menu được lưu trên máy, không lưu hồ sơ khách hàng vào bộ nhớ tùy chọn.

Ctrl+K mở tìm chức năng không dấu, phím lên/xuống chọn kết quả và Enter mở. Dự án có tìm tên/slug/phong cách/loại công trình và lọc xuất bản/nháp ngay trên danh sách đã tải, giới hạn 200 dự án hiện có. Có liên kết bỏ qua điều hướng cho người dùng bàn phím.

## Tải dữ liệu

Trang tổng quan không tải trước trang CRM 25 hồ sơ hoặc danh bạ nhân sự. Những phần này được truy vấn khi mở. Kích hoạt lại một mục trong 15 giây dùng dữ liệu vừa tải; nhiều lần kích hoạt khi truy vấn đang chạy dùng cùng tác vụ. Nút Làm mới và các thao tác ghi/lọc vẫn truy vấn dữ liệu mới. Không lưu cache hồ sơ khách hàng ra ổ đĩa trình duyệt.

Đây là giảm truy vấn và thao tác được kiểm chứng bằng bộ đếm trong kiểm thử; chưa có đo thời gian thực với khối lượng dữ liệu doanh nghiệp lớn nên không đưa ra phần trăm tăng tốc.

## Kiểm tra

- 61 bài Node: 60 đạt, 1 bài gửi lead thật được bỏ qua có chủ đích.
- 4 bài desktop kiểm tra tài nguyên, CSP và trạng thái cập nhật đạt.
- Browser smoke đạt: CRUD dự án, lọc không dấu/trạng thái, tìm chức năng bằng bàn phím, menu thu gọn, mật độ hiển thị, CRM phân trang/thống kê/CSV, mobile và lỗi API.
- Bộ đếm giả lập xác nhận mở tổng quan không tải trang CRM/danh bạ; kích hoạt Nhân sự liên tiếp chỉ tải danh bạ một lần.
- CMS/quotes smoke đạt: quyền, lịch sử, chống ghi đè, phản hồi chậm, làm sạch Markdown và tổng tiền/PDF preview. Dữ liệu nghiệp vụ kiểm thử trình duyệt là giả lập, không ghi khách hàng thật.
- Kiểm tra artifact Pages xác nhận các route và tài nguyên cần thiết tồn tại; không chứa desktop, SQL, tests, cấu hình Cloudflare hay thư mục Git.
- Ngày 05/11/2026, triển khai Pages đầu tiên thành công ở commit `3e2df92588c7f95da0408a9ca441504bcaea3012`; `release.json` đã khớp. Hai bộ browser smoke cũng chạy đạt trực tiếp trên URL GitHub Pages sau triển khai, dữ liệu ghi vẫn được giả lập.
- Executable Windows 1.1.0 đóng gói local chạy đạt kiểm tra sandbox, mã hóa phiên đăng nhập và xuất PDF native. Harness hiển thị cửa sổ trước khi chụp ảnh để tránh compositor Windows ngừng tạo frame cho cửa sổ ẩn.

## Triển khai và xác minh

Đã xác minh ngày 05/11/2026:

- [Pages deployment](https://github.com/infiniti-money/Web-Design/actions/runs/41936221230) thành công; nguồn giao diện đang chạy là `6d96a0674189141c61cc497e7783242ce98f351f` theo `release.json`.
- [Kiểm thử trình duyệt sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/41936331775) thành công.
- [Workflow Windows](https://github.com/infiniti-money/Web-Design/actions/runs/41936229861) thành công, gồm kiểm thử Electron trên máy dựng Windows, dựng installer và tải lên Release.
- [Release desktop-v1.1.0](https://github.com/infiniti-money/Web-Design/releases/tag/desktop-v1.1.0) có Setup, Portable, blockmap và metadata. Feed stable trả HTTP 200, version 1.1.0; Setup và blockmap cũng trả HTTP 200. Đã tải toàn bộ Setup qua feed, 121.547.850 byte, SHA-512 khớp metadata.
- Bản dựng local có thể khác byte với artifact CI do thời điểm đóng gói; đối chiếu checksum với đúng nguồn tải. Không dùng checksum bản local để kiểm tra installer từ CI.

Các cập nhật tài liệu sau commit giao diện không cần thay đổi artifact website hoặc tag desktop đã phát hành.

Workflow `Deploy ATELIER HOME to GitHub Pages` chạy khi cập nhật `main`: kiểm tra trang dự án, chạy tests, tạo artifact từ danh sách tài nguyên cho phép rồi triển khai. Không còn bước dựng Jekyll cho website HTML tĩnh.

Sau khi workflow thành công, kiểm tra `https://infiniti-money.github.io/Web-Design/release.json` khớp commit phát hành; mở `admin.html`, `admin-posts.html`, các trang dịch vụ, CSS/JS và sitemap. Workflow browser smoke chạy tiếp sau deploy.

Windows Manager dùng tag `desktop-v1.1.0` để tạo bộ cài và phát hành cập nhật qua `desktop-stable`. Bản dựng chưa ký số. Kiểm tra feed và tải phiên bản mới khác với kiểm thử hoàn chỉnh việc nâng cấp từ một bản đã cài; không coi kiểm thử trạng thái giả lập là kiểm thử nâng cấp thực tế.

Nếu cần quay lại giao diện trước, dùng một commit revert trên `main`; workflow triển khai lại nguồn đã phục hồi. Không chạy rollback database chỉ để phục hồi giao diện. Các migration CMS/kiểm tra quyền đã áp dụng ở giai đoạn trước được giữ nguyên.

Trang bài viết công khai vẫn noindex trong khi chưa có luồng xuất HTML tĩnh cho SEO. Chưa có hồ sơ công trình thật mới hoặc nội dung doanh nghiệp được tự ý bổ sung.
