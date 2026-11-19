# Logo ATELIER HOME — 19/11/2026

Nguồn: bộ Atelier_Home_Logo_Package do chủ sở hữu cung cấp. PNG nguồn có nền caro ghép vào pixel, không có alpha thực; PSD nguồn không có cấu trúc layer đọc được. Giữ nguyên bản nguồn ngoài repository.

Đã dùng ImageGen tích hợp (không dùng CLI/API riêng) để tách nền. Prompt chính: “Remove ALL pale gray/white geometric checkerboard background to true transparent alpha. Preserve black roof/house/window/leaf/swooping flourish, taupe calligraphic Atelier and exact Vietnamese slogan: kiến tạo không gian, / nâng tầm cuộc sống. Do not redesign or retypeset.” Lượt chỉnh tiếp theo làm sạch viền quanh nét chữ. Đây là bản xử lý bằng AI, không phải bản vector master hoặc cam kết đồng nhất từng pixel với nguồn.

Tài sản: assets/brand/atelier-logo-transparent.png (1254×1254); favicon.png (64×64); desktop/build/icon.png và icon.ico (256×256). Chuyển kích thước/đóng gói icon bằng System.Drawing, giữ alpha; không vẽ lại hình.

Logo đen đặt trên nền trắng trung tính để đọc được trên thanh bên tối. Header có wordmark HTML bổ trợ ở kích thước nhỏ; bản đầy đủ có slogan tại footer và tài khoản. Không đổi tiêu đề, mô tả, canonical, ảnh nội dung hoặc nguồn dữ liệu.

Kiểm chứng: xem cutout trên nền trắng bằng Chromium; Node 178 đạt/1 bỏ qua có chủ đích; responsive 8 tuyến ×4 kích thước; workspace ba vai trò; Electron sandbox/updater smoke. Phát hành: web 1.33.1, Manager 1.4.1. UAT người dùng thật và nâng cấp trên máy cài thực tế vẫn cần nghiệm thu riêng.

Bản web 512×512: assets/brand/atelier-logo-web.png; giữ bản tách nền 1254×1254 riêng. Header dùng bản web nhỏ để giảm tải.

Sửa lỗi ViewTransition trên Chromium khi scripting:none; kiểm thử Catalog không JavaScript giữ nguyên kiểm tra bàn phím, deep link và lỗi trình duyệt.

## Bằng chứng phát hành

- Commit: 730c324db751111c2ceedfb6d4ed1ce6e30f2871. Validate CI 44511290784, Pages 44511290725, deployed smoke 44511374920 và SEO audit 44511374932 đều thành công.
- Source ZIP v1.33.1: 1cc98d70e9dfab08ee9c2cdea30b6dc55e9a79455e1ee32e64cda12140904776; 426 tệp kiểm tra blob khớp commit, đối chiếu SHA256SUMS và digest GitHub.
- Logo web, bản lớn và favicon trên Pages được tải về so byte khớp tài sản cục bộ. PNG bản lớn có alpha góc bằng 0.
- Kiểm tra trực tiếp homepage, dịch vụ, Catalog, đăng ký, đăng nhập; logo tải đúng, không tràn ngang. Hero ảnh thực sự tải được trên website (ảnh minh họa, không gán thành công trình).
- Lighthouse mobile (artifact public-seo-audit 14524135891): Performance 85, Accessibility 100, Best Practices 100, SEO 100; LCP 3839ms, CLS 0.000197. Chưa đạt mục tiêu LCP <3s; đây là số đo lab riêng, không phải CWV thực địa.
- Chat ba vai trò kiểm thử lại sau tích hợp logo bằng fixture; không gửi tin nhắn thật.

- Windows release job 44511943956 thành công. Tag desktop-v1.4.1 và v1.33.1 cùng trỏ commit 730c324db751111c2ceedfb6d4ed1ce6e30f2871.
- Stable feed xác nhận version 1.4.1; đã tải chính bộ cài từ desktop-stable, đối chiếu 122471390 byte, digest GitHub SHA-256 c820666b5910b49b01aaa20b290c3a1aa3b3816cbf6431b8f1f9ff3564ce7fc9 và SHA-512 trong latest.yml đều khớp.
- Chữ ký bộ cài: NotSigned. Chưa thực hiện cài đè/cập nhật trên máy người dùng thật; xác nhận ở đây là CI, renderer Electron và tính toàn vẹn tệp/feed.

## Prompt ImageGen đã dùng

1. Edit target: the supplied Atelier company logo. Background removal only: remove ALL pale gray/white geometric checkerboard background to true transparent alpha, including enclosed negative spaces. Preserve the exact existing black roof/house/window/leaf/swooping flourish geometry and taupe calligraphic Atelier lettering, all fine strokes and original colors. Preserve the existing two-line Vietnamese slogan verbatim, with every accent: 'kiến tạo không gian,' and 'nâng tầm cuộc sống'. Do not redesign or retypeset anything. Keep the entire logo, no cropped strokes. Output a clean transparent PNG suitable for the existing company website and desktop application. No new text, shadow, texture or border. Trim excessive empty outer margins while leaving comfortable clear space.

2. Clean up this transparent logo cutout only. Remove the stray white/yellow/red speckled pixels and thin light fringes around the taupe script Atelier strokes and inside letter loops. Keep smooth taupe letter strokes, black roof/leaf/swoop and black Vietnamese slogan unchanged. Preserve exact lettering: 'kiến tạo không gian,' / 'nâng tầm cuộc sống'. No added elements. Background must be transparent, including all holes and negative space. Preserve the existing logo shapes, color and composition.
