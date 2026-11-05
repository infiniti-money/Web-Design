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
