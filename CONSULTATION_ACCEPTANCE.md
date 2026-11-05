# Nghiệm thu luồng tư vấn — v1.21.1

| Trường hợp | Hành vi | Kiểm chứng |
| --- | --- | --- |
| Bắt đầu từ CTA dịch vụ | Dịch vụ tương ứng được chọn trên trang chủ | Browser smoke hiện có; không gửi thật |
| Gửi đang chờ | Khóa trường và nút gửi; chỉ một POST | Fixture trình duyệt đạt |
| HTTP thành công + ok:true | Xóa nội dung, hiện xác nhận, ngăn gửi lặp | Fixture đạt, đã xem giao diện mobile |
| Gửi yêu cầu khác | Mở biểu mẫu mới, focus tên, xác minh lại | Fixture đạt |
| Sai dữ liệu/xác minh | Giữ thông tin và đồng ý; cho xác minh lại | Fixture 400/403 đạt |
| Giới hạn gửi | Giữ thông tin; áp dụng Retry-After nếu trình duyệt đọc được | Fixture đạt; backend hiện không có header này |
| Lỗi 503/mạng/JSON hỏng | Không báo thành công, không tự POST lại, không khẳng định chưa ghi | Fixture đạt |
| Chờ quá 15 giây | Hủy chờ phía client, thông báo trạng thái chưa xác nhận | Đồng hồ giả lập trình duyệt đạt |
| Widget tải lỗi | Có nút thử lại; chưa xác minh thì không gửi được | Fixture đạt |
| Mobile | Không tràn ngang; CTA nổi không che khu vực liên hệ | Viewport 390px đạt, chưa thay thế thiết bị thật |

Không có lưu bản nháp chứa thông tin cá nhân trên ổ đĩa trình duyệt trong luồng LIVE. Nội dung được giữ trong trang đang mở khi có lỗi; tải lại/đóng tab có thể mất nội dung chưa gửi. Khi không nhận xác nhận, liên hệ doanh nghiệp trước khi gửi lại để tránh trùng; giao diện không có bằng chứng chắc chắn máy chủ đã rollback.

## Nghiệm thu cần doanh nghiệp

- Thực hiện một yêu cầu hợp lệ do chủ website chỉ định, kiểm tra nó có trong CRM và người phụ trách liên hệ được.
- Kiểm tra trên điện thoại thật, mạng di động và trình đọc màn hình đang sử dụng.
- Xác nhận thông tin liên hệ, khung giờ tiếp nhận và quy trình phản hồi nội bộ.
- Chỉ bật email/thông báo khi được yêu cầu và đã cấu hình nhà cung cấp; không suy ra việc gửi thư từ thông báo thành công trên web.
