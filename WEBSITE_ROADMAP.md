# Lộ trình website chuyên nghiệp ATELIER HOME

Ngày lập: 05/11/2026. Giữ GitHub Pages, thương hiệu ATELIER HOME, Supabase và tài khoản hiện tại. Thời lượng dưới đây là ước lượng công việc, không phải cam kết lịch khi thiếu dữ liệu/nghiệm thu.

| Chặng | Kết quả bàn giao | Điều kiện đạt | Ước lượng |
| --- | --- | --- | --- |
| 1. Chuẩn hóa nền tảng | Kiểm kê URL, nguồn nội dung, lỗi ưu tiên và kênh phát hành | Không mất URL/dữ liệu; có cách phục hồi bản trước | 1–2 ngày |
| 2. Website công khai | Trang dịch vụ, công trình theo slug, catalog, kiến thức, liên hệ; điều hướng mobile thống nhất | Mỗi nội dung có URL riêng, dùng được bằng bàn phím và trên điện thoại | 3–5 ngày |
| 3. Nội dung và SEO | HTML bài viết, canonical, sitemap, Article/Breadcrumb schema, metadata chia sẻ và cụm nội dung gốc | Đọc bài khi tắt JavaScript; không index bản nháp; cập nhật/gỡ bài đúng | 3–5 ngày cho nền tảng, biên tập liên tục |
| 4. Chuyển đổi tư vấn | CTA theo dịch vụ, biểu mẫu dễ hiểu, chống spam, xác nhận và xử lý lỗi | Không mất nội dung khi lỗi, không báo thành công giả; kiểm tra trên thiết bị thật | 2–3 ngày |
| 5. Vận hành | CMS, dự án, CRM, nhân sự, báo giá, tài khoản và PC | Kiểm tra đúng quyền; nghiệm thu Admin/Quản lý/Nhân viên thực | 3–5 ngày nghiệm thu, tính năng nền đã có |
| 6. Hiệu suất và phát hành | Kiểm thử tự động, đo Lighthouse/CWV, kiểm tra dữ liệu có cấu trúc, Search Console và theo dõi lỗi | Chỉ công bố số đo đã chạy; không hứa thứ hạng hay Google index | 2–3 ngày thiết lập, theo dõi liên tục |

## Đợt thực hiện bắt đầu ngay

Ưu tiên P0: giữ các lớp bảo vệ và phát hành đã có. P1: hoàn thiện HTML tĩnh cho kiến thức và bài CMS đã duyệt, vì hiện các trang này phụ thuộc JavaScript và noindex. Bổ sung ba bài gốc dạng hướng dẫn chuẩn bị nhu cầu, đọc báo giá và chuẩn bị nghiệm thu; không tự nhận đã thi công dự án, không tạo đánh giá khách hàng hoặc giá bán minh họa thành thông tin thật.

Luồng mục tiêu: Admin duyệt bài trong CMS → bộ dựng đọc API công khai → sinh HTML, metadata, schema, sitemap → CI kiểm tra → Pages triển khai. Đồng bộ định kỳ giúp bài mới/sửa/gỡ phản ánh lên website; lịch GitHub có thể trễ, không coi thời điểm lưu CMS là thời điểm deploy thành công. Nếu API lỗi, dừng bản dựng và giữ bản đang chạy.

Kiểm chứng bắt buộc: loại nháp/bài hẹn giờ; chống chèn HTML/script và URL không an toàn; slug không thoát thư mục; không xuất dữ liệu nội bộ; bài có nội dung khi JavaScript tắt; kiểm tra responsive và link; triển khai rồi đối chiếu commit thực tế. Đợt này không thay đổi database hoặc tăng quyền API.

## Phần cần doanh nghiệp cung cấp

Tiến độ đợt v1.19: đã lập lộ trình; đã dựng danh mục/bài kiến thức HTML, ba bài gốc, metadata/schema/sitemap và luồng đọc bài CMS công khai; kiểm thử Node và trình duyệt khi tắt JavaScript đạt. Việc triển khai thực tế được xác nhận sau khi Actions hoàn tất. Các chặng còn lại tiếp tục theo tiêu chí trong bảng, không đánh dấu hoàn thành chung.

Đã triển khai và đối chiếu `release.json` online ở commit `4f3c9e4aeab4c0bcb40edbf2deed232f217f1c92`. [Pages deployment](https://github.com/infiniti-money/Web-Design/actions/runs/41940468321) và [gói phát hành v1.19](https://github.com/infiniti-money/Web-Design/actions/runs/41940476601) thành công. Đã đo Lighthouse trang chủ/mục Kiến thức; xem [kết quả và việc còn phải tối ưu](PERFORMANCE_BASELINE.md). Chặng 6 mới hoàn thành đo ban đầu, chưa có Search Console/CWV thực địa.

[Browser smoke sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/41940527081) thành công, gồm kiểm tra Kiến thức không JavaScript và chuyển URL cũ. Không coi toàn bộ lộ trình đã hoàn tất; các đầu vào doanh nghiệp ở dưới và những điểm tối ưu trong báo cáo vẫn còn mở.

- Xác nhận tên pháp lý, thông tin liên hệ và khu vực phục vụ để công khai chính xác.
- Hồ sơ công trình thật, nội dung mô tả và ảnh có quyền sử dụng; đã ghi nhận chủ website sẽ gửi.
- Email nhân viên và cho phép gửi lời mời để nghiệm thu đăng nhập thực; không dùng fixture SQL làm bằng chứng.
- Quyết định kích hoạt email/thông báo đẩy và cấu hình nhà cung cấp khi muốn mở lại hạng mục đang hoãn.
- Quyền Search Console/đo lường khi triển khai phần tương ứng; không tự chèn mã đo lường chưa được xác nhận.

## Cách đánh giá hoàn thành

Đợt v1.20 xử lý phông chữ chặn hiển thị, ảnh responsive và nhãn truy cập trên trang chủ; bổ sung nhánh liên hệ khi JavaScript tắt. Kiểm thử 69/70 bài đạt (1 bài gửi dữ liệu thật chủ động bỏ qua), browser smoke và home experience đạt. So sánh local cho thấy font không còn nằm trong danh sách tài nguyên chặn render và lỗi nhãn đã hết; số đo online ghi sau triển khai.

Đã triển khai v1.20, đối chiếu revision `9d338249fc0aae4147a815c7e80297fe5b43d8b4`; CI triển khai và browser smoke đều thành công. Online đo 93 hiệu suất / 100 Accessibility / 100 Best Practices / 100 SEO. Đây là cải thiện cấu trúc tải và nhãn, chưa có bằng chứng tăng tốc tổng thể ổn định so với lần đo cũ; xem số đo đầy đủ trong PERFORMANCE_BASELINE.md. Chặng 4 và 6 tiếp tục mở cho nghiệm thu thật/CWV, không tự đánh dấu hoàn thành toàn bộ.

Mỗi đợt có ghi chú phạm vi, kiểm thử, URL đang chạy và giới hạn còn lại. Cập nhật bảng này theo bằng chứng thực tế. Các chặng 4–6 và nghiệm thu doanh nghiệp chưa tự động được xem là hoàn tất khi chỉ có giao diện hoặc build thành công.
