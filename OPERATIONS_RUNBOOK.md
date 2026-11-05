# Trung tâm vận hành ATELIER HOME — chặng 5

Phạm vi đợt này: web có thêm `operations.html` (Admin/Quản lý), giao diện đọc số liệu tổng hợp theo Supabase RLS. Sử dụng cùng tài khoản và cùng Supabase project hiện tại. Không có migration, không gửi email, không tự phê duyệt, không chứa service-role key và không lưu dữ liệu khách trong localStorage.

## Quy trình vận hành hằng ngày

1. Đăng nhập bằng tài khoản Admin hoặc Quản lý **đã được cấp quyền**; mở Trung tâm vận hành từ sidebar.
2. Bấm **Làm mới số liệu** để tải số việc quá hạn, việc đến hạn trong 7×24 giờ, báo giá ở trạng thái `submitted` và bài CMS `review`. Admin còn xem tổng nhân sự `active`.
3. Các bộ đếm dùng `head:true,count:exact`, không tải danh sách khách/hợp đồng; chỉ là phần mà RLS cho phép tài khoản xem, không phải chỉ số toàn công ty nếu phạm vi truy cập hẹp.
4. Khi thấy số liệu cần xử lý, mở màn hình Công việc / Báo giá / Bài viết để thao tác. Trang này **không ghi dữ liệu**; hoạt động duyệt tiếp tục kiểm tra quyền máy chủ.
5. Nếu một API lỗi hoặc thiếu quyền, hiển thị dấu `–` và thông báo chưa tải, **không biến lỗi thành 0**. Sau khi kết nối lại, bấm Làm mới. Khi đăng xuất, màn hình ẩn số liệu.

## Trước khi công bố thay đổi hệ thống

- [ ] Kiểm tra GitHub Actions Node/static, PostgreSQL isolate và browser smoke deployed.
- [ ] Nghiệm thu tài khoản Admin và Quản lý **thật**: quyền xem bộ đếm đúng RLS, tài khoản Nhân viên không xem được trang; dữ liệu lỗi/bị thu hồi quyền hiển thị an toàn.
- [ ] Chạy backup Supabase độc lập và thử **restore trên môi trường cách ly**, bao gồm phương án Auth/Storage, trước mọi migration production.
- [ ] Bảo đảm không nhúng secret, thông tin khách, JWT hoặc service_role vào mã/CI.
- [ ] Nghiệm thu quy trình lập báo giá, đổi vai trò, mời nhân viên, phê duyệt CMS/CRM và in PDF trên thiết bị thật.
- [ ] Kiểm tra webhook/email/thông báo vẫn theo chính sách hiện tại; **không tự bật** tính năng đang hoãn.
- [ ] Thống nhất thông tin doanh nghiệp, hồ sơ dự án và quyền ảnh, Search Console nếu muốn nghiệm thu chặng SEO.

## Giới hạn và khôi phục

Đây là **bảng đọc**, không phải trang theo dõi hạ tầng hay công cụ chẩn đoán backup. `Trực tuyến` ở giao diện chỉ là trạng thái kết nối trình duyệt; không chứng minh Supabase/Actions hoạt động ổn định. Không đánh dấu điều kiện backup/UAT đạt khi chưa có bằng chứng độc lập.

Web triển khai từ `main` qua GitHub Pages và có smoke sau triển khai. Khi cần khôi phục giao diện, revert commit nâng cấp / triển khai lại commit Pages đã kiểm tra; không khôi phục hoặc sửa dữ liệu Supabase. Windows Manager chỉ nhận trang này khi phát hành bản desktop kế tiếp; **không phát hành bộ cài tự động** trong đợt web.

Xem thêm: `WEBSITE_ROADMAP.md`, `QUOTE_VERSION_GUARD_ROLLOUT.md`, `RELEASE_HISTORY.md`.
