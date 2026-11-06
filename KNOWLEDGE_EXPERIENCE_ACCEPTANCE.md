# Nghiệm thu trải nghiệm kiến thức v1.23

URL: https://infiniti-money.github.io/Web-Design/kien-thuc.html

Phạm vi: tìm trên tiêu đề, mô tả và chủ đề của các bài công khai trong HTML tại lần dựng gần nhất. Không tìm toàn văn hoặc nội dung nháp. Bộ lọc dùng `q` và `category` trong URL; canonical giữ URL danh mục gốc. Thời gian đọc chỉ là ước tính.

## Triển khai trước, kiểm thử sau

Đã triển khai mã chức năng trước tại revision `d2c98a71df7abf812c21973db3c35bf4e222b781`, đối chiếu trực tiếp `release.json` sau khi [Pages thành công](https://github.com/infiniti-money/Web-Design/actions/runs/42265153359). Sau đó mới chạy kiểm thử sâu trên website. CI kiểm tra an toàn và đóng gói hiện có được giữ nguyên.

- Tìm không dấu, nhiều từ, kết hợp chủ đề; đếm đúng số thẻ nhìn thấy, không có kết quả, xóa bộ lọc và giữ focus.
- Tải lại URL đã lọc, chia sẻ URL, tham số lạ và chuỗi không an toàn không được tạo HTML hoặc thực thi mã.
- Danh mục/bài đầy đủ khi tắt JavaScript hoặc file tìm kiếm không tải được.
- Mục lục và neo heading hoạt động không cần JavaScript; heading trùng tên có ID duy nhất; nội dung Markdown vẫn được làm sạch như trước.
- Di động không tràn ngang, nhãn/phím Tab rõ; bản in tập trung nội dung bài.
- Các trang cũ, schema, sitemap và luồng CMS đang dùng tiếp tục đạt kiểm thử.

Không gửi biểu mẫu thật, mời nhân viên hoặc thay dữ liệu Supabase trong các ca này. Nội dung công trình, danh mục thật và nghiệm thu tài khoản doanh nghiệp vẫn là đầu việc riêng.

## Kết quả sau triển khai lần đầu — 07/11/2026

- `tests/knowledge-discovery-browser.cjs`: đạt tìm không dấu, kết hợp chủ đề, URL/tải lại, không kết quả/xóa/focus, tham số không an toàn, mục lục/neo, bản in, di động và trường hợp JavaScript tắt/bị chặn. Đã xem ảnh desktop/mobile từ bản đang chạy; không tràn ngang.
- `tests/knowledge-browser.cjs`: đạt nội dung HTML khi tắt JavaScript, schema, menu mobile và chuyển URL cũ. Locator menu được thu hẹp vào `.menu>summary` vì nay trang có thêm mục lục; lỗi chọn nhầm hai summary đã được sửa trong bộ kiểm thử.
- Bộ Node mở rộng: 97 bài, 96 đạt, 0 lỗi, 1 bài gửi dữ liệu thật chủ động bỏ qua. Kiểm tra thêm heading trùng/suffix có ID riêng, ký tự không an toàn và danh mục HTML đầy đủ.
- Hoàn thiện phạm vi tìm kiếm chỉ trong tiêu đề, mô tả và chủ đề, không tính nhãn thao tác “Đọc hướng dẫn” chung cho mọi thẻ. Bổ sung ca hồi quy và workflow kiểm tra sau triển khai cho các đợt sau; kết quả revision cuối ghi bên dưới sau khi phát hành.
