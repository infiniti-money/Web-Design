# Đồng nhất giao diện công khai và hạn mức trợ lý — v1.28.0

Ngày 08/11/2026. Theo ảnh và yêu cầu chủ website: đổi tên thành **Trợ lý tư vấn thiết kế nội thất**, sửa phông chữ trang dịch vụ và đồng nhất bố cục; chỉ tăng giới hạn theo Free tier thực tế.

## Kiểu chữ và bố cục

Các trang dịch vụ trước đó khai báo DM Sans/Playfair Display nhưng không nạp font; Catalog dùng system font và header khác, còn các trang sinh HTML có khoảng cách/điều hướng riêng. Bản mới dùng Be Vietnam Pro cho nội dung và Playfair Display cho tiêu đề, cùng bộ header/container và breakpoint menu. Phông có các tập ký tự Latin/tiếng Việt, tải từ file WOFF2 local; trang chủ tiếp tục ưu tiên ảnh hero trước khi kích hoạt font, `font-display:swap` và có fallback hệ thống.

Mười file WOFF2 tổng 183.108 byte (nhiều trọng lượng; trình duyệt chỉ tải những face cần dùng). Bản quyền SIL Open Font License được lưu cùng font tại `assets/fonts/`. Nguồn phân phối: Google Fonts CSS API và [kho Google Fonts](https://github.com/google/fonts). Không đưa font thương mại không có giấy phép vào website.

Header chung cho dịch vụ, dự án, Catalog, kiến thức và quyền riêng tư dùng component `scripts/public-shell.cjs`; trang chủ giữ cơ chế menu hiện có nhưng dùng cùng kiểu chữ, chiều cao, lề và nội dung điều hướng. Các trang dưới có hero nền ngà, chữ xanh đậm, heading cân dòng; CTA header giữ chữ trắng. Menu chuyển chế độ cùng breakpoint để tránh chen chữ ở tablet. Màu sắc/spacing chuẩn nằm trong `assets/public-shell.css`.

Giữ Title/Description/canonical/OG, ảnh, URL và toàn bộ đích liên kết/ID cũ. Header bổ sung lối đi, giữ link CTA có ngữ cảnh dịch vụ. Không thay nội dung doanh nghiệp, xuất bản công trình mẫu hoặc di chuyển database. Admin và các luồng thanh toán/tư vấn không đổi.

## Giới hạn theo ảnh AI Studio

Ảnh chủ website cung cấp cho đúng **Gemini 3.5 Flash Lite (Text-out)** cho thấy **15 RPM, 250K TPM, 500 RPD**. Số `19 / 500` là mức sử dụng tại thời điểm chụp, không phải giới hạn 19 lượt. Hạn mức của dòng TTS trong cùng ảnh không áp dụng cho trợ lý văn bản.

- Chốt website mới: tối đa 500 lượt/ngày, 15 lượt/phút và 250.000 token đầu vào/phút.
- Ngày RPD dùng `America/Los_Angeles` (nửa đêm Pacific, có DST) theo [tài liệu Google](https://aistudio.google.com/docs/rate-limits), thay cho ngày Việt Nam của chốt nội bộ cũ.
- Thêm bảo vệ chống lạm dụng 30 lượt/giờ theo mạng; đây là chính sách website, không phải quota mạng do Google công bố.
- Dự trù token dùng độ dài UTF-8 của prompt thực tế, cộng biên và làm tròn lên khối 1.000. Chốt này bảo thủ, có thể chặn trước 15 lượt/phút; không coi đó là số token tính phí chính xác.
- Quota Google tính theo project, dùng chung với các app/key khác. 500 RPD không có nghĩa website còn riêng 500 lượt. Google có thể từ chối sớm hơn; UI không tự retry hoặc tự đổi sang provider/gói trả phí.
- Model được khóa ở model đã xác minh hạn mức; đổi model khác khiến trợ lý tắt cho tới khi có chính sách tương ứng. Giữ Free tier của project, không liên kết billing.

Migration `20261108024335_ai_verified_free_tier_limits.sql` đã áp dụng, thay RPC cũ bằng bản có tham số dự trù token. Số lượt cũ được chuyển thận trọng sang counter mới, không đặt lại sử dụng để lách giới hạn. Không tạo bảng, không tăng quyền anon/authenticated; service_role mới có execute. Kiểm thử SQL cách ly đạt cho 15 RPM, 500 RPD, token quota, rollback khi bị từ chối, giữ sử dụng cũ và giữ counter form liên hệ.

Backend đã triển khai lại và bật `AI_ENABLED=true`. Health trả đúng model, enabled=true, limits=500/15/250000, networkPerHour=30 và resetTimezone=America/Los_Angeles. Frontend chỉ đổi tên, vẫn cần opt-in/Turnstile riêng và không gửi liên hệ tới Gemini. Không coi việc tăng chốt là tăng quota Google.

## Kiểm chứng trước phát hành

144 bài Node: 143 đạt, 1 gửi lead thật bỏ qua; 2/2 an toàn route PC đạt. Public shell browser đi qua tám loại trang ở 1440/1024/390/320 px: header và lề logo thống nhất, không tràn ngang; menu bàn phím; fallback không JS/lỗi font. Chrome DevTools xác nhận glyph thực tế của H1 là Playfair Display và paragraph là Be Vietnam Pro, không chỉ kiểm tra tên font trong CSS. Đã xem ảnh Catalog/dịch vụ/dự án và sửa tương phản chữ CTA.

Catalog động, trang chủ, dự toán và cửa sổ AI vẫn qua các kiểm thử fixture. Đây là responsive QA trên Chromium, không phải chứng nhận mọi trình duyệt/thiết bị. Không ghi lead/giao dịch thật hoặc giải CAPTCHA trong CI. Bằng chứng online được thêm sau khi Actions và Pages hoàn tất.
