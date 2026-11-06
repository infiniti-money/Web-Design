# Nghiệm thu Catalog công khai

URL chính: `https://infiniti-money.github.io/Web-Design/catalog.html`.

1. Trang chỉ đọc các mục đã published. Không có mục tương ứng thì không dùng lại mẫu mặc định hoặc coi lỗi API là danh sách rỗng.
2. Tìm/lọc/sắp xếp và chuyển trang; tải lại URL để giữ lựa chọn. Danh sách 12 mục/trang, dữ liệu đọc theo lô. Hiện frontend tải tối đa dưới 5.000 hàng trong 15 giây; dữ liệu lớn hơn cần nâng cấp phân trang/tìm kiếm máy chủ, không âm thầm cắt kết quả.
3. Mở mục, sao chép đường dẫn và thử trên tab mới. Đóng bằng nút/Escape hoặc Quay lại; các bộ lọc giữ nguyên. Khi đường dẫn không còn công khai, hiển thị thông báo phù hợp, không đọc nháp bằng quyền Admin đang đăng nhập.
4. Thử mất mạng/HTTP lỗi: không giữ danh sách cũ như dữ liệu đã xác nhận; khôi phục mạng và thử lại. Không có lưu thông tin khách hàng trong trình duyệt.
5. Trên điện thoại: không tràn ngang; hộp chi tiết cuộn được; phím mũi tên trong ô đường dẫn không lật trang sách mẫu.

Quyền dữ liệu được kiểm tra bằng SQL rollback riêng trong tests/catalog-public-rls-rollback.sql. API công khai cũng được CI kiểm tra định kỳ theo workflow hiện có; không dùng JWT hay khóa quản trị cho các bài đọc public.

Đợt này giữ nguyên mục mà chủ website đã công khai, không tự tạo/gỡ sản phẩm hoặc đổi dữ liệu thử hiện có. Cần chủ website xác nhận danh mục thật và quyền ảnh trước khi coi Catalog là hồ sơ sản phẩm hoàn chỉnh. Query URL hiện phục vụ chia sẻ và thao tác; chưa phải trang HTML tĩnh riêng cho từng sản phẩm.

## Kết quả xác minh ngày 07/11/2026

- Gói nguồn [v1.22.0](https://github.com/infiniti-money/Web-Design/releases/tag/v1.22.0) lưu commit `810716bc4474d8853ccb81fb2ed8e1d1692bda33`. Validate, triển khai Pages, kiểm thử API, đóng gói release và browser smoke của đợt phát hành đều thành công.
- Website hiện chạy revision `d3489e0bf7a3a1ebeea340ff30d151d1ebd9ea9b`, đối chiếu trực tiếp `release.json`. Revision này đã tích hợp thêm CMS/Delivery từ nhánh chính; không đồng nhất với commit của gói nguồn ban đầu. [Pages gần nhất](https://github.com/infiniti-money/Web-Design/actions/runs/42261878728) và [browser smoke sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42261961808) đều thành công.
- Kiểm tra API chỉ đọc: Catalog public HTTP 200, hiện có 1 mục công khai; `staff_profiles` vẫn HTTP 401 với khóa public. Không tự thay đổi mục đang tồn tại và không ghi yêu cầu tư vấn thật.
- Chạy lại trực tiếp trên URL Pages: `tests/catalog-public-browser.cjs` và `tests/catalog-browser-smoke.cjs` đều đạt. Các ca quản trị dùng fixture trong trình duyệt, không thay thế nghiệm thu tài khoản nhân viên thật. Catalog công khai kiểm tra URL chia sẻ, bộ lọc khi tải lại, điều hướng lịch sử, bàn phím, lỗi/thử lại, dữ liệu không an toàn và giao diện điện thoại.
- Bộ Node tại revision hiện tại: 95 bài, 94 đạt, 0 lỗi, 1 bài gửi dữ liệu thật được chủ động bỏ qua. SQL rollback đã kiểm tra quyền theo vai trò trong đợt triển khai migration; đợt xác minh này không chạy lại thao tác ghi database.

Còn mở: danh mục/ảnh có xác nhận quyền sử dụng, nội dung sản phẩm thật, trang HTML SEO riêng từng sản phẩm, nghiệm thu tài khoản và thiết bị thật. Kết quả trên chỉ nghiệm thu phạm vi kỹ thuật đã kiểm tra, chưa đánh dấu hoàn thành toàn bộ lộ trình.
