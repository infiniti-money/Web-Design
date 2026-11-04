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

## Triển khai và xác minh

Workflow `Deploy ATELIER HOME to GitHub Pages` chạy khi cập nhật `main`: kiểm tra trang dự án, chạy tests, tạo artifact từ danh sách tài nguyên cho phép rồi triển khai. Không còn bước dựng Jekyll cho website HTML tĩnh.

Sau khi workflow thành công, kiểm tra `https://infiniti-money.github.io/Web-Design/release.json` khớp commit phát hành; mở `admin.html`, `admin-posts.html`, các trang dịch vụ, CSS/JS và sitemap. Workflow browser smoke chạy tiếp sau deploy.

Windows Manager dùng tag `desktop-v1.1.0` để tạo bộ cài và phát hành cập nhật qua `desktop-stable`. Bản dựng chưa ký số. Kiểm tra feed và tải phiên bản mới khác với kiểm thử hoàn chỉnh việc nâng cấp từ một bản đã cài; không coi kiểm thử trạng thái giả lập là kiểm thử nâng cấp thực tế.

Nếu cần quay lại giao diện trước, dùng một commit revert trên `main`; workflow triển khai lại nguồn đã phục hồi. Không chạy rollback database chỉ để phục hồi giao diện. Các migration CMS/kiểm tra quyền đã áp dụng ở giai đoạn trước được giữ nguyên.

Trang bài viết công khai vẫn noindex trong khi chưa có luồng xuất HTML tĩnh cho SEO. Chưa có hồ sơ công trình thật mới hoặc nội dung doanh nghiệp được tự ý bổ sung.
