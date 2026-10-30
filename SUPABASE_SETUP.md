# ATELIER HOME v1.1 — Kết nối và quản trị

## Trạng thái thực tế
- Website static v1.0.0 đã phát hành trên GitHub Releases.
- Đã bổ sung **mã nguồn** v1.1 cho trang \`admin.html\`, đăng nhập Supabase Auth, quản lý dự án, theo dõi yêu cầu tư vấn.
- **Chưa có dự án Supabase được kết nối**. Các tính năng trực tuyến KHÔNG hoạt động cho tới khi thiết lập các bước bên dưới. Website vẫn dùng localStorage cho demo khi cấu hình trống.
- **GitHub Pages chưa bật**. Cần người quản trị repository truy cập **Settings → Pages → Build and deployment → Source → GitHub Actions**, sau đó chạy lại Publish ATELIER HOME.

## 1. Tạo Supabase
1. Chọn tổ chức Supabase của bạn và tạo một project mới tại https://supabase.com/dashboard. Kiểm tra gói và phí trước khi xác nhận.
2. Trong Dashboard của project, mở SQL Editor, chạy toàn bộ file \`supabase/schema.sql\`. File này tạo hai bảng: \`projects\` và \`inquiries\`, quyền truy cập bằng RLS và 6 dự án minh họa.
3. Tại **Integrations → Data API → Settings**, kiểm tra schema \`public\` và cho phép các bảng \`projects\` và \`inquiries\` được truy cập qua Data API. Từ 30/10/2026, Supabase có thể không tự phơi bày bảng mới. Kiểm tra kỹ bảng nào được expose.
4. Tại **Authentication → Users**, tạo tài khoản người quản trị bằng email và mật khẩu (không mở đăng ký admin công khai).
5. Sau khi tạo tài khoản, vào SQL Editor và thay \`admin@example.com\` bằng đúng email quản trị để gán vai trò **trong app_metadata**:

\`\`\`sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
\`\`\`

Kiểm tra kết quả một tài khoản duy nhất được sửa. Sau khi gán vai trò, đăng xuất và đăng nhập lại để làm mới token. Không được sử dụng \`user_metadata\` để cấp quyền.

6. Trong **Project Settings → API Keys**, lấy **Project URL** và **publishable key** bắt đầu bằng \`sb_publishable_\`. Chỉ cập nhật hai giá trị đó trong \`app-config.js\`:

\`\`\`js
window.ATELIER_CONFIG = Object.freeze({
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabasePublishableKey: "sb_publishable_YOUR_PUBLIC_KEY"
});
\`\`\`

\`sb_publishable_\` là khóa thiết kế để dùng ở frontend và RLS phải được cấu hình. **Không bao giờ** đưa password, service_role, \`sb_secret_\`, hoặc JWT signing secret lên GitHub.

7. Sau khi website được xuất bản, mở \`/admin.html\` để đăng nhập, cập nhật dự án và theo dõi yêu cầu từ khách.

## 2. Kiểm thử thủ công trước khi vận hành
- Khách truy cập xem được **dự án đã xuất bản**, không thấy bản nháp.
- Người lạ không đọc, sửa hoặc xóa được \`inquiries\` và \`projects\`.
- Người dùng thông thường không có \`app_metadata.role=admin\` không được vào quản trị.
- Admin đăng nhập, thêm/sửa/xóa dự án và đổi trạng thái yêu cầu thành công.
- Khách gửi form, hệ thống ghi nhận được yêu cầu; khách không thể đọc dữ liệu của người khác.
- Test trên điện thoại, màn hình máy tính và các trình duyệt chính.

## 3. An toàn và bảo mật
- Public form hiện cho phép **anonymous INSERT** với RLS và ràng buộc độ dài trường. Chưa có CAPTCHA, IP rate limit, chống spam phía máy chủ hoặc thông báo tự động. **Không triển khai chiến dịch quảng cáo hay thu thập thông tin khách thật cho tới khi bổ sung các biện pháp này.**
- Cần chính sách bảo mật, mục đích xử lý dữ liệu, thời gian lưu trữ, quyền yêu cầu xóa dữ liệu, và hướng dẫn xử lý dữ liệu cá nhân phù hợp quy định.
- Không tạo tài khoản admin mặc định, không dùng mật khẩu hardcode. Quyền quản trị được xác thực bằng JWT \`app_metadata\` và cưỡng chế bằng RLS.
- Chưa có hệ thống tải ảnh lên; trang quản trị sử dụng URL ảnh HTTPS. Ảnh demo Unsplash không phải hình ảnh dự án thực tế.
- Không có thông tin liên hệ chính thức và không có cơ sở khẳng định các chỉ số kinh doanh của nội dung demo.

## 4. Bước phát triển tiếp
- Cài CAPTCHA/Turnstile và Edge Function kiểm soát tốc độ, email thông báo.
- Thêm quản trị bài viết, dịch vụ, ảnh qua Supabase Storage với chính sách riêng.
- Thêm đặt lịch, quản lý khách hàng/CRM, audit log, phân quyền nhiều cấp.
- Thiết lập CI kiểm thử RLS với cơ sở dữ liệu tạm và theo dõi lỗi.

## Tham khảo
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/api/securing-your-api
