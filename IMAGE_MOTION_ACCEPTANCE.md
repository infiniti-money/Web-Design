# Nút và chuyển động ảnh — 18/11/2026

## Nguyên nhân

Ảnh người dùng gửi cho thấy ba CTA màu/kiểu khác nhau và AI opener vẫn là liên kết gạch chân riêng. Reveal v1.29.0 dùng rootMargin +80px và threshold 0 nên hoàn tất trước khi ảnh xuất hiện; hover mới bao phủ một số thẻ dịch vụ, không có hiệu ứng tương ứng khi dùng ngón tay. Đã xem EZVIZ trực tiếp trên browser: một ảnh scaleAni đổi matrix từ none sang scale 1.03 với transition 0.5s khi hover. Chỉ tham khảo hành vi; không sao chép tài nguyên/mã theo dõi của EZVIZ.

## Bản sửa

- Bốn action chung một grid, cùng màu trắng/chữ xanh/radius/font/chiều cao; AI opener giữ ID và handler cũ nhưng chuyển vào cùng nhóm. Mobile hai cột cao 56px, desktop bốn cột cùng chiều cao.
- Action công khai có cùng quy ước nút, icon trước/sau vẫn tròn. Không ép display làm hiện CTA header đã ẩn trên mobile.
- Khung ảnh clip zoom: desktop hover/focus 1.065; vào viewport từ 1.12 về 1 (desktop) hoặc 1.015 (touch), transition 0.85s. IO có ngưỡng 22% và mép viewport âm 6% để người dùng thấy chuyển động. Ảnh ra ngoài rồi trở lại có thể chuyển động lại; ảnh kế tiếp trong rail được quan sát riêng.
- Text reveal chọn từng khối, kích hoạt sau khi vào viewport (rootMargin -8%, threshold .12); không giấu nội dung đầu trang.
- Nhận ảnh tải động qua MutationObserver, không thay URL hoặc thuộc tính img. Exclude hero/gallery ưu tiên và data-comparison để không sai tỷ lệ cặp ảnh thiết kế/thực tế. Không gọi API, không intercept wheel/touchmove, không vòng lặp animation/scroll JS.
- Reduced motion dừng hiệu ứng, giữ ảnh/nội dung; bật lại preference hoặc quay lại BFCache tái quan sát ảnh. Khi JS lỗi, HTML/ảnh gốc vẫn đọc được. CSS/JS query version 1.29.1-r2 tránh cache bản cũ; gallery CSS/JS có query 1.29.1.

## Kiểm chứng cục bộ

- image-motion-browser: cả bốn nút bằng nhau về height/background/color/radius/font/weight tại 320/390/1024/1440. Hover có frame nội suy giữa scale 1 và 1.065, không chỉ kiểm tra tên class.
- Context mobile isMobile+hasTouch xác nhận hover:none. CDP dispatchTouchEvent touchStart/touchMove/touchEnd cuộn dọc: ảnh đi vào viewport và đang nội suy; vuốt ngang làm rail dịch chuyển và ảnh kế tiếp kích hoạt. Cuộn dọc native vẫn hoạt động.
- Không dùng synthesizeScrollGesture làm bằng chứng: trong Edge môi trường này lệnh trả về nhưng không cuộn touch; đã thay bằng chuỗi sự kiện chạm thực tế.
- public-experience, public-shell, navigation, turnkey và AI browser fixtures đạt; không gửi lead/AI/thanh toán thật. Node 175: 174 đạt/1 lead thật bỏ qua.
- Ảnh trước/sau hover và nút: screenshots/image-{before,after}-hover.png, buttons-unified-{desktop,mobile}.png. Video touch local: screenshots/motion-v1291/page@465aba94a9395e39708c2ed4a52621ac.webm. Đây là giả lập browser, chưa phải UAT trên điện thoại vật lý.

CI, Pages và release ghi bổ sung sau triển khai. Không đánh dấu CWV/conversion/UAT tài khoản đạt từ những kiểm thử này.

## Kiểm tra bổ sung khi triển khai

