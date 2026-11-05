# ATELIER HOME web v1.21.0 — Hoàn thiện luồng tư vấn

Ngày: 05/11/2026. Tiếp tục chặng 4 trong WEBSITE_ROADMAP.md. Đây là thay đổi giao diện website; không thay schema, Edge Function hoặc phiên bản ứng dụng PC.

## Hành vi mới

- Khóa các trường trong lúc gửi, có aria-busy và trạng thái chờ. Ngăn gửi lặp từ cùng biểu mẫu khi đang chờ hoặc đã xác nhận thành công.
- Chỉ xóa nội dung khi máy chủ trả HTTP thành công và JSON `ok:true`. Sau đó hiển thị xác nhận, ẩn các trường cũ và có nút “Gửi yêu cầu khác”, trả focus về trường tên khi bắt đầu lại.
- Lỗi kiểm tra dữ liệu, xác minh, giới hạn gửi và lỗi máy chủ đều giữ nội dung/đồng ý người dùng trong biểu mẫu hiện tại. Không lưu thêm thông tin khách hàng vào localStorage/sessionStorage.
- Sau 25 giây không nhận được xác nhận, dừng chờ phía trình duyệt, giữ nội dung và nói rõ yêu cầu có thể đã được tiếp nhận. Không khẳng định “chưa lưu” khi mạng/biên nhận lỗi, không tự gửi lại. Đây không phải cơ chế idempotency phía máy chủ và không đảm bảo chặn trùng giữa nhiều tab/thiết bị.
- Nút thử lại xác minh khôi phục sau lỗi tải widget/hết hạn. Callback xác minh không xóa thông báo lỗi gửi yêu cầu. Vẫn bắt buộc token hợp lệ do máy chủ kiểm tra.
- Nếu có Retry-After đọc được từ phản hồi, chờ đúng thời gian đó; khi không có header thì không tự đoán hạn đếm ngược. Giới hạn thật tiếp tục do máy chủ thực thi.
- CTA nổi ẩn khi khu vực liên hệ xuất hiện trong màn hình để tránh che biểu mẫu/xác nhận trên điện thoại. Styles của luồng tư vấn tải không chặn hiển thị ban đầu.

## Kiểm thử và giới hạn

- Node: 70 bài, 69 đạt, 1 bài ghi lead thật chủ động bỏ qua.
- Browser smoke hiện có đạt với gửi form/CRM giả lập và API công khai chỉ đọc.
- `tests/consultation-browser.cjs` đạt: phản hồi chậm, khóa trường, gửi lặp, xác nhận/bắt đầu lại, lỗi 400/403/503, mất mạng, JSON hỏng, timeout, Retry-After, tải lại captcha, giữ nội dung/consent, focus/mobile và CTA. Tất cả POST được chặn và giả lập; không ghi hồ sơ khách hàng thật.
- Không gửi email/thông báo đẩy, không thử nghiệm với số điện thoại thật. Nghiệm thu trên điện thoại thật và cuộc gọi tiếp nhận của doanh nghiệp vẫn còn mở. Đây là hoàn thiện chức năng/kiểm thử, chưa phải chứng minh tăng tỷ lệ chuyển đổi thực tế.
