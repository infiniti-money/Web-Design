# ATELIER HOME web 1.29.1

Đồng bộ bốn nút đầu trang (gồm Trợ lý tư vấn thiết kế nội thất): cùng màu, bo góc, kiểu chữ và chiều cao; lưới bốn cột desktop, hai cột mobile. Chuẩn hóa nút hành động công khai, giữ nhóm nút mũi tên dạng tròn.

Bổ sung khung ảnh có zoom khi hover/focus và chuyển động khi ảnh vào viewport, bao gồm vuốt ngang trên mobile. Kích hoạt trong vùng nhìn thấy, không chạy sớm trước khi người dùng thấy ảnh. Hỗ trợ ảnh tải động, giảm chuyển động và Back/Forward; không chặn touch/wheel. Không áp dụng zoom cho ảnh hero ưu tiên hoặc cặp ảnh so sánh cần giữ chính xác.

Kiểm thử mới đo kích thước/màu/chữ cả bốn nút và nội suy transform thực tế; dùng touchStart/touchMove/touchEnd để kiểm tra cuộn dọc/vuốt ngang. Không đổi URL, nội dung, ảnh nguồn, API hoặc dữ liệu. Xem IMAGE_MOTION_ACCEPTANCE.md.

Bổ sung cleanup observer khi thẻ động bị xóa, gom thao tác layout lúc tạo khung ảnh và ẩn gallery controls ngay từ HTML tới khi JavaScript sẵn sàng (kể cả CSS tải chậm hoặc bị chặn).
