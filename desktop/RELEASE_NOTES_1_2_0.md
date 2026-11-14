# ATELIER HOME Manager 1.2.0 — giao diện quản trị đồng bộ website

## Thay đổi
- Dùng chung giao diện web/PC: sidebar điều hành chia nhóm, tìm chức năng Ctrl+K và liên kết trực tiếp tới các module có quyền.
- Trang Tổng quan bổ sung danh mục chức năng dạng thẻ, chia theo tài khoản Admin/Quản lý/Nhân viên. Mọi chức năng mở trang thực, không chỉ thay nhãn.
- Giao diện tối/sáng/theo hệ thống, ghi nhớ trên thiết bị, nút làm mới, thông tin tài khoản và avatar ký tự. Thiết kế co giãn trên màn hình nhỏ.
- Báo cáo nâng cao hiển thị trên menu của Admin/Quản lý; Nhân viên không truy cập màn báo cáo này từ giao diện.
- Chỉ đổi trình bày và điều hướng. Cơ chế xác thực và RLS trên Supabase giữ nguyên; không lưu dữ liệu nghiệp vụ ngoại tuyến.
- Bản Windows đóng gói lại cùng assets như website, giữ `appId`, phiên mã hóa DPAPI, cấu hình Electron sandbox, nguồn update `desktop-stable` và quy trình PDF báo giá.
- Tăng phiên bản từ 1.1.2 lên 1.2.0. Test smoke dùng phiên giả, không đăng nhập tài khoản thật.

## Tiêu chí nghiệm thu
- PR CI (website/role mock/PostgreSQL cách ly/Playwright) thành công.
- Windows workflow: npm ci, desktop security, Electron smoke, Setup và Portable build.
- Sau khi phát hành: kiểm tra feed latest.yml, checksum và nâng cấp thực tế 1.1.2 → 1.2.0 trên máy Windows. Không tự coi đã hoàn tất UAT chỉ vì build thành công.

## Giới hạn
- Chưa nghiệm thu bằng tài khoản nhân viên thật (hiện không có user employee trong Auth).
- Cải thiện RLS 8 policy chỉ là SQL chờ xét duyệt, **không tự triển khai production trong gói giao diện**.
