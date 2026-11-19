# Hệ thiết kế trung tính — 19/11/2026

Theo phản hồi mới, bỏ xanh–ngà làm palette giao diện. Ba vùng trong ảnh chủ website (cam kết, footer, tư vấn) dùng charcoal; mặt kính sáng trắng khói, chữ graphite, viền/shadow xám, nền kiến trúc cục bộ trung tính. Ảnh nội thất là nguồn màu tự nhiên.

Không dùng CSS filter lên cả trang: đổi trực tiếp màu trong22 stylesheet, CSS nội tuyến, vector backdrop và favicon; giữ màu trạng thái error/warning/success khi có ý nghĩa. Token design-system.css dùng chung public, tài khoản, web quản trị và Manager. Meta theme-color đổi#24262b; mọi metadata SEO khác tiếp tục so chính xác với baseline cũ.

Quản trị: sidebar nổi inset16px, rộng252px, sáng/tối dùng charcoal; header nổi theo cột nội dung; module cards và vùng dữ liệu trắng khói, trạng thái chọn rõ, menu thu gọn và mobile vẫn điều khiển bằng role/inert/focus hiện có. Không thêm quyền hoặc thay dữ liệu.

Kiểm thử: full-canvas18route x4 độ rộng kiểm tra màu khung không còn bias xanh/ngà; workspace kiểm tra sidebar inset mới, palette,3role, dark/mobile/logout; chat kiểm tra3role, retry/XSS/archive/signout; giữ font, bố cục, motion, form và bảo toàn SEO. Ảnh kiểm thử quản trị dùng fixture trong bộ nhớ, không gửi tin production.

Chuẩn bị web1.33.0/PC1.4.0. Bằng chứng CI/Pages/release và checksum bổ sung sau phát hành. UAT tài khoản thật, cài đè và thiết bị vật lý vẫn riêng với fixture.

Đã phát hành tiếp web1.33.1/Manager1.4.1 cùng nhận diện doanh nghiệp. Giao diện trung tính và logo dùng chung đã qua CI 44511290784 và smoke website 44511374920. Bằng chứng/giới hạn hiệu năng ghi trong BRAND_IDENTITY_20261119.md.
