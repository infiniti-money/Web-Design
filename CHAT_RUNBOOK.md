# Chat nội bộ và chăm sóc khách

Mở chat.html từ menu Cộng tác trong quản trị hoặc Manager 1.3.0. Admin/Quản lý/Nhân viên phải có staff_profiles đang hoạt động, role khớp Auth app_metadata và phiên Auth còn tồn tại. Tạo chat riêng bằng một người nhận và tên trống; tạo nhóm bằng tên và người nhận. Tối đa 20 người gồm người tạo; tối đa 10 hội thoại mới/ngày/người; một tin/giây trong mỗi phòng. Danh bạ tối đa 500 người, danh sách 200 hội thoại; giao diện thông báo nếu chạm giới hạn.

Chỉ thành viên được xem phòng/tin; Admin không tự đọc tất cả hội thoại. Người tạo quản lý tên/thành viên/lưu trữ; thêm thành viên cho phép đọc lịch sử đầy đủ. Chưa có cơ chế lưu giữ/xóa tin tự động, tệp đính kèm hoặc truy xuất pháp lý. Nội dung văn bản thuần, không chia sẻ khóa, mật khẩu hay thông tin nhạy cảm không cần thiết.

Tin soạn chỉ trong bộ nhớ tab, không lưu localStorage; mất phản hồi giữ nội dung để chủ động gửi lại với cùng client_message_id. Đổi nội dung tạo mã mới; đóng trang làm mất bản nháp/mã retry, cần kiểm tra lịch sử trước khi gửi lại. Không tự động gửi lại. Realtime có dự phòng đọc mỗi 15 giây khi trang hiện và có mạng; không phải trạng thái online của đồng nghiệp. Không hiển thị thông báo gửi thành công nếu thiếu xác nhận ID.

Tab Chăm sóc khách mở https://dashboard.tawk.to/ bằng trình duyệt bên ngoài, không iframe. Chủ property mời nhân viên trong tawk.to và cấp quyền thích hợp; quyền website không cấp quyền provider. Lịch sử khách vẫn nằm tại tawk.to.

Nghiệm thu thật còn cần: hai tài khoản ở hai trình duyệt gửi/nhận, thu hồi thành viên/quyền/phiên và kiểm tra mất quyền; chủ property xác minh agent trả lời khách; cài đè Manager cũ và kiểm tra phiên DPAPI. Các bộ fixture không gửi tin vào production và không chứng nhận những mục này.

Rollback giao diện: triển khai lại tag web/desktop trước; giữ ba bảng chat để bảo toàn tin phát sinh. Không DROP bảng sau khi có dữ liệu. Nếu cần dừng chat, tạm gỡ điều hướng và thu hồi EXECUTE/SELECT bằng migration riêng được đánh giá, không sửa policy nghiệp vụ. SQL fixture tests/chat-isolated.sql chỉ chạy database trống cách ly.
