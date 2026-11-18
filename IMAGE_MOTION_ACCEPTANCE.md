# Nút và chuyển động ảnh — 18/11/2026

## Nguyên nhân

Ảnh người dùng gửi cho thấy ba CTA màu/kiểu khác nhau và AI opener vẫn là liên kết gạch chân riêng. Reveal v1.29.0 dùng rootMargin +80px và threshold 0 nên hoàn tất trước khi ảnh xuất hiện; hover mới bao phủ một số thẻ dịch vụ, không có hiệu ứng tương ứng khi dùng ngón tay. Đã xem EZVIZ trực tiếp trên browser: một ảnh scaleAni đổi matrix từ none sang scale 1.03 với transition 0.5s khi hover. Chỉ tham khảo hành vi; không sao chép tài nguyên/mã theo dõi của EZVIZ.

## Bản sửa

- Bốn action chung một grid, cùng màu trắng/chữ xanh/radius/font/chiều cao; AI opener giữ ID và handler cũ nhưng chuyển vào cùng nhóm. Mobile hai cột cao 56px, desktop bốn cột cùng chiều cao.
- Action công khai có cùng quy ước nút, icon trước/sau vẫn tròn. Không ép display làm hiện CTA header đã ẩn trên mobile.
- Khung ảnh clip zoom: desktop hover/focus 1.065; vào viewport từ 1.12 về 1 (desktop) hoặc 1.015 (touch), transition 0.85s. IO có ngưỡng 22% và mép viewport âm 6% để người dùng thấy chuyển động. Ảnh ra ngoài rồi trở lại có thể chuyển động lại; ảnh kế tiếp trong rail được quan sát riêng.
- Text reveal chọn từng khối, kích hoạt sau khi vào viewport (rootMargin -8%, threshold .12); không giấu nội dung đầu trang.
- Nhận ảnh tải động qua MutationObserver, không thay URL hoặc thuộc tính img. Exclude hero/gallery ưu tiên và data-comparison để không sai tỷ lệ cặp ảnh thiết kế/thực tế. Không gọi API, không intercept wheel/touchmove, không vòng lặp animation/scroll JS.
- Reduced motion dừng hiệu ứng, giữ ảnh/nội dung; bật lại preference hoặc quay lại BFCache tái quan sát ảnh. Khi JS lỗi, HTML/ảnh gốc vẫn đọc được. CSS/JS query version 1.29.1 tránh cache bản cũ.

## Kiểm chứng cục bộ

- image-motion-browser: cả bốn nút bằng nhau về height/background/color/radius/font/weight tại 320/390/1024/1440. Hover có frame nội suy giữa scale 1 và 1.065, không chỉ kiểm tra tên class.
- Context mobile isMobile+hasTouch xác nhận hover:none. CDP dispatchTouchEvent touchStart/touchMove/touchEnd cuộn dọc: ảnh đi vào viewport và đang nội suy; vuốt ngang làm rail dịch chuyển và ảnh kế tiếp kích hoạt. Cuộn dọc native vẫn hoạt động.
- Không dùng synthesizeScrollGesture làm bằng chứng: trong Edge môi trường này lệnh trả về nhưng không cuộn touch; đã thay bằng chuỗi sự kiện chạm thực tế.
- public-experience, public-shell, navigation, turnkey và AI browser fixtures đạt; không gửi lead/AI/thanh toán thật. Node 175: 174 đạt/1 lead thật bỏ qua.
- Ảnh trước/sau hover và nút: screenshots/image-{before,after}-hover.png, buttons-unified-{desktop,mobile}.png. Video touch local: screenshots/motion-v1291/page@465aba94a9395e39708c2ed4a52621ac.webm. Đây là giả lập browser, chưa phải UAT trên điện thoại vật lý.

CI, Pages và release ghi bổ sung sau triển khai. Không đánh dấu CWV/conversion/UAT tài khoản đạt từ những kiểm thử này.
