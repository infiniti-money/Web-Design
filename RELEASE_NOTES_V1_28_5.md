# ATELIER HOME web v1.28.5 — Báo cáo nâng cao an toàn và quản trị nhất quán

## Chức năng mới
- Báo cáo nâng cao dùng chung web/Windows Manager: **Làm mới và xác minh quyền**, lọc 7/30 ngày, trạng thái **Tất cả / Đang xử lý / Quá hạn / Hoàn thành**, tìm công việc không dấu và xuất CSV tương thích Excel.
- Xác minh lại **Supabase Auth, `app_metadata.role`, staff profile active và role khớp** trước và sau khi tải dữ liệu; chỉ Admin/Manager được phép xem. Mọi truy vấn vẫn chịu Supabase RLS.
- Khi **đăng xuất, đổi tài khoản/token, mất mạng, tab bị ẩn**, dữ liệu/các nút xuất cũ bị xóa và phản hồi muộn không được vẽ lại. Timeout 15 giây và cho phép Làm mới để khôi phục.
- CSV **chặn formula injection** kể cả khi trước công thức có khoảng trắng/tab, có BOM UTF-8 và trích dẫn đúng dấu ngoặc kép. Xác minh lại quyền trước khi xuất. Khi chạm giới hạn 500 dòng, **khóa xuất** để tránh tạo báo cáo không đầy đủ.
- Trang báo cáo dùng HTML semantic, `aria-live`/`aria-busy`, bàn phím và bố cục mobile; giữ noindex/nofollow.

## Giữ nguyên
- Không đổi ảnh/metadata, đường dẫn website, Catalog, công trình, thanh toán, CRM hoặc nội dung khách hàng.
- Không thêm bảng hoặc migration mới; 8 RLS initPlan đã được triển khai độc lập, **không chạy lại trong đợt này**; không tự thêm 17 index thiếu.
- Không bật thanh toán hoặc gửi email ngoài quy trình hiện hữu.

## Kiểm thử, phát hành
- Node regression cho quyền 3 vai trò, đổi role giữa truy vấn, timeout/hủy, lọc/tính tổng, CSV chống công thức; Playwright browser mock cho báo cáo/lọc, sign-out, stale data và mobile; Windows Electron smoke, PostgreSQL 17 isolated và GitHub Pages browser smoke.
- Gộp chỉ sau khi CI PR xanh; xác minh GitHub Pages + website `release.json` revision; GitHub Release web độc lập nếu hỗ trợ.
- **Không coi fixture là UAT thật:** còn thiếu backup/restore cô lập, kiểm tra Employee thật, cài đè Windows 1.2.0→1.2.1 trên máy thật và bật Supabase Auth leaked-password protection (cần gói hỗ trợ). Xem Issue #24/#29.
