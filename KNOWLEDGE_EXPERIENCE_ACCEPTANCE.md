# Nghiệm thu trải nghiệm kiến thức v1.23

URL: https://infiniti-money.github.io/Web-Design/kien-thuc.html

Phạm vi: tìm trên tiêu đề, mô tả và chủ đề của các bài công khai trong HTML tại lần dựng gần nhất. Không tìm toàn văn hoặc nội dung nháp. Bộ lọc dùng `q` và `category` trong URL; canonical giữ URL danh mục gốc. Thời gian đọc chỉ là ước tính.

## Triển khai trước, kiểm thử sau

Đã hoàn thiện mã chức năng. Chờ đối chiếu revision của bản Pages rồi chạy các ca dưới đây; không đánh dấu hoàn tất nghiệm thu trước khi có kết quả. CI kiểm tra an toàn và đóng gói hiện có được giữ nguyên.

- Tìm không dấu, nhiều từ, kết hợp chủ đề; đếm đúng số thẻ nhìn thấy, không có kết quả, xóa bộ lọc và giữ focus.
- Tải lại URL đã lọc, chia sẻ URL, tham số lạ và chuỗi không an toàn không được tạo HTML hoặc thực thi mã.
- Danh mục/bài đầy đủ khi tắt JavaScript hoặc file tìm kiếm không tải được.
- Mục lục và neo heading hoạt động không cần JavaScript; heading trùng tên có ID duy nhất; nội dung Markdown vẫn được làm sạch như trước.
- Di động không tràn ngang, nhãn/phím Tab rõ; bản in tập trung nội dung bài.
- Các trang cũ, schema, sitemap và luồng CMS đang dùng tiếp tục đạt kiểm thử.

Không gửi biểu mẫu thật, mời nhân viên hoặc thay dữ liệu Supabase trong các ca này. Nội dung công trình, danh mục thật và nghiệm thu tài khoản doanh nghiệp vẫn là đầu việc riêng.
