# Nghiệm thu Catalog công khai

URL chính: `https://infiniti-money.github.io/Web-Design/catalog.html`.

1. Trang chỉ đọc các mục đã published. Không có mục tương ứng thì không dùng lại mẫu mặc định hoặc coi lỗi API là danh sách rỗng.
2. Tìm/lọc/sắp xếp và chuyển trang; tải lại URL để giữ lựa chọn. Danh sách 12 mục/trang, dữ liệu đọc theo lô. Hiện frontend tải tối đa dưới 5.000 hàng trong 15 giây; dữ liệu lớn hơn cần nâng cấp phân trang/tìm kiếm máy chủ, không âm thầm cắt kết quả.
3. Mở mục, sao chép đường dẫn và thử trên tab mới. Đóng bằng nút/Escape hoặc Quay lại; các bộ lọc giữ nguyên. Khi đường dẫn không còn công khai, hiển thị thông báo phù hợp, không đọc nháp bằng quyền Admin đang đăng nhập.
4. Thử mất mạng/HTTP lỗi: không giữ danh sách cũ như dữ liệu đã xác nhận; khôi phục mạng và thử lại. Không có lưu thông tin khách hàng trong trình duyệt.
5. Trên điện thoại: không tràn ngang; hộp chi tiết cuộn được; phím mũi tên trong ô đường dẫn không lật trang sách mẫu.

Quyền dữ liệu được kiểm tra bằng SQL rollback riêng trong tests/catalog-public-rls-rollback.sql. API công khai cũng được CI kiểm tra định kỳ theo workflow hiện có; không dùng JWT hay khóa quản trị cho các bài đọc public.

Đợt này giữ nguyên mục mà chủ website đã công khai, không tự tạo/gỡ sản phẩm hoặc đổi dữ liệu thử hiện có. Cần chủ website xác nhận danh mục thật và quyền ảnh trước khi coi Catalog là hồ sơ sản phẩm hoàn chỉnh. Query URL hiện phục vụ chia sẻ và thao tác; chưa phải trang HTML tĩnh riêng cho từng sản phẩm.
