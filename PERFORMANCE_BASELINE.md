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
