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

## Bản cuối v1.23.0

- Website và tag phát hành cùng revision `6ec7849d4372606f71863afe778eb3a7ad901fe9`; đã đọc `release.json` từ website để đối chiếu, không chỉ dựa vào trạng thái push.
- [Validate](https://github.com/infiniti-money/Web-Design/actions/runs/42266052913), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42266052759) và [đóng gói release](https://github.com/infiniti-money/Web-Design/actions/runs/42266065167) thành công. Validate gồm website, protocol PC, quote-history PostgreSQL tách biệt và browser fixture cho tư vấn/CMS/Catalog/Delivery.
- Chạy lại hai bộ `knowledge-discovery-browser.cjs` và `knowledge-browser.cjs` trực tiếp trên revision cuối: đạt, bao gồm ca loại trừ nhãn thao tác chung khỏi tìm kiếm. Không có lỗi JavaScript hoặc yêu cầu API từ trang tìm bài.
- Đã tải [gói nguồn v1.23.0](https://github.com/infiniti-money/Web-Design/releases/tag/v1.23.0), dung lượng 575.315 byte; SHA-256 `bb0aad6ed4d4f4f13e541917e480574517f911870290580f824b2a9466585f57` khớp `SHA256SUMS.txt` của release.
- Do GitHub runner chậm ở bước cài Chromium, đã chạy bổ sung toàn bộ các script tương đương workflow trên máy Windows hướng vào Pages: `browser-smoke`, `cms-browser-smoke`, `operations-browser-smoke`, `consultation-browser-smoke`, `catalog-browser-smoke`, `home-experience`, `consultation-browser`, `delivery-browser-smoke`, `catalog-public-browser` đều đạt. Hai bộ kiến thức đã chạy riêng và đạt như trên. Dùng Cốc Cốc/Chromium có sẵn; riêng script Delivery được truyền đường dẫn trình duyệt bằng wrapper trong tiến trình, không sửa mã ứng dụng để vượt kiểm tra. Các thao tác ghi dùng fixture chặn API, không ghi Supabase thật. Kết quả chạy trên Windows này được tách khỏi trạng thái workflow GitHub.

## Khắc phục môi trường CI

[Lượt browser CI đầu](https://github.com/infiniti-money/Web-Design/actions/runs/42266699914) hết thời gian 12 phút và bị hủy khi apt tải các gói font từ Ubuntu; các ca kiểm thử chưa bắt đầu. Log xác nhận npm đã cài thành công, không phải lỗi chức năng website. Không ghi lượt này là đạt.

Workflow chuyển sang image chính thức Playwright `v1.64.1-noble`, khóa digest `sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f`; giữ npm Playwright 1.64.1 và nguyên các ca kiểm thử. [Tài liệu chính thức](https://playwright.dev/docs/docker) xác nhận image gồm trình duyệt và thư viện hệ thống; package npm vẫn cài riêng. Bỏ bước apt/download browser lặp lại, giới hạn bước npm 3 phút; thay đổi chính workflow cũng kích hoạt kiểm tra trên website đang chạy. Chờ kết quả lần chạy mới trước khi xác nhận CI được khôi phục.

Kiểm tra tự động không thay thế thử trên thiết bị vật lý hoặc nghiệp vụ thực. Các đầu vào nội dung và UAT doanh nghiệp trong lộ trình vẫn còn mở; chưa có phép đo CWV thực địa mới hoặc bảo đảm Google index.
