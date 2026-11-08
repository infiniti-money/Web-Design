# Đo cập nhật — 08/11/2026

Ba lần đo liên tiếp trên trang chủ online revision `0706a8adbce5e9f69bd16795b6c70122e1372079`, trước đợt Catalog v1.25. Lighthouse 13.6.0, Microsoft Edge/Chromium 157 headless trên Windows, mobile mặc định (throttling mô phỏng). Dùng profile kiểm thử riêng, không đăng nhập. Trang chủ không được sửa trong đợt Catalog; các số này là phép đo lại, không phải bằng chứng cải thiện nhờ thay đổi lần này.

| Lần | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 95 | 100 | 100 | 100 | 1,46 s | 2,93 s | 39 ms | 0 |
| 2 | 95 | 100 | 100 | 100 | 1,06 s | 2,26 s | 225 ms | 0 |
| 3 | 98 | 100 | 100 | 100 | 1,08 s | 2,26 s | 59 ms | 0,00075 |

Trung vị LCP 2,265 giây, Performance 95. Chưa có số CWV thực địa, INP từ người dùng thật hoặc Search Console. Không cam kết mọi mạng dưới 3 giây; TBT và tốc độ tài nguyên ngoài còn dao động. Báo cáo HTML/JSON local: `dist/audits/home-2026-11-08-{1,2,3}.report.*`. Điểm tổng hợp không thay thế nghiệm thu bàn phím, người dùng có nhu cầu truy cập đặc biệt hoặc kiểm chứng dữ liệu doanh nghiệp.

Workflow Public SEO audit mới đo lại Lighthouse mobile trang chủ hàng ngày và sau triển khai không theo lịch, giữ báo cáo 14 ngày. Mỗi lần CI là một mẫu lab để theo dõi xu hướng; không đặt chốt tốc độ tuyệt đối theo một mẫu. Các bản ghi bên dưới là lịch sử.

---

# Đo kiểm ban đầu — 05/11/2026

Nguồn giao diện online: `4f3c9e4aeab4c0bcb40edbf2deed232f217f1c92`. Lighthouse 13.6.0, chạy CLI trên máy hiện tại bằng Chromium/Cốc Cốc, cấu hình mobile mặc định. Mỗi URL đo một lần; số đo phụ thuộc máy, mạng và tài nguyên ngoài. Không phải dữ liệu CWV thực địa hay bảo đảm thứ hạng Google.

