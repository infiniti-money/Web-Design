# ATELIER HOME web v1.28.6 — Trung tâm nghiệm thu và phục hồi

## Bổ sung chức năng
- Trang **Trung tâm nghiệm thu & phục hồi** (`uat.html`) trong sidebar/launcher của **Admin**, không mở cho Quản lý/Nhân viên. Giao diện Việt hóa, responsive, `noindex,nofollow`.
- Tám cổng: backup mới, khôi phục độc lập, Auth/Storage, Employee thật, thu hồi quyền, Windows/DPAPI, leaked password protection, nội dung doanh nghiệp/Search Console/CWV. Bảng khai chỉ tồn tại trong bộ nhớ; khi đăng xuất, thay phiên, mất mạng hoặc ẩn trang thì xóa.
- Đăng nhập và kiểm tra profile phải cùng vai trò **Admin đang hoạt động**; kiểm tra lại trước khi xuất. Tải JSON ghi rõ `OPERATOR_DECLARATION_ONLY` và `NOT_CERTIFIED` — không được gọi là biên bản UAT đã đạt.
- Công cụ offline `node scripts/verify-recovery-evidence.cjs <local-manifest.json>`: đọc file backup tại máy được phép, kiểm SHA-256 streaming, so số dòng nguồn/đích (Auth, Storage, nghiệp vụ), đối chiếu các cổng tự khai và luôn yêu cầu rà soát độc lập. Không kết nối production, không chạy hệ điều hành, không gửi dữ liệu/secrets lên GitHub.

## Bảo toàn
- Không đổi Supabase Auth, RLS, dữ liệu CRM/CMS, khoản thu, Edge Functions, index hoặc chính sách public. Không tạo nhân viên giả hoặc tải dump thật lên CI.
- Giữ nguyên nội dung SEO, công trình và ảnh hiện có; tất cả link nội bộ phiên bản mới vẫn trỏ đến dự án chính.

## Kiểm thử
- Node test: xác minh role Admin, không chứng nhận từ checkbox, kiểm checksum sai, row-count lệch, từ chối trường secret/PII, kiểm gói web/PC.
- Playwright Chromium: Admin được mở trang, tải mẫu khai chưa xác minh, đăng xuất xóa màn hình, Manager bị chặn, responsive mobile.
- CI PostgreSQL 17 isolated, phần mềm Windows Electron smoke + Setup/Portable, GitHub Pages, browser smoke live và SEO audit; GitHub Release chỉ sau kiểm thử trên main.

## Giới hạn nghiệm thu
**Production UAT chưa đạt** cho đến khi có backup mới đã restore độc lập + chứng cứ Auth/Storage, tài khoản Nhân viên thật với từ chối API, và cài nâng cấp Windows trên máy doanh nghiệp. Việc gói Supabase Free chưa bật leaked-password protection vẫn là vấn đề mở. Theo dõi Issues #24 và #29.
