# Thiết kế studio và chuyển động hai phía — 19/11/2026

Phản hồi chủ website: nền và khung phải cùng hệ màu; còn nhiều khoảng trống; cần bố cục chuyên nghiệp và ảnh/chữ chạy vào từ hai phía. Đây là thay đổi bố cục/chuyển động, ngoài đợt vật liệu nền1.31.

- Lưới1360px thay1240px, lề32px desktop/16px mobile. Khoảng cách giữa khung giới thiệu và công trình52px desktop/32px mobile, thay các section padding90–115px mỗi phía. Trong lần xem1440x1000, khung giới thiệu cao494.7px, nội dung và ảnh cùng hàng, không cắt nội dung.
- Ảnh intro280–420px, chữ/cấp tiêu đề/khung điều khiển cân lại. Quy trình3cột desktop,2cột mobile từ360px,1cột màn nhỏ hơn; khung tư vấn, dự toán, dịch vụ và nội dung chờ dữ liệu thu gọn. Không dùng nội dung giả để lấp khoảng trống.
- Kiến thức2–4cột desktop,1cột mobile. Bài chi tiết có cột đọc và mục lục sticky240px bên phải, xếp mục lục trước bài trên màn nhỏ. Giữ toàn bộ tiêu đề, anchor, nội dung và liên kết.
- Paired entry dùng IntersectionObserver, dịch chuyển64px desktop/24px mobile và opacity trong0.9giây. Desktop ảnh và chữ dùng chung thời điểm; mobile khối xếp dọc vào khi từng phần nhìn thấy. Không xử lý theo từng pixel scroll, không đổi geometry, không đưa ảnh hero/so sánh vào hiệu ứng. Keyboard focus/reduced-motion/no-JS/BFCache có fallback đọc được.
- Quản trị/PC giảm padding ngoài và khoảng trống module, không tăng mật độ dữ liệu bảng hoặc bỏ tùy chọn người dùng. Không thay database/Auth/keys.

Kiểm tra local: designer-layout browser xác nhận vectơ chuyển động trái/phải, đồng hồ chênh dưới20ms, geometry không đổi, gap và chiều cao giới thiệu, lưới1/2/3cột, sidebar bài viết, touch/reduced-motion; giữ các kiểm thử bảo toàn SEO và tương tác. Bằng chứng CI/Pages/release được bổ sung sau phát hành.

## Xác minh web phát hành

- Revision a5ba31b94e084b8653ae347402f128b4805773ec; [Validate](https://github.com/infiniti-money/Web-Design/actions/runs/44366315605) cả4 job xanh. Bài đo touch zoom được lấy mẫu ngay trong cử chỉ thay vì chờ đến khi hiệu ứng có thể đã kết thúc; giữ kiểm tra interpolation, visibility và running animation. Các cặp nội dung bỏ reveal dọc lồng để chỉ còn chuyển động ngang đồng bộ.
- [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/44366315438), [deployed smoke](https://github.com/infiniti-money/Web-Design/actions/runs/44366428915), [SEO/Lighthouse](https://github.com/infiniti-money/Web-Design/actions/runs/44366429026) thành công. Bài designer-layout chạy trực tiếp trên Pages xác nhận spacing, sidebar và motion.
- [Source1.32.0](https://github.com/infiniti-money/Web-Design/releases/tag/v1.32.0) tải thật,1165426 bytes,SHA2561bfa96d7aec34f83d9d532ab1e8d7b45ff22ea95a99b6f4ff02bc16d9cd4952e. Hai tag web/PC cùng trỏ revision trên.
- Lighthouse mobile lần cuối: Performance93,Accessibility100,Best Practices100,SEO100,LCP2967.006ms,CLS0. Đây là một phép đo lab; không chứng nhận CWV thực địa hoặc mọi lượt tải dưới3giây.

## PC và bàn giao

[Build/release PC](https://github.com/infiniti-money/Web-Design/actions/runs/44367165226) thành công. Feed desktop-stable trả1.3.2; tải binary ổn định thật121796170bytes và đối chiếu cả SHA256 với digest bản phiên bản, SHA512 với latest.yml đều khớp.

- Installer:ATELIER-HOME-Manager-1.3.2-x64-Setup.exe
- SHA256:sha256:a2cecc7bb57a8a984955a4f4d95cb889516a77df4bcedb212c1fdc867a4e072e
- SHA512:Z0t7P7uwhytr6E3sBjhKV/vDdrzrj5i6yIuRpy1XzzNcnZx8l8GnxN/12pfU6l5/rKH/3R9H7ryroW2Qsw3H+g==

Bộ cài chưa ký Authenticode. Local preview đã dừng; code và báo cáo được đẩy về repository. Chưa chứng nhận cài đè với tài khoản thật, thiết bị vật lý hoặc CWV thực địa; không đổi dữ liệu/schema/Auth/RLS.
