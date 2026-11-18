# ATELIER HOME 1.30.0 — Kính mờ và cộng tác

- Đồng bộ kính mờ, cảnh nền ảnh, nút và độ tương phản trên website; ảnh bài viết dùng cover đã cấu hình, rê chuột vào cả thẻ/tên bài sẽ phóng ảnh. Giữ title, description, canonical, URL, ảnh và dữ liệu cũ. Tôn trọng reduced-motion.
- Chat nội bộ trong quản trị: chat riêng/nhóm tối đa 20 người, danh sách chưa đọc, phân trang, cập nhật trực tiếp và kiểm tra định kỳ 15 giây, soạn văn bản tối đa 4000 ký tự, lưu trữ nhóm, quản lý thành viên bởi người tạo. Gửi lại sau mất phản hồi dùng mã chống trùng trong phiên. Bản đầu chưa hỗ trợ tệp đính kèm, sửa/xóa tin hay thông báo đẩy.
- Chăm sóc khách: mở hộp thư nhân viên tawk.to bên ngoài; đăng nhập và lời mời agent tại nhà cung cấp. Không nhúng visitor widget làm giao diện nhân viên, không đồng bộ hội thoại khách vào Supabase.
- Migration chỉ thêm ba bảng chat và RPC theo membership; RLS chặn đọc ngoài nhóm, không cho browser ghi bảng trực tiếp, phiên đã thu hồi/hết hạn không truy cập. Không đổi schema/RLS nghiệp vụ hoặc tài khoản cũ.
- Shared UI được đóng gói vào Manager 1.3.0; cập nhật tự động vẫn yêu cầu người dùng chọn cài khi tải hoàn tất.

Kiểm thử fixture/SQL cách ly không thay thế nghiệm thu tin nhắn qua hai tài khoản thật, quyền agent tawk.to, cài đè PC hoặc thiết bị di động vật lý. Xem CHAT_RUNBOOK.md và BACKUP_RESTORE_EVIDENCE_20261118.md.
