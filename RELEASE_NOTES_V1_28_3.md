# ATELIER HOME web v1.28.3 — ảnh toàn khung và giao diện đa thiết bị

## Giao diện công khai
- Ảnh đầu trang mở rộng tràn ngang màn hình, chiều cao thích ứng với viewport và nội dung; giữ an toàn trên điện thoại nhỏ khi nút CTA dài.
- Chuyển giữa ba ảnh minh họa với hiệu ứng crossfade. Ảnh đầu tiên là ảnh cũ đã công bố; hai cảnh bổ sung dùng lại nguồn ảnh minh họa đã xuất hiện trên website, không giả nhận công trình thật.
- Điều khiển ảnh trước/sau, tạm dừng/tiếp tục tự chuyển, có nhãn và trạng thái hỗ trợ bàn phím/trình đọc màn hình.
- Tự chuyển tắt khi người dùng giảm chuyển động, tiết kiệm dữ liệu, thu nhỏ tab, rời vùng hiển thị hoặc tương tác với nội dung. Các ảnh không cần thiết không tải từ lúc bắt đầu.
- Khi ảnh bổ sung hoặc JavaScript không tải, ảnh chính/tiêu đề/nút tư vấn vẫn sử dụng được.

## Bảo toàn hệ thống
- Giữ URL, canonical, title, description, Open Graph, JSON-LD, H1, ảnh gốc ưu tiên cao, biểu mẫu và các tuyến CRM/Supabase, payOS, Windows.
- Không thay đổi database, RLS, API hay cấu hình tài khoản.
- Thêm hồi quy Node và Chromium đa độ phân giải (320, 390, 768, 1024, 1440, 1920 px), kiểm tra bàn phím, giảm chuyển động và không JavaScript. Chạy trong CI và sau Pages deploy.
- Cần xem báo cáo Lighthouse sau triển khai: không suy ra cải thiện Core Web Vitals/SEO chỉ từ thay đổi giao diện.

## Tiêu chí phát hành
- Validate ATELIER HOME (Node, PostgreSQL biệt lập, Playwright) thành công.
- Pages deploy, browser smoke, kiểm toán Public SEO sau deploy thành công.
- Nghiệm thu tiếp trên thiết bị thật: iOS Safari, Android Chrome, Windows Chrome/Edge và màn hình ngang.
