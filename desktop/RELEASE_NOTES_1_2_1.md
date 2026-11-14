# ATELIER HOME Manager 1.2.1 — Báo cáo nâng cao và an toàn phiên

- Đóng gói giao diện web v1.28.5 dùng chung: Báo cáo nâng cao có tìm kiếm không dấu, lọc thời gian/trạng thái, làm mới, xuất CSV có bảo vệ injection.
- Đổi/thu hồi phiên, đăng xuất, mất mạng hoặc tab bị ẩn đều xóa số liệu cũ; kiểm tra Auth & role trước/sau tải và ngay trước khi xuất.
- Giữ Electron `appId=home.atelier.manager`, sandbox, preload API, DPAPI, auto-updater stable, trang in PDF, dữ liệu cài đặt và shortcut hiện hữu.
- Không thêm quyền truy cập, DB schema hoặc service role key; vẫn dùng chính sách RLS hiện có.
- Quy trình: Node + Playwright + Electron smoke thực tế trong GitHub Windows runner, build Setup/Portable x64, kiểm tra checksum/feed từ Release.
- **Phải nghiệm thu nâng cấp 1.2.0→1.2.1 trên máy người dùng** trước khi khẳng định bảo toàn thông tin đăng nhập mã hóa DPAPI. UAT ba vai trò thật và backup/restore production vẫn là cổng riêng.
