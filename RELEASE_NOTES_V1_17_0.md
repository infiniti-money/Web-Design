# Tân Design v1.17.0 — Báo giá và hợp đồng

Ngày phát hành: 02/11/2026.

## Tính năng
- Quản lý báo giá theo khách hàng, tiêu đề, tổng tiền và nhiều phiên bản.
- Quản lý phê duyệt: tạo nháp → lập phiên bản → trình duyệt → duyệt/từ chối có lý do → gửi khách → ghi nhận chấp nhận kèm căn cứ.
- Tạo hợp đồng từ **đúng phiên bản báo giá được Admin duyệt** và khách đã chấp nhận; các bước xem xét, xác nhận ký, kích hoạt, hoàn thành.
- Nhật ký ghi nhận người thực hiện, thời điểm, lý do từ chối và ghi nhận khách chấp nhận.
- Giao diện tiếng Việt, hỗ trợ desktop/mobile; hiển thị trạng thái trống và thông báo lỗi rõ ràng.
- Cải tiến phân quyền: chỉ tài khoản Admin/Quản lý còn hiệu lực xem thương mại; chỉ Admin được duyệt/từ chối và xác nhận ký.
- Liên kết trang báo giá–hợp đồng từ Quản trị; kết hợp Catalog, CRM, thông báo nội bộ và báo cáo sẵn có.

## Kiểm thử, an toàn dữ liệu
- Bộ kiểm thử cấu trúc/DOM, phân quyền và vòng đời báo giá–hợp đồng đã vượt qua CI.
- Chromium kiểm tra giao diện desktop/mobile, demo ngoại tuyến và quy trình nghiệp vụ với dữ liệu mô phỏng.
- Kiểm thử SQL transaction có rollback, xác minh chặn sai quyền, sai khách hàng và sai phiên bản được duyệt.
- Người sử dụng đã xác nhận kiểm thử đạt trước khi gộp PR #15.
- Không đưa mật khẩu, khóa bí mật Supabase hoặc thông tin đăng nhập vào giao diện hay gói mã nguồn.

## Triển khai
- Website chính: https://infiniti-money.github.io/Web-Design/
- Quản trị: https://infiniti-money.github.io/Web-Design/admin.html
- Báo giá/hợp đồng (yêu cầu phiên đăng nhập): https://infiniti-money.github.io/Web-Design/commercial.html

**Quan trọng:** Tại dự án Supabase hiện hữu, các migration cho v1.17.0 đã được áp dụng. **Không chạy lại toàn bộ tệp SQL trong gói ZIP** đối với dữ liệu production. Các tệp `supabase/` chỉ phục vụ quản lý mã nguồn, kiểm tra nâng cấp hoặc cài đặt mới có kiểm soát. Giữ nguyên dự án Supabase, tài khoản, dữ liệu khách hàng, báo giá và hợp đồng. Quy trình “xác nhận đã ký” chỉ ghi nhận trạng thái trong phần mềm; **không phải chữ ký điện tử/chữ ký số**.

Đính kèm gói mã nguồn website và SQL `tan-design-v1.17.0.zip`. GitHub Pages triển khai từ nhánh `main` qua workflow riêng; tải ZIP không bắt buộc để dùng website.
