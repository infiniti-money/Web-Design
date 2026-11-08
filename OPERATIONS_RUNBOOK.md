### Cập nhật v1.25.1 — 08/11/2026

Trung tâm vận hành đã bổ sung chốt vòng đời dữ liệu:

- Bấm Làm mới xóa số và phạm vi tài khoản cũ ngay, ẩn dashboard trong lúc xác minh. Dùng aria-busy để thông báo đang tải.
- Toàn bộ lượt tải có hạn chờ 15 giây; hết hạn hủy các truy vấn PostgREST và mở lại nút thử thủ công. Không tự gửi lại liên tục.
- Kiểm tra Auth/hồ sơ nhân sự trước và sau các truy vấn HEAD. ID tài khoản và vai trò phải khớp, hồ sơ còn active; nếu thay đổi thì không hiển thị snapshot. Đây là chốt giao diện, RLS vẫn quyết định quyền truy cập thật.
- Đăng xuất, đổi token/vai trò hoặc mất mạng xóa số cũ ngay. Phản hồi của lượt tải đã bị thay thế không được xuất hiện trở lại. Khi có mạng hoặc Auth thay đổi, thực hiện lượt xác minh mới; callback Auth được giữ đồng bộ, truy vấn lại ở tác vụ kế tiếp.
- Chỉ tải count exact theo quyền; không tải danh sách khách, không ghi trạng thái, không gửi thông báo. Lỗi từng nhóm vẫn là dấu “–”, không thành 0.

Kiểm thử Node và Playwright dùng Auth/RLS giả lập: Admin/Quản lý/Nhân viên, quyền thu hồi giữa lượt đọc, tài khoản đổi, token đổi vai trò, số cũ trong khi refresh, phản hồi muộn sau logout, offline/online và timeout/thử lại. CI chạy kiểm tra vận hành trước và sau triển khai. Chưa thay thế nghiệm thu tài khoản thật, cài/nâng cấp PC hoặc kiểm chứng RLS bằng người dùng production.

### Đối chiếu các mục lộ trình đã gửi

| Nhóm | Mã và kiểm chứng | Trạng thái |
| --- | --- | --- |
| Điều phối vận hành | operations.html, assets/operations.js, tests/operations.test.cjs, tests/operations-browser-smoke.cjs | Bổ sung an toàn vòng đời số liệu ở v1.25.1; giữ bộ đếm và phân quyền hiện có |
| Tư vấn an toàn | tests/consultation-experience.test.cjs, consultation-browser-smoke.cjs | Ngữ cảnh dịch vụ, khóa gửi/timeout, bảo toàn form và xác nhận API đã có; chạy lại bằng fixture |
| Công trình/Catalog | catalog-project-management.test.cjs, projects-admin-browser.cjs, catalog-browser-smoke.cjs | Tìm/lọc, xác nhận, cảnh báo chưa lưu và kiểm chứng lưu đã có; giữ nguồn công trình tĩnh xác minh riêng |
| CRM/công việc/CMS | admin-operations-review.test.cjs, cms-browser-smoke.cjs, admin.js, assets/admin-posts.js | Chốt lỗi/CSV, đọc lại tiến độ, kiểm tra xuất bản và bảo toàn bản sửa đã có; không tự xuất bản dữ liệu thật |

Những mục “chưa xác nhận” ở ghi chú ngày 05/11 là tình trạng tại thời điểm đó. Bằng chứng backup/restore độc lập và bảo vệ lịch sử báo giá đã được ghi trong QUOTE_VERSION_GUARD_ROLLOUT.md và PAYOS_GENERAL_RELEASE.md ở các đợt sau; đợt frontend này không cần áp dụng lại migration. UAT tài khoản thật, nâng cấp PC thực, Search Console và CWV thực địa vẫn để mở.

 Trung tâm vận hành ATELIER HOME — chặng 5

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

## Nghiệm thu phát hành v1.25.1 — 08/11/2026

Online release.json khớp `f0db0853c600db7f0071af779e9f6ae1a84881f3`. [Validate trước triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42432751205), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42432751049), [browser sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42432788286) và [SEO/Lighthouse](https://github.com/infiniti-money/Web-Design/actions/runs/42432788274) đều thành công. Node: 130 bài, 129 đạt và 1 gửi lead thật bỏ qua; an toàn route PC: 2/2 đạt.

Kiểm tra lại operations-browser-smoke.cjs trực tiếp trên Pages cũng đạt toàn bộ tình huống vai trò, thu hồi quyền, timeout/thử lại, logout/phản hồi muộn và offline/online. Dữ liệu Auth/count chỉ là fixture trong bộ nhớ, không xác nhận UAT bằng tài khoản thật. CMS/báo giá, tư vấn, công trình và Catalog đều qua kiểm tra fixture; không ghi dữ liệu production hoặc phát hành bộ cài PC trong đợt này.

Gói [web v1.25.1](https://github.com/infiniti-money/Web-Design/releases/tag/v1.25.1) đã phát hành; [workflow đóng gói](https://github.com/infiniti-money/Web-Design/actions/runs/42432940589) thành công. Đã tải lại ZIP và xác minh SHA-256 với SHA256SUMS.txt: `525ff5bb709ffa673a5c3b68e7348a9e4ad59e7bb5dd5593aeec606c07ec04bf` (721987 byte). Cập nhật tài liệu sau tag không sửa giao diện hoặc gói đã phát hành.
