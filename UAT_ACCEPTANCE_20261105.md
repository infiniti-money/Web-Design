# Biên bản nghiệm thu UAT và cổng bảo vệ dữ liệu — 05/11/2026

**Trạng thái: CHƯA ĐỦ ĐIỀU KIỆN NGHIỆM THU PRODUCTION.** Trang này là checklist; không tự khẳng định UAT đã chạy hoặc cơ sở dữ liệu đã sao lưu. Xem [Issue #24](https://github.com/infiniti-money/Web-Design/issues/24).

## Bổ sung kết quả production schema (05/11/2026)

Theo chỉ đạo trực tiếp, migration **additive** `20261105082144_delivery_workspaces_crm_catalog_20261105` đã được áp dụng lên Supabase hiện tại sau khi 3 nhóm CI thành công. Kiểm chứng sau triển khai xác nhận 3 bảng mới có RLS, trống dữ liệu; số lượng công trình/CRM/Catalog cũ không đổi. **Đây KHÔNG phải UAT đạt và KHÔNG phải xác nhận backup**. Migration lịch sử báo giá vẫn chưa áp dụng. Xem [báo cáo triển khai](SUPABASE_DELIVERY_DEPLOYMENT_20261105.md).

## Phạm vi và kết quả chỉ-đọc

- GitHub main `a2be922abc681b6fffb89ca7584621c76e1cdb73`: CI, Pages và browser smoke đạt; các browser fixtures **không phải** kiểm tra bằng tài khoản thật.
- Supabase `mswiegltusllzvuavjdh`: ACTIVE_HEALTHY, 1 admin active, 1 manager active, **không có employee active** tại thời điểm kiểm tra; 6 projects, 1 catalog_items, 2 inquiries, 0 cms_posts và 1 customer_quote_versions.
- RLS đã bật trên bảng liên quan, nhưng policy của `public.projects` hiện dựa trên `app_metadata.role` trong JWT và không đối chiếu trạng thái nhân sự live; đây là cổng bảo mật cần bản vá và kiểm thử trước nghiệm thu.
- Migration `20261105093000_quote_version_immutability.sql` đã qua PostgreSQL 17 isolated nhưng **chưa áp dụng**: không có trigger bảo vệ phiên bản báo giá trên production.
- Advisor: 4 hàm SECURITY DEFINER có EXECUTE cho authenticated cần rà soát hành vi quyền; tính năng leaked-password protection chưa bật. Không thay đổi bảo mật đột ngột trước UAT/đánh giá tương thích.

## UAT tài khoản thật — ghi nhận trên thiết bị tin cậy

Chạy với tài khoản **thật** Admin, Manager và một Employee đã được chủ sở hữu phê duyệt cấp quyền; **không** sử dụng mật khẩu/tokens trong issue, logs, commit hoặc ảnh công khai. Mỗi trường hợp phải chụp bằng chứng đã che dữ liệu riêng tư và ghi giờ, môi trường, commit, vai trò, kết quả, người nghiệm thu.

| Case | Người thực hiện | Điều kiện đạt | Kết quả |
| --- | --- | --- | --- |
| UAT-01 Login/Logout | Admin, Manager, Employee | đúng vai trò; logout ẩn dữ liệu | BLOCKED: thiếu kiểm thử tài khoản thật |
| UAT-02 Công trình | Admin + Employee | Admin thêm/sửa/ẩn công trình nháp tổng hợp; Employee bị chặn ghi bằng RLS, không chỉ ẩn nút | BLOCKED |
| UAT-03 Catalog | Admin + Manager | Admin CRUD bản nháp & publish; Manager không sửa được; kiểm tra không rò draft qua anon | BLOCKED |
| UAT-04 CRM | Admin + Manager + Employee | xem đúng phạm vi, tìm không dấu, cập nhật, CSV không lộ dữ liệu; nhân viên chỉ xem việc được giao | BLOCKED |
| UAT-05 Giao việc | Manager + Employee | giao nhiệm vụ tổng hợp, tiến độ & hạn, kiểm tra đổi quyền/thu hồi ngay trên server | BLOCKED |
| UAT-06 CMS | Manager + Admin + anon | nháp → review → Admin publish → Pages build → URL live; archive & redeploy gỡ bản; không lộ draft | BLOCKED: chưa có cms_posts |
| UAT-07 Báo giá | Admin + Manager | tạo phiên bản mới, duyệt và in A4/PDF từ snapshot, quyền role thực, dữ liệu lịch sử nguyên vẹn | BLOCKED |
| UAT-08 Khả năng phục hồi | Quản trị hạ tầng | backup độc lập + restore cô lập + xác nhận Auth/Storage, checksum | BLOCKED |

Không dùng dữ liệu khách hàng thật để tạo fixture. Không tự gửi email, không mời thêm nhân sự khi chưa có quyền và chính sách nội bộ.

## Backup thật trước migration production

1. Trên máy riêng được ủy quyền, lấy kết nối an toàn từ Supabase Dashboard theo runbook và dùng phiên bản `supabase` CLI đã kiểm tra `--help`. Không ghi chuỗi kết nối, password hoặc dumps vào GitHub Actions hay repository.
2. Tạo và bảo quản `roles.sql`, `schema.sql`, `data.sql` theo runbook hiện có; tạo SHA256 và sao chép bản mã hóa ra vị trí lưu trữ độc lập. Đối chiếu cùng thời điểm số lượng các bảng `inquiries`, `projects`, `catalog_items`, `customer_quotes`, `customer_quote_versions`, `customer_contracts`.
3. Chú ý: dump mặc định của CLI không bảo đảm chứa **Auth** và **Storage objects**. Có phương án đầy đủ cho `auth.users`, `auth.identities`, cấu hình nhà cung cấp đăng nhập và bucket/object thực tế; kiểm tra quyền và chính sách lưu dữ liệu nhạy cảm.
4. Phục hồi trên Postgres/Supabase **cách ly**, không ghi vào production; thử truy vấn dữ liệu được phục hồi, đăng nhập bằng tài khoản kiểm thử được cho phép, kiểm tra tải object Storage. Chụp biên bản đối chiếu, giữ bản dump ngoài repo.
5. Sau khi có bằng chứng restore đạt, thử migration ở staging; đối chiếu tổng bản ghi, lịch sử báo giá, snapshot được duyệt và thử các thao tác INSERT phiên bản mới, UPDATE/DELETE bị chặn. Chỉ sau đó mới áp dụng migration **duy nhất một lần** trên production và kiểm tra postflight.

Workflow PostgreSQL tạo trong PR này chỉ là diễn tập `pg_dump/pg_restore` với dữ liệu **tổng hợp**. Nó không phải backup production.

## Điều kiện ra quyết định

- **PASS**: từng case bằng tài khoản thật có bằng chứng + backup/restore độc lập + không còn lỗi quyền/chức năng nghiêm trọng + CI xanh + smoke production.
- **BLOCKED**: thiếu employee thật, kiểm thử quyền thực, dữ liệu CMS để nghiệm thu, backup/restore hoặc staging.
- **NO-GO**: không áp dụng migration báo giá / điều phối; không gộp PR #25 chỉ vì CI xanh.
- Hạn chế: không đưa nội dung riêng tư, hồ sơ khách, secrets, dump và token vào issue công khai.