- Dọn observer của khung ảnh đã bị xóa khi phân trang/lọc; fixture thêm ảnh động rồi xóa đã xác nhận observer được giải phóng.
- Lighthouse chỉ ra khởi tạo ảnh đọc/ghi layout xen kẽ (một mẫu quy chiếu public-experience lên đến 1071ms gồm layout). Đã batch toàn bộ thao tác tạo khung, đọc hình học một lần rồi ghi trạng thái; một mẫu sau sửa ghi 110ms. Các mẫu khác nhau về cache/timing, không dùng làm cam kết tỷ lệ tăng tốc cố định.
- Smoke đầu phát hiện gallery controls có thể ló ra khi JavaScript tắt và DOMContentLoaded đến trước CSS. Tái hiện kiểm tra chặn stylesheet, sửa bằng thuộc tính hidden trong HTML và chỉ bỏ hidden sau khi gắn handler; không bỏ qua bài smoke.
- Ảnh hero không nhận khung zoom; slider so sánh được loại trừ. AI browser fixture, menu, chữ tiếng Việt, điều hướng, turnkey và Node kiểm tra lại đều đạt ở bản sửa.

## Bản tối ưu tiếp v1.29.2

Bản v1.29.1 đã phát hành. Phép đo lạnh tiếp theo còn phát hiện khởi tạo nhiều khung ảnh ngoài màn hình, nên v1.29.2 bổ sung prepareObserver rootMargin 280px: chỉ chuẩn bị ảnh sắp tới viewport, batch hình học rồi dùng imageObserver giữ ngưỡng 22% như trước. Ảnh ngoài vùng chuẩn bị không bị bọc/biến đổi lúc tải đầu. Test hover/touch sửa phần thiết lập vị trí để chờ ảnh tới vùng chuẩn bị; vẫn kiểm tra nội suy và gesture thực tế, không nới tiêu chí hiệu ứng. CSS/JS query cuối là 1.29.2.

## Bằng chứng Pages v1.29.2

Revision d20a0462d9131f26974b8eee8de14d3789478989 đã xác nhận từ release.json. Bộ image-motion chạy trực tiếp trên Pages đạt: bốn nút, hover nội suy, chạm cuộn dọc/vuốt ngang, reduced motion, ảnh động và cleanup, no-JS/CSS lỗi. Không dùng tài khoản thật hoặc gửi API ghi.

Lighthouse mobile lab 13.6.0/Edge 157: ba lượt home Performance 84/89/82, LCP 3,364/3,005/3,151 giây; dịch vụ Performance 92, LCP 2,615 giây. Accessibility/Best Practices/SEO 100 và CLS 0 ở cả bốn. Chưa đạt mục tiêu dưới 3 giây ổn định, không suy ra CWV/INP hay độ mượt trên điện thoại vật lý từ điểm lab. Báo cáo local dist/audits/{home,services}-v1-29-2-2026-11-18-*.report.*.

Phép đo lab gồm tải ban đầu và môi trường giả lập; khả năng cuộn/vuốt và nội suy ảnh được kiểm chứng riêng bằng gesture. Không coi Performance là bằng chứng đã hoặc chưa đạt FPS trên máy thật. Preview và browser QA do tác vụ tạo đã đóng sau kiểm tra.

## Nghiệm thu phát hành cuối

[Validate 44308651444](https://github.com/infiniti-money/Web-Design/actions/runs/44308651444) thành công tất cả job, gồm kiểm thử motion hover/touch mới, UI cũ, Node/SQL/Windows. [Pages 44308651391](https://github.com/infiniti-money/Web-Design/actions/runs/44308651391), [browser smoke 44308739084](https://github.com/infiniti-money/Web-Design/actions/runs/44308739084), [SEO/Lighthouse 44308738963](https://github.com/infiniti-money/Web-Design/actions/runs/44308738963) thành công. Smoke cuối xác nhận lại gallery no-JS, không bỏ qua lỗi ở bản đầu.

[Release v1.29.2](https://github.com/infiniti-money/Web-Design/releases/tag/v1.29.2) do auto-promote 44309296846 sau Validate; workflow 44309381142 thành công. ZIP 1104680 byte đã tải kiểm chứng; SHA256 964fb0c5baf92df624664afb26e87779ad10d707da6f0d1d946e388e68129be1 khớp digest GitHub. Không phát hành bộ cài PC mới. Website đã phục vụ d20a0462d9131f26974b8eee8de14d3789478989 trước khi chốt release; commit nghiệm thu sau chỉ thay tài liệu.
