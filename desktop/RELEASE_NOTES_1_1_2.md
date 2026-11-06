# ATELIER HOME Manager 1.1.2

Ngày: 07/11/2026. Bản vá đóng gói giao diện quản trị từ web v1.24, không nâng phiên bản thư viện nền.

- Công trình: xác nhận ID sau lưu/xóa, giữ nội dung khi chưa xác nhận kết quả, khóa thao tác trùng và cảnh báo chưa lưu. Lỗi tải không hiển thị dữ liệu cũ như kết quả hợp lệ.
- Đóng gói các cập nhật CMS, Catalog, Trung tâm vận hành và Điều phối công trình hiện có trên nhánh chính.
- Quyền vẫn kiểm tra tại Supabase: Admin phải còn hoạt động và khớp vai trò Auth hiện tại. Giữ cùng tài khoản và dữ liệu; không đổi vị trí lưu phiên DPAPI.
- Setup tiếp tục dùng kênh `desktop-stable`, chỉ cài sau khi người dùng chọn khởi động lại. Portable cần tải bản mới thủ công.

CI kiểm tra Node, an toàn route/updater, chạy Electron thật với phiên giả và xuất PDF mẫu trước khi đóng gói. Kiểm tra feed/checksum sau phát hành được ghi trong `PROJECT_ADMIN_ACCEPTANCE.md` trên nhánh chính.

Giới hạn: chưa có chứng thư ký mã Windows; chưa nghiệm thu cài đè/nâng cấp trên máy đang có bản cũ hoặc đăng nhập bằng tài khoản nhân viên thật. Không đồng nhất kiểm thử kỹ thuật với UAT doanh nghiệp.
