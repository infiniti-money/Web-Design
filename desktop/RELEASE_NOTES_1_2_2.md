# ATELIER HOME Manager 1.2.2 — Trung tâm nghiệm thu và phục hồi

- Bổ sung `uat.html` (chỉ Admin) vào giao diện Windows và website thống nhất, cập nhật menu và launcher; không thay thông tin phiên DPAPI hiện có.
- Tám cổng nghiệm thu có mô tả và bảng khai thủ công; dữ liệu lựa chọn không lưu qua localStorage và không rời thiết bị. File xuất đặt tên `NOT-VERIFIED` để tránh nhầm là biên bản đã duyệt.
- Giữ Electron sandbox, CSP, route allowlist, bảo vệ Auth và cơ chế cập nhật `desktop-stable`; kiểm thử fixture Admin/Manager/Employee và cài đặt Setup/Portable trên Windows runner.
- Công cụ kiểm tra backup offline chỉ có trong gói nguồn website; không thể tự tạo/khôi phục bản sao production từ ứng dụng Windows.
- Chưa nghiệm thu cài đè 1.2.1 → 1.2.2, DPAPI và tài khoản thật trên máy người dùng; các chốt này vẫn cần người quản trị thực hiện.
