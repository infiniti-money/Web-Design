# ATELIER HOME Manager 1.0.0 — báo cáo nền tảng

Đây là kết quả giai đoạn nền tảng trước khi phát hành giao diện 1.1.0. Xem trạng thái nâng cấp và triển khai mới trong [PROFESSIONAL_UPGRADE.md](PROFESSIONAL_UPGRADE.md); các dòng “chưa xuất bản” dưới đây ghi tình trạng ở thời điểm kiểm thử 1.0.0.

## Sản phẩm đã tạo

Ứng dụng Windows x64 dùng cùng tài khoản và Supabase hiện tại với website. Bản Setup hỗ trợ cài đặt theo người dùng, shortcut và cập nhật; bản Portable phục vụ chạy trực tiếp. Giao diện và SDK được đóng gói local; các thao tác đọc/ghi và đăng nhập cần Internet.

- Tổng quan, sidebar theo quyền, tìm nhanh Ctrl+K, menu mobile/bàn phím, trạng thái kết nối.
- Dự án, CRM, ghi chú, lịch nhắc, công việc nhóm/cá nhân, Kanban, nhân sự/tài khoản, catalog và báo cáo giữ luồng nghiệp vụ hiện có.
- Bài viết: nháp → chờ duyệt → xuất bản/lên lịch; lưu trữ, tìm kiếm/phân trang, Markdown xem trước đã làm sạch, metadata SEO/ảnh và xác nhận quyền sử dụng ảnh.
- CMS ghi lịch sử phiên bản; khôi phục thành bản nháp mới. Kiểm tra phiên bản chống ghi đè, khóa biểu mẫu khi đang lưu và bỏ qua phản hồi tải cũ để tránh mất nội dung.
- Báo giá theo hạng mục: đơn vị, số lượng hai chữ số thập phân, đơn giá VND nguyên, giảm trừ, thuế suất do người dùng cung cấp, tổng theo làm tròn VND. Tổng được kiểm tra lại trong PostgreSQL.
- Báo giá in/xuất PDF hiển thị trạng thái nháp/chờ duyệt/phê duyệt và dùng đúng snapshot đã duyệt ở các trạng thái đã duyệt/gửi/chấp nhận. Luồng phê duyệt, căn cứ khách chấp nhận và hợp đồng vẫn được kiểm tra trên máy chủ.

## Tài khoản và an toàn ứng dụng

Admin có quyền quản trị/phê duyệt; Quản lý có công việc nhóm, báo cáo, báo giá và bài nháp/chờ duyệt của mình; Nhân viên có công việc được giao và thông báo theo quyền. Việc ẩn menu không thay thế RLS.

Ứng dụng dùng Electron sandbox + context isolation, tắt Node integration trong renderer, protocol tài nguyên giới hạn, CSP không cho script nội tuyến hoặc eval, IPC chỉ nhận từ trang ứng dụng/top frame đã cho phép. Không đóng gói khóa đặc quyền. Phiên Supabase được lưu bằng `safeStorage`/DPAPI; smoke test xác nhận file lưu không chứa token dạng rõ. Đăng ký và khôi phục mật khẩu mở trên trình duyệt; PC đăng nhập bằng email/mật khẩu.

## Đã triển khai ở backend

Các thay đổi dưới đây là additive trên dự án `mswiegltusllzvuavjdh`:

- CMS `cms_posts` và `cms_post_revisions`, RLS, trigger phiên bản/lịch sử và kiểm tra xuất bản, ngày hiển thị, quyền ảnh.
- Hợp nhất policy SELECT của CMS để tránh nhiều permissive policy cho cùng vai trò.
- Trigger kiểm tra tổng tiền cho báo giá mới có `schema_version: 1`; giữ các báo giá văn bản cũ.
- `commercial_action` lấy quyền từ `private.current_staff_role()`: tài khoản bị thu hồi/đổi quyền không thể dùng JWT và staff profile cũ để tiếp tục thao tác báo giá.
- `care_advance`, `edit_inquiry_care_note`, `generate_task_due_notifications` cũng lấy quyền hiện tại từ máy chủ. Giữ phạm vi cũ: chuyển bước chăm sóc cho Admin/Manager; sửa ghi chú và tạo thông báo đến hạn cho Admin.
- Edge Function `staff-management` v2: tiếp tục yêu cầu JWT và Admin đang hoạt động, thêm Origin `atelier://app` trong allowlist, hỗ trợ xét duyệt đăng ký đã có trong nguồn giao diện.

Không tạo tài khoản/nhân sự thật, không gửi lời mời/email trong kiểm thử. Các test SQL dùng fixture tổng hợp trong transaction và rollback toàn bộ.

