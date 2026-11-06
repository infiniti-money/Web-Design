# ATELIER HOME Manager cho Windows

Ứng dụng PC đóng gói giao diện quản trị và thư viện kết nối để mở được màn hình đăng nhập khi CDN gián đoạn. Dữ liệu nghiệp vụ và xác thực dùng Supabase hiện tại; cần Internet để đăng nhập, đọc hoặc ghi dữ liệu. Không lưu bản sao hồ sơ khách hàng ngoại tuyến.

## Chức năng

- Tổng quan, quản lý dự án, CRM, ghi chú, lịch nhắc, Kanban và báo cáo.
- Tài khoản/nhân sự: mời, xét duyệt đăng ký, phân vai trò, vô hiệu hóa; giữ kiểm tra quyền ở máy chủ.
- Bài viết: nháp, chờ duyệt, xuất bản/lên lịch, lưu trữ, xem trước Markdown an toàn, lịch sử và khôi phục nội dung thành bản nháp mới; phát hiện xung đột phiên bản.
- Báo giá: hạng mục, số lượng, đơn giá VND, giảm trừ, thuế suất do người dùng nhập, phê duyệt, ghi nhận xác nhận khách hàng, hợp đồng và xuất PDF. Tổng báo giá có cấu trúc được kiểm tra lại trong PostgreSQL.
- Catalog, thông báo nội bộ, tìm nhanh chức năng bằng Ctrl+K.
- Bản Setup tự kiểm tra/tải cập nhật qua kênh `desktop-stable` của GitHub. Người dùng quyết định khi khởi động lại; không tự cài khi đang đóng công việc. Bản Portable không tự cài cập nhật.

## Cài đặt và sử dụng

Bản vá mới: [Windows Manager 1.1.2](https://github.com/infiniti-money/Web-Design/releases/tag/desktop-v1.1.2), đóng gói quản trị công trình tin cậy và các cập nhật vận hành hiện tại. Xem [ghi chú 1.1.2](RELEASE_NOTES_1_1_2.md) và [bằng chứng phát hành/feed](../PROJECT_ADMIN_ACCEPTANCE.md); chỉ coi đã phát hành khi workflow và kiểm tra feed thành công. Bản 1.1.1 bổ sung tìm CRM không dấu; các đường dẫn 1.1.0 dưới đây là lịch sử nâng cấp giao diện.

Tải [Setup 1.1.2](https://github.com/infiniti-money/Web-Design/releases/download/desktop-v1.1.2/ATELIER-HOME-Manager-1.1.2-x64-Setup.exe) hoặc [Portable 1.1.2](https://github.com/infiniti-money/Web-Design/releases/download/desktop-v1.1.2/ATELIER-HOME-Manager-1.1.2-x64-Portable.exe). Mở Setup, cài theo từng bước và đăng nhập bằng tài khoản đã được cấp quyền. Tài khoản mới vẫn cần Admin duyệt. Đăng ký/khôi phục mật khẩu mở trang xác thực của website bằng trình duyệt; ứng dụng PC đăng nhập bằng email và mật khẩu.

Bản 1.1.0 đã phát hành ngày 05/11/2026: [Tải bộ cài Windows](https://github.com/infiniti-money/Web-Design/releases/download/desktop-v1.1.0/ATELIER-HOME-Manager-1.1.0-x64-Setup.exe) · [Tất cả tệp phát hành](https://github.com/infiniti-money/Web-Design/releases/tag/desktop-v1.1.0). Feed `desktop-stable/latest.yml` đã được kiểm tra trả đúng phiên bản; bộ cài tải qua feed đã được đối chiếu SHA-512. Chưa kiểm thử việc cài nâng cấp trên một máy người dùng đã cài bản cũ.

Phiên đăng nhập được mã hóa bằng Electron `safeStorage` (DPAPI trên Windows), lưu trong thư mục dữ liệu riêng của người dùng. Đăng xuất xóa phiên đã lưu. Không có service-role key hoặc khóa quản trị trong ứng dụng.

## Phát triển và kiểm tra

```powershell
cd desktop
npm ci
node node_modules/electron/install.js
npm run prepare:ui
npm test
npm run test:smoke
npm start
```

`npm run prepare:ui` tạo bản sao UI trong `desktop/ui`, thay SDK CDN bằng thư viện đã khóa phiên bản và chuyển script nội tuyến thành file để áp dụng CSP nghiêm ngặt. Markdown/DOMPurify cùng giấy phép được sao chép vào `assets/vendor` cho cả bản web. Không chỉnh tay `desktop/ui`.

```powershell
npm run dist:win
```

Đầu ra gồm Setup NSIS, Portable, blockmap và `latest.yml`. Bản dựng local hiện chưa có chứng thư ký mã Windows. Có thể cấu hình `WINDOWS_CSC_LINK` và `WINDOWS_CSC_KEY_PASSWORD` trong GitHub Actions cho bản phát hành đã ký; không đưa chứng thư/mật khẩu vào repo.

## Phát hành cập nhật

1. Tăng `version` trong `desktop/package.json` và cập nhật lockfile.
2. Đưa mã đã kiểm tra lên GitHub, tạo tag `desktop-v<version>`.
3. Workflow `desktop-release.yml` kiểm tra, dựng installer và tạo GitHub Release theo phiên bản.
4. Workflow đưa các tệp installer/blockmap vào release kênh `desktop-stable`, rồi cập nhật `latest.yml` cuối cùng. Đây là feed riêng cho PC, không phụ thuộc các release ZIP của website.

Không nhúng GitHub token vào ứng dụng. Feed đọc công khai qua HTTPS và electron-updater kiểm tra checksum tải về. Chỉ các bản phát hành thực tế mới có thể kiểm tra cập nhật đầu cuối; kiểm thử local xác minh trạng thái tải, điều kiện cài, chống hạ phiên bản và thao tác khởi động lại bằng bộ giả lập updater.

## Phạm vi phân quyền

| Vai trò | Phạm vi |
|---|---|
| Admin | Toàn bộ chức năng quản trị hiện có, phê duyệt/xuất bản và quản lý tài khoản |
| Quản lý | Công việc nhóm, báo cáo, báo giá/hợp đồng theo luồng đã cấp; soạn nháp/chờ duyệt của mình |
| Nhân viên | Công việc được giao và thông báo có quyền xem |

CMS và trigger kiểm tra tổng báo giá đã được thêm bằng migration trong `supabase/migrations`. `staff-management` hỗ trợ Origin desktop `atelier://app` và tiếp tục yêu cầu JWT cùng tài khoản Admin đang hoạt động.

Website đã có luồng dựng bài CMS công khai thành HTML tĩnh từ v1.19 và tìm/lọc kiến thức từ v1.23. Phần soạn thảo/xem trước trong PC dùng UI đóng gói; thời điểm lưu CMS vẫn khác thời điểm Pages triển khai thành công. Xem [lộ trình](../WEBSITE_ROADMAP.md) và [báo cáo v1.24](../PROJECT_ADMIN_ACCEPTANCE.md) để đối chiếu phạm vi đã kiểm tra.
