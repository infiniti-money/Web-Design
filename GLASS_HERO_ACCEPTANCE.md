# Kính mờ, ảnh hero và chuyển động chữ — 18/11/2026

## Yêu cầu và nguyên nhân

Người dùng yêu cầu bốn action giống nút Tạm dừng: nền kính/ảnh mờ; rê chuột phải thấy ảnh chuyển động và chữ có hiệu ứng. v1.29.2 chỉ áp dụng zoom cho ảnh dịch vụ/công trình, chủ động loại hero nên chưa đáp ứng phần ảnh đầu trang. Bản này bổ sung trực tiếp vào hero, không tuyên bố hiệu ứng cũ đã giải quyết yêu cầu đó.

## Bản sửa

Bốn nút và gallery controls chung rgba(16,30,25,.45), gradient phản chiếu nhẹ, viền trắng và backdrop-filter blur(8px). Chữ trắng; hover dùng nền đậm hơn để giữ tương phản. Kích thước, radius, grid và ID action giữ như trước. Màu nền đủ tối hỗ trợ đọc chữ trên ảnh.

Hero pointer: ảnh chính và wrapper ảnh phụ scale 1.055, dịch tối đa 14px ngang/10px dọc (giới hạn thêm theo kích thước viewport). Một requestAnimationFrame theo input, không loop liên tục; cache bounding box tới khi leave/resize, không scroll handler. Lớp chữ và nút đứng yên. Reset khi leave, resize, pagehide hoặc đổi reduced-motion/fine-pointer. Không kích hoạt khi video được mở, không chạy theo ngón tay trên coarse pointer. Ảnh vẫn có src/srcset/priority gốc và không bị bọc; carousel pause/next/previous giữ nguyên.

Chữ: CSS opacity/translate, .75–.95 giây cho eyebrow/title/description/actions theo nhịp; nội dung không bị tách thành span hoặc đổi text/heading structure. Các section chọn từng heading/đoạn thay vì fade cả khối. Reduced motion tắt chuyển động; no-JS vẫn có đầy đủ HTML, font và nội dung. Asset query mới 1.29.3 để tránh cache bản trước.

## Kiểm chứng cục bộ

- image-motion-browser đo computed background/color/border/blur của cả bốn nút bằng nút Tạm dừng; blur thực tế 8px, không chỉ kiểm tra tên class.
- Lấy frame nội suy của H1 khi mở trang và H2 khi cuộn tới: opacity nằm giữa hai trạng thái, transform đang dịch.
- Di chuột từ trái sang phải: matrix ảnh scale >1.03 và translation đổi dấu; bounding box chữ trước/sau không đổi. Leave trở về scale 1.
- Bốn nút vẫn đồng nhất tại 320/390/1024/1440; hover ảnh thường, native touch dọc/ngang, reduced motion, ảnh động/cleanup, no-JS/CSS lỗi tiếp tục đạt.
- Public shell/navigation và Node đạt; Node 175: 174 đạt/1 lead thật bỏ qua. Không gọi AI, gửi lead hoặc giao dịch thật trong fixture.
- Xem ảnh thực tế screenshots/glass-hero-{desktop,mobile,pointer}.png. Video desktop có chữ vào trang và pointer: screenshots/glass-v1293/page@0f9836f02043e3e1cccb4450c69d949f.webm. Visual QA đã xem ảnh trước/sau, không thấy lộ mép hoặc tràn ngang.

Đây là kiểm thử browser/viewport mô phỏng, chưa phải nghiệm thu điện thoại vật lý hoặc đo CWV/INP/FPS thực địa. CI/Pages/release bổ sung sau triển khai. Không thay Admin/PC, Supabase hoặc dữ liệu.