Security Advisor vẫn ghi nhận bốn RPC `SECURITY DEFINER` được authenticated gọi có chủ đích; các hàm này kiểm tra quyền hiện tại trước thao tác. Bảng rate-limit private không có policy để chặn truy cập trực tiếp. Cấu hình Auth chưa bật kiểm tra mật khẩu đã rò rỉ; chưa thay đổi thiết lập này trong lần nâng cấp.

## Kiểm thử đã thực hiện

- Node: 60 bài, 59 đạt, 1 test gửi lead tổng hợp bỏ qua.
- Desktop: 4 bài kiểm tra protocol/điều hướng/CSP và trạng thái cập nhật đều đạt.
- Electron smoke: UI local, sandbox/context isolation, không có `require` ở renderer, lưu/đọc/xóa phiên mã hóa, không đọc được file main-process qua protocol, trạng thái cập nhật, xuất PDF native.
- Smoke chạy đạt trên executable trong `desktop/dist/win-unpacked`, không chỉ môi trường phát triển. Cửa sổ được hiển thị trong harness để kiểm tra ảnh giao diện; không thay đổi hành vi bản cài.
- Browser smoke hiện có: chức năng trang chủ và Admin/CRM, bộ lọc, bàn phím, KPI, CSV, mobile, Turnstile giả lập và tình huống API lỗi đều đạt.
- `tests/cms-browser-smoke.cjs`: CMS CRUD/khôi phục, conflict, lưu trễ/khóa điều khiển, phản hồi mở bài sai thứ tự, XSS, Manager/Employee, mobile/drawer, quyền ảnh và báo giá theo hạng mục đều đạt. Toàn bộ request Supabase trong bài này được chặn và giả lập.
- SQL rollback trên Supabase: CMS RLS/phiên bản/lịch sử/lên lịch; đối chiếu làm tròn tổng báo giá với PostgreSQL; thu hồi quyền Auth với JWT/profile cũ đều đạt.
- `tests/staff-rpc-roles-rollback.sql` xác nhận quyền Admin/Manager hợp lệ và từ chối JWT cũ sau khi thu hồi quyền ở cả ba RPC chăm sóc/thông báo; rollback toàn bộ dữ liệu thử.
- Preflight `staff-management` từ Origin desktop trả 204 với đúng allow-origin. Không phát sinh bản ghi CMS từ kiểm thử SQL.
- `git diff --check` và kiểm tra đầu ra trang dự án tĩnh đạt.

Ảnh kiểm thử trong `desktop/test-artifacts` dùng dữ liệu giả lập. Báo cáo này ghi các phép đo/check đã chạy, không coi giả lập updater là kiểm tra hai bản phát hành thực tế.

## Cập nhật và phát hành

Bộ cài đã dựng: `desktop/dist/ATELIER-HOME-Manager-1.0.0-x64-Setup.exe`; bản chạy trực tiếp: `desktop/dist/ATELIER-HOME-Manager-1.0.0-x64-Portable.exe`. SHA-256 đã đối chiếu với `desktop/dist/SHA256SUMS.txt`.

Các migration mới nằm trong `supabase/migrations` và đã được áp dụng trên backend hiện tại. Lịch sử migration cũ chưa được hợp nhất đầy đủ vào thư mục này; cần đối chiếu/baseline lịch sử trước khi dùng `db push` tổng quát ở môi trường khác.

`desktop-release.yml` dựng artifact khi chạy thủ công; tag `desktop-v<version>` mới phát hành version release và cập nhật kênh riêng `desktop-stable`. Binary được tải lên trước metadata để tránh feed trỏ tới file chưa có. Workflow có thể chạy lại khi version release đã tồn tại.

Bản Setup tự kiểm tra và tải phiên bản mới; người dùng chọn lúc cài/khởi động lại. Portable không tự cài. Feed HTTPS và checksum SHA-512 do electron-updater kiểm tra; không nhúng GitHub token vào client.

**Hiện chưa xuất bản GitHub Release hoặc kênh `desktop-stable`.** Do đó kiểm tra cập nhật online sẽ báo kênh chưa sẵn sàng cho đến khi workflow phát hành đầu tiên được chạy. Bản dựng local chưa có chứng thư ký mã Windows. Hướng dẫn cấu hình ký mã và phát hành nằm tại `desktop/README.md`.

Nguồn giao diện web mới chưa được đẩy/deploy, nên GitHub Pages hiện vẫn hiển thị bản đang chạy trước đó. Các trang bài viết mới đọc Supabase trực tiếp; đang giữ noindex cho đến khi có luồng xuất HTML tĩnh phục vụ SEO. Soạn, lưu và xem trước bài viết trong app PC hoạt động từ giao diện đóng gói.
