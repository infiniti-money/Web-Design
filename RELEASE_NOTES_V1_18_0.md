# ATELIER HOME web v1.18.0 — Hoàn thiện CRM và nền tảng quản trị

Ngày: 05/11/2026. Phiên bản web dùng tag `v1.18.0`; bản vá PC đi cùng dùng tag riêng `desktop-v1.1.1`.

## Hoàn thiện hạn chế từ v1.5

Tìm khách hàng phía máy chủ hỗ trợ tiếng Việt có dấu/không dấu, chữ hoa/thường và Unicode tổ hợp. Ví dụ nhập `nguyen dang` khớp `Nguyễn Đặng`, `go oc cho` khớp nội dung `gỗ óc chó`. Áp dụng cho tên, số điện thoại, dịch vụ, không gian và nội dung tư vấn. Vẫn phân trang 25 hồ sơ, đếm trên kết quả lọc và kết hợp bộ lọc trạng thái/lịch nhắc/thời gian.

Cột tìm kiếm được sinh tự động từ dữ liệu gốc, không sửa tên/nội dung người dùng; cập nhật cùng hồ sơ. Tất cả truy vấn tiếp tục chịu RLS hiện có. Không thêm RPC đặc quyền hoặc khóa bí mật vào giao diện. Với lượng dữ liệu hiện tại nhỏ, chưa thêm extension/index tìm kiếm; cần đo lại kế hoạch truy vấn khi dữ liệu tăng.

## Tổng hợp phần đã triển khai sau v1.17

- Giao diện quản trị chung với PC: sidebar theo quyền, Ctrl+K, tìm chức năng không dấu, mật độ hiển thị và lọc dự án.
- CMS bài viết: nháp, chờ duyệt, xuất bản/lên lịch, lịch sử, chống ghi đè và xem trước Markdown an toàn.
- Báo giá theo hạng mục, tổng tiền kiểm tra trên máy chủ, xuất PDF theo đúng snapshot được duyệt.
- RPC thương mại/chăm sóc/thông báo kiểm tra vai trò hiện tại, chặn phiên cũ sau thu hồi quyền.
- Pages đóng gói tài nguyên website theo danh sách cho phép; PC có kênh cập nhật riêng. Các phần này đã phát hành ở đợt nâng cấp trước; bản này tập hợp vào lịch sử web, không coi là tính năng vừa viết lại.

## Gói phát hành

Gói `atelier-home-web-v1.18.0-source.zip` lấy từ đúng commit của tag bằng Git archive, gồm mã nguồn đã theo dõi trong Git, thư mục assets, nội dung tĩnh, kiểm thử và migration. Có SHA256SUMS.txt đi cùng. Không có node_modules, tệp môi trường bí mật hoặc bộ cài Windows; tải ứng dụng PC ở release desktop riêng.

ZIP là mã nguồn, không phải bản sao lưu dữ liệu Supabase. Không chạy lại toàn bộ SQL trên database hiện hữu. Migration mới cho tìm kiếm đã được áp dụng ở backend hiện tại; code PC/web cũ vẫn tương thích với cột được bổ sung.

## Kiểm chứng và phần còn chờ

- Node: 63 bài, 62 đạt, 1 bài gửi lead thật bỏ qua có chủ đích.
- Browser smoke: tìm không dấu/Unicode tổ hợp, CRUD/CRM, bộ lọc/phân trang và mobile đạt bằng dữ liệu giả lập.
- SQL rollback: khớp tên/nội dung, tự cập nhật cột sinh, chặn Nhân viên kể cả claim nâng quyền và chặn anon đều đạt; dữ liệu thử rollback.
- Electron smoke trên giao diện mới đạt, gồm mã hóa phiên và xuất PDF.
- Không coi các kiểm thử trên là nghiệm thu đăng nhập bằng tài khoản Nhân viên thực. Email/thông báo đẩy tiếp tục hoãn theo quyết định trước đó. Công trình thật, thông tin pháp lý và quyền ảnh vẫn cần chủ website cung cấp/xác nhận. Xem [theo dõi việc còn thiếu](RELEASE_HISTORY.md).
