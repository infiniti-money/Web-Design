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