| Trang | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Trang chủ](https://infiniti-money.github.io/Web-Design/) | 94 | 100 | 100 | 100 | 2,0 giây | 2,8 giây | 0 ms | 0,002 |
| [Kiến thức](https://infiniti-money.github.io/Web-Design/kien-thuc.html) | 100 | 100 | 100 | 100 | 1,0 giây | 1,0 giây | 0 ms | 0 |

HTML/JSON đầy đủ lưu local trong `dist/audits/home.report.*` và `dist/audits/knowledge-index.report.*`; không đưa báo cáo sinh tự động vào Git.

## Việc tối ưu tiếp theo

1. Trang chủ: CSS phông chữ bên ngoài là tài nguyên chặn render; so sánh font local/hệ thống hoặc tải không chặn rồi kiểm tra lại font tiếng Việt và CLS.
2. Ảnh trang chủ: Lighthouse báo khả năng giảm khoảng 82 KiB trong lần đo; điều chỉnh chất lượng/kích thước dựa trên hình thực tế, kiểm tra lại chất lượng ảnh và LCP.
3. Nhãn truy cập: audit label-content-name-mismatch chỉ ra logo và thẻ dự án có nhãn không bao quát toàn bộ chữ nhìn thấy. Dù điểm Accessibility tổng hợp là 100, cần sửa/kiểm tra mục này riêng; không coi điểm 100 là hết mọi vấn đề.
4. Cache tài nguyên chịu một phần giới hạn GitHub Pages; chưa thay hostname/domain đã được chọn chỉ để cải thiện một chỉ số.
5. Thiết lập Search Console/CWV khi chủ tài khoản cấp quyền; đo xu hướng và dữ liệu truy cập thực trước khi kết luận hiệu suất dài hạn.

## Kiểm chứng chức năng ngoài Lighthouse

68 bài Node: 67 đạt, 1 bài gửi lead thật bỏ qua có chủ đích. Kiểm thử Chromium trực tiếp trên website: danh mục và ba bài hiển thị khi JavaScript tắt, schema có trong HTML, menu mobile hoạt động, không tràn ngang và URL bài viết cũ chuyển đúng. Các kiểm thử CMS/CRM ghi dữ liệu dùng fixture, không ghi hồ sơ khách thật.

## Đợt v1.20 — tiếp tục lộ trình

Nguồn đang chạy: `9d338249fc0aae4147a815c7e80297fe5b43d8b4`. Đo online Lighthouse 13.6.0, mobile mặc định, một lần sau triển khai ngày 05/11/2026:

| Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 93 | 100 | 100 | 100 | 1,7 giây | 3,0 giây | 80 ms | 0,001 |

Đã đóng hai vấn đề cụ thể: danh sách render-blocking không còn CSS phông chữ; audit label-content-name-mismatch đạt. Hero/CDN giảm mức chất lượng, thẻ dự án có srcset/sizes, giao diện đã kiểm tra ảnh và phông chữ trên máy tính/điện thoại. Trường hợp không tải được font vẫn có font hệ thống. Khi JavaScript tắt, biểu mẫu API được ẩn và hiện email liên hệ sẵn có.

Điểm 93 không được coi là cải thiện so với 94 ở lần trước. FCP và CLS lần này tốt hơn, LCP/TBT kém hơn; chưa đủ mẫu để kết luận tốc độ ổn định. So sánh đối chứng local cùng máy cho kết quả 88 → 90, LCP 3,5 → 3,4 giây, nhưng cũng chỉ một mẫu mỗi bản. Báo cáo đầy đủ: `dist/audits/home-control-local.report.*`, `home-optimized-local-final.report.*`, `home-v1-20-online.report.*`.

Nhóm thử nghiệm agentic-browsing vẫn 50, audit accessibility-tree còn mở dù nhãn đã sửa; không suy rộng điểm Accessibility 100 thành mọi nhu cầu truy cập đều hoàn hảo. Tiếp tục ưu tiên đường tải ảnh/LCP, cân nhắc font tự lưu hoặc tải hệ thống sau khi so sánh chữ tiếng Việt và bố cục. Cache Pages và CWV thực địa/Search Console vẫn còn theo dõi.

70 bài Node: 69 đạt, 1 bài gửi lead thật bỏ qua. Home experience kiểm tra font/cached stylesheet/lỗi mạng, ảnh responsive, nhãn, bàn phím, mobile và liên hệ không JavaScript đạt. Browser smoke hiện có cũng đạt; ghi thử CRM/form dùng fixture.

Bằng chứng CI: [triển khai Pages](https://github.com/infiniti-money/Web-Design/actions/runs/41942318389), [kiểm thử sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/41942382336), [gói web v1.20.0](https://github.com/infiniti-money/Web-Design/actions/runs/41942326763) đều thành công. Các cập nhật tài liệu sau đó không thay đổi artifact giao diện.

## Đợt giao diện trọn gói v1.26 — 08/11/2026

Ba lần đo trang chủ online sau khi giao diện mới được triển khai. Mã giao diện `26e687b28e0a8131d920543ea29ad51ac8dc1806`; commit `66a270a87ac63a1807eabf8de24ed80760b2e1ea` tiếp theo chỉ sửa kiểm thử, không sửa giao diện. Lighthouse 13.6.0, Edge 157 headless, mobile mặc định, cùng máy và ba lần liên tiếp.

| Lần | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 87 | 100 | 100 | 100 | 1,57 s | 3,26 s | 248 ms | 0 |
| 2 | 98 | 100 | 100 | 100 | 1,14 s | 2,23 s | 112 ms | 0 |
| 3 | 96 | 100 | 100 | 100 | 1,16 s | 2,23 s | 188 ms | 0,00077 |

Trung vị LCP 2,227 giây, Performance 96. **Một lần vượt 3 giây**, nên chưa thể coi mục tiêu dưới 3 giây là ổn định. Không suy diễn cải thiện dài hạn so với mẫu trước, không có dữ liệu CWV thực địa/INP. Giữ ảnh hero và metadata cũ; video không có nguồn và không tải lúc vào trang. Giao diện thêm CSS/JS nhỏ, không thêm framework hoặc thư viện animation. Hướng tiếp tục là theo dõi tài nguyên ngoài, cache và chi phí khởi tạo trên các mẫu độc lập, chưa đổi hostname hoặc dữ liệu để chạy theo một lần đo.

Báo cáo local `dist/audits/home-v1-26-2026-11-08-{1,2,3}.report.*`. Kiểm toán online 31 trang: 12 URL trong sitemap, 0 P1, 1 P2 robots gốc. Đây là kiểm toán cấu trúc/cú pháp JSON-LD và liên kết, không phải xác nhận Google index hay Rich Results Test.

## Font và bố cục v1.28 — 08/11/2026

Đo online revision `ba69055e6f5bb1df37be3bfa10fe4e357be57b07`, Lighthouse 13.6.0/Edge 157 headless, mobile mặc định, ba lần liên tiếp trên cùng máy.

| Lần | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 91 | 100 | 100 | 100 | 1,54 s | 2,406 s | 265 ms | 0 |
| 2 | 94 | 100 | 100 | 100 | 1,38 s | 2,238 s | 242 ms | 0 |
| 3 | 95 | 100 | 100 | 100 | 1,33 s | 2,250 s | 216 ms | 0 |

Trung vị LCP 2,250 giây, Performance 94. Cả ba mẫu dưới 3 giây; không phải cam kết cho mọi mạng hoặc dữ liệu CWV thực địa. TBT vẫn đáng theo dõi, không khẳng định điểm tổng thể cải thiện so với v1.26. Phông local có Vietnamese subsets và giấy phép; bộ font gồm 183.108 byte, chỉ tải face đang dùng. Trang chủ giữ chiến lược ưu tiên ảnh trước font. Báo cáo local: `dist/audits/home-v1-28-2026-11-08-{1,2,3}.report.*`.
