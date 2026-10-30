# ATELIER HOME — Cấu hình Supabase thực tế

## Đã hoàn tất

- Supabase project **atelier-home-web-design**, ref `mswiegltusllzvuavjdh`, vùng Singapore.
- Database migration `atelier_home_initial_schema` đã chạy; có `public.projects`, `public.inquiries`, RLS và 6 dự án minh họa.
- Frontend `app-config.js` đã cấu hình Project URL và **publishable API key**.
- Theo kiểm tra lúc cấu hình: **0 Auth users, 0 admin users**. Chưa có ai được đăng nhập quản trị.
- GitHub Pages chưa bật. Chưa có URL website trực tuyến được xác nhận.

## 1. Tạo tài khoản quản trị

1. Mở [Authentication → Users](https://supabase.com/dashboard/project/mswiegltusllzvuavjdh/auth/users).
2. Dùng **Add user / Send invitation** đến email do chủ dự án sở hữu. Hoàn tất xác nhận email và thiết lập mật khẩu trên Supabase.
3. Trong [SQL Editor](https://supabase.com/dashboard/project/mswiegltusllzvuavjdh/sql/new) với quyền chủ sở hữu, thay `ADMIN_EMAIL_THAT_YOU_CONTROL` bằng địa chỉ email thực tế, rồi chạy:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'ADMIN_EMAIL_THAT_YOU_CONTROL'
  and email_confirmed_at is not null
returning id, email, raw_app_meta_data ->> 'role' as assigned_role;
```

4. Xác minh truy vấn trả về **đúng 1 dòng**. Nếu trả về 0, tài khoản hoặc email chưa tồn tại/chưa xác minh. Không gán quyền theo `user_metadata`; không tạo tài khoản admin mặc định.
5. Đăng xuất và đăng nhập lại ở `/admin.html` để JWT cập nhật quyền.

## 2. Bật website GitHub Pages

1. Mở [Settings → Pages](https://github.com/infiniti-money/Web-Design/settings/pages).
2. Chọn **Build and deployment → Source = GitHub Actions**.
3. Mở [Publish ATELIER HOME](https://github.com/infiniti-money/Web-Design/actions/workflows/publish.yml), chọn **Run workflow**.
4. Khi deploy thành công, địa chỉ dự kiến: `https://infiniti-money.github.io/Web-Design/`; admin: `https://infiniti-money.github.io/Web-Design/admin.html`.

## 3. Quyền truy cập

| Tài khoản | projects | inquiries |
| --- | --- | --- |
| Khách `anon` | Chỉ SELECT bản published | Chỉ INSERT yêu cầu mới |
| Tài khoản không phải admin | Chỉ đọc dự án published | Không xem/sửa/xóa |
| `app_metadata.role=admin` | SELECT/INSERT/UPDATE/DELETE | SELECT/UPDATE/DELETE |

RLS có hiệu lực ở cả hai bảng. Từ tháng 10/2026, Supabase yêu cầu **GRANT rõ ràng** cho các bảng được dùng trong Data API — schema đã thiết lập các grant tương ứng.

## 4. Kiểm thử & bảo mật trước khi sử dụng thực tế

- Sau khi có admin: kiểm tra đăng nhập, CRUD dự án, xuất bản/ẩn dự án, cập nhật trạng thái tư vấn.
- Thử bằng người dùng không phải admin: không đọc được thông tin cá nhân của khách hàng.
- Kiểm thử gửi form từ website, xác nhận dữ liệu xuất hiện ở Supabase.
- Thêm CAPTCHA/Turnstile và kiểm soát tần suất gửi phía máy chủ, chống spam và email thông báo. **Chưa có các chức năng này**.
- Hoàn thiện chính sách quyền riêng tư, dữ liệu doanh nghiệp, thời gian lưu dữ liệu và xử lý yêu cầu xóa.
- Chưa có ảnh công trình thực tế: ảnh Unsplash và thống kê là dữ liệu minh họa.
- Khóa publishable được thiết kế công khai; **không lưu khóa secret/service_role hay mật khẩu trong trình duyệt/GitHub**.

Tài liệu tham khảo: https://supabase.com/docs/guides/database/postgres/row-level-security
