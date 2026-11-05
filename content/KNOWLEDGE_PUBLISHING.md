# Biên tập và xuất bản kiến thức

Ba bài nền tảng nằm trong `content/articles.json`, được quản lý theo phiên bản mã nguồn. Chỉnh các bài này trong file rồi kiểm thử/phát hành; chúng không phải bản ghi CMS và không xuất hiện trong danh sách Admin CMS.

Bài mới có thể soạn trong Admin/PC, lưu nháp, trình và duyệt theo quyền hiện tại. Bài public được bộ dựng đọc bằng quyền anon qua API. Chỉ bài trạng thái published và đã đến giờ được đưa vào HTML. Dùng slug khác ba bài nền tảng; xung đột khiến bản dựng dừng để tránh ghi đè nội dung.

Workflow Pages chạy khi cập nhật main, chạy thủ công, hoặc định kỳ hai lần mỗi giờ. GitHub có thể trì hoãn lịch. Nếu cần gỡ bài sớm, lưu trữ bài trong CMS, chạy workflow Pages thủ công và xác nhận workflow thành công/trang cũ không còn trong artifact. Trình duyệt hoặc công cụ tìm kiếm vẫn có thể giữ bản cache cũ; không cam kết xóa tức thì.

Build local:

```powershell
node scripts/build-pages.cjs --cms dist/preview-moi
```

Thư mục đầu ra phải mới/rỗng. Bỏ `--cms` để kiểm tra ba bài biên tập local mà không truy cập mạng. HTML Kiến thức/sitemap trong nguồn root là bản tương thích cũ; bản công khai cuối cùng được bộ dựng tạo trong artifact. Không chỉnh tay artifact.

Markdown hỗ trợ tiêu đề, đoạn văn, danh sách, chữ đậm/nghiêng, mã và bảng. HTML thô không được thực thi. Ảnh nội dung Markdown hiển thị phần mô tả thay vì tự tải ảnh chưa xác nhận; ảnh bìa tuân theo kiểm tra quyền ảnh khi duyệt CMS.

Nếu API lỗi hoặc nội dung/slug không hợp lệ, bản mới không được deploy; xem lỗi Actions và sửa nguồn. Không dùng service-role, không xuất bảng nhân sự/khách hàng và không tự chuyển nháp sang published để vượt lỗi.

## Xác nhận phiên bản đã triển khai

Mỗi lần Pages dựng thành công, artifact công khai có thêm `cms-publication.json` chỉ chứa slug bài CMS đã thực sự có HTML và thời điểm cập nhật tương ứng. Trang Quản lý bài viết đối chiếu `slug + updated_at` của bài đã lưu với tệp trên Pages (tải lại không dùng cache) trước khi bật nút **Kiểm tra bài trên website**. Bài mới duyệt, bài hẹn giờ, bài đang chờ Pages, hoặc bản cập nhật chưa có trong artifact sẽ không được báo là đã triển khai. Nếu không kiểm tra được manifest, giao diện hiển thị trạng thái chưa xác minh chứ không coi là thành công.

Dấu xác nhận này là kiểm tra phiên bản tại thời điểm đọc tệp; **không thay thế** việc mở URL, kiểm tra HTML, ảnh thực, xác minh CDN/cache và browser smoke trên bản công khai. Bản đã triển khai cũ có thể vẫn được phục vụ từ cache; khi gỡ bài khẩn cấp cần làm theo quy trình thông thường. Không đưa thông tin riêng tư, ID khách, quyền nhân viên hoặc mã xác thực vào manifest.
