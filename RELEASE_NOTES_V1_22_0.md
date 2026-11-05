# ATELIER HOME web v1.22.0 — Catalog công khai, chia sẻ và quyền đọc

Ngày: 06/11/2026. Tiếp tục chặng 2/5 của WEBSITE_ROADMAP.md.

## Chức năng công khai

- Catalog đọc REST bằng publishable key, không tải SDK Auth/Supabase cho trang chỉ đọc và không gửi phiên đăng nhập cá nhân. Chỉ chọn các trường cần hiển thị và lọc published=true.
- Danh sách chỉ gồm mục đã công khai; bỏ 36 mẫu mặc định từng che lỗi API. Không thay nội dung, ảnh hoặc trạng thái mục hiện có. Khi kiểm tra, backend có 1 mục đã công khai; chủ website cần tiếp tục biên tập Catalog thực tế.
- Tìm tiếng Việt không dấu (gồm đ/d), lọc nhóm/phong cách, sắp xếp, hiển thị 12 mục mỗi trang. Bộ lọc/trang được khôi phục qua URL.
- Mỗi mục có đường dẫn `catalog.html?item=<id>`, nút sao chép và ô chọn thủ công nếu Clipboard API không dùng được. Quay lại/Đi tiếp/Escape khôi phục trạng thái và focus. Đây là URL chia sẻ giao diện, chưa phải một trang sản phẩm HTML tĩnh/index SEO độc lập; canonical vẫn là catalog.html.
- Phân biệt tải đang chờ, API lỗi và danh sách trống; có thử lại, không hiển thị số 0 hoặc mẫu minh họa như kết quả tải thành công khi API hỏng. Đọc theo lô 100 hàng, giới hạn an toàn 5.000 hàng và timeout tổng 15 giây; vượt giới hạn hoặc đọc một lô lỗi thì không xuất danh sách không đầy đủ.
- Ảnh chỉ HTTPS không có user/password trong URL; nội dung dùng textContent. Không thêm ảnh, giá, tồn kho hoặc mã sản phẩm giả. Sách mẫu giữ nhãn ý tưởng tham khảo, không biến thành biến thể sản phẩm thật.
- Chuẩn hóa thương hiệu trên đầu trang thành ATELIER HOME.

## Sửa lỗi quyền truy cập đã xác minh

API Catalog trước đó trả 401 do policy SELECT của anon tham chiếu staff_profiles. Migration `20261105125857_catalog_public_read_roles.sql` tách policy theo role: anon chỉ published; authenticated đọc published hoặc Admin hiện hành. Không cấp SELECT staff_profiles cho anon.

Các policy ghi vẫn chỉ Admin, đổi kiểm tra sang private.current_staff_role() để từ chối metadata Auth đã thu hồi dù JWT/profile cũ còn vai trò Admin. Migration đã áp dụng trên backend hiện hữu, không thay bảng/cột hoặc chỉnh dữ liệu Catalog.

## Kiểm chứng

- Node: 88 bài, 87 đạt, 1 bài gửi yêu cầu thật bỏ qua. Hai bài mới kiểm tra public Catalog 200 và staff directory vẫn bị chặn.
- Browser public Catalog bằng fixture: tìm không dấu, lọc/phân trang, tải lại URL, chia sẻ, Back/Forward/Escape/focus, API phân lô, bỏ nháp, ảnh/HTML không an toàn, trạng thái trống/lỗi/thử lại và mobile đều đạt. Không có POST/ghi dữ liệu.
- API thật: projection public Catalog trả 200 với 1 hàng published, thay vì 401 trước đó.
- SQL transaction rollback: anon chỉ đọc public và không đọc staff; Admin còn quyền đọc/ghi; Manager/Nhân viên/claim nâng quyền không sửa được; Admin bị thu hồi Auth không đọc nháp hoặc sửa bằng JWT cũ. Fixture rollback, tổng Catalog vẫn 1 hàng như trước.
- Security Advisor không phát sinh nhóm cảnh báo mới; các cảnh báo RPC đặc quyền có chủ đích/mật khẩu rò rỉ đã tắt và bảng rate-limit private vẫn được theo dõi riêng.

Không phát hành lại ứng dụng PC. Nghiệm thu Catalog bằng tài khoản thật, bổ sung nội dung/ảnh có quyền dùng và trang sản phẩm HTML độc lập vẫn là phần việc tiếp theo.
