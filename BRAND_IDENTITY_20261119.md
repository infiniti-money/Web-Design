# Logo ATELIER HOME — 19/11/2026

Nguồn: bộ Atelier_Home_Logo_Package do chủ sở hữu cung cấp. PNG nguồn có nền caro ghép vào pixel, không có alpha thực; PSD nguồn không có cấu trúc layer đọc được. Giữ nguyên bản nguồn ngoài repository.

Đã dùng ImageGen tích hợp (không dùng CLI/API riêng) để tách nền. Prompt chính: “Remove ALL pale gray/white geometric checkerboard background to true transparent alpha. Preserve black roof/house/window/leaf/swooping flourish, taupe calligraphic Atelier and exact Vietnamese slogan: kiến tạo không gian, / nâng tầm cuộc sống. Do not redesign or retypeset.” Lượt chỉnh tiếp theo làm sạch viền quanh nét chữ. Đây là bản xử lý bằng AI, không phải bản vector master hoặc cam kết đồng nhất từng pixel với nguồn.

Tài sản: assets/brand/atelier-logo-transparent.png (1254×1254); favicon.png (64×64); desktop/build/icon.png và icon.ico (256×256). Chuyển kích thước/đóng gói icon bằng System.Drawing, giữ alpha; không vẽ lại hình.

Logo đen đặt trên nền trắng trung tính để đọc được trên thanh bên tối. Header có wordmark HTML bổ trợ ở kích thước nhỏ; bản đầy đủ có slogan tại footer và tài khoản. Không đổi tiêu đề, mô tả, canonical, ảnh nội dung hoặc nguồn dữ liệu.

Kiểm chứng: xem cutout trên nền trắng bằng Chromium; Node 178 đạt/1 bỏ qua có chủ đích; responsive 8 tuyến ×4 kích thước; workspace ba vai trò; Electron sandbox/updater smoke. Phát hành: web 1.33.1, Manager 1.4.1. UAT người dùng thật và nâng cấp trên máy cài thực tế vẫn cần nghiệm thu riêng.

Bản web 512×512: assets/brand/atelier-logo-web.png; giữ bản tách nền 1254×1254 riêng. Header dùng bản web nhỏ để giảm tải.

Sửa lỗi ViewTransition trên Chromium khi scripting:none; kiểm thử Catalog không JavaScript giữ nguyên kiểm tra bàn phím, deep link và lỗi trình duyệt.
