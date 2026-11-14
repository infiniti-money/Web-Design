# ATELIER HOME v1.28.4 — quản trị đồng nhất, nghiệm thu vai trò và rà soát RLS

- Không thay đổi giao diện công khai và hero v1.28.3; giữ các URL, SEO, ảnh, CRM và thanh toán.
- Web Admin/Manager: sidebar đa nhóm, mục Báo cáo nâng cao, dashboard launcher, theme sáng/tối/hệ thống, responsive và nút tải lại dữ liệu.
- Tài khoản Nhân viên chỉ được điều hướng đến các khu vực được cấu hình; toàn bộ truy vấn vẫn phải đi qua Supabase RLS.
- Khóa UI Báo cáo nâng cao theo vai trò Admin/Quản lý và profile đang hoạt động (không thay RLS production).
- Browser test 3 vai trò chỉ dùng phiên giả, không phải UAT tài khoản thật; Windows smoke xác minh giao diện dùng chung.
- Phát hiện 8 cảnh báo `auth_rls_initplan`, chuẩn bị SQL `supabase/rls-initplan-review.sql`, xác minh trên PostgreSQL 17 biệt lập; cố ý để ngoài `supabase/migrations` để không tự động áp dụng khi chưa có bản backup mới, kiểm chứng quyền thực và kế hoạch rollback.
- Giữ nguyên 4 RPC SECURITY DEFINER đã kiểm tra role/ACL, không thu hồi `authenticated` tùy tiện. Bật leaked-password protection cần tài khoản quản trị Auth trong Dashboard nếu tính năng được gói cho phép.
