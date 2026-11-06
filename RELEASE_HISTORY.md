# Lịch sử phát hành và việc còn thiếu

Tên thương hiệu hiện tại: **ATELIER HOME**. Các tài liệu cũ dùng Tân Design được giữ làm lịch sử tại thời điểm phát hành; không phải xác nhận pháp nhân hiện tại.

## Mốc hiện tại

- Web: [v1.23.0](RELEASE_NOTES_V1_23_0.md): triển khai tìm/lọc kiến thức và mục lục bài; nghiệm thu sau phát hành ghi riêng. [v1.22.0](RELEASE_NOTES_V1_22_0.md) hoàn thiện Catalog công khai và quyền đọc anon.
- PC: `desktop-v1.1.1`, bản vá tìm CRM tương ứng. Số phiên bản PC và web độc lập.
- Đã phát hành: [web v1.23.0](https://github.com/infiniti-money/Web-Design/releases/tag/v1.23.0) · [PC 1.1.1](https://github.com/infiniti-money/Web-Design/releases/tag/desktop-v1.1.1).
- Bản nâng cấp giao diện trước đó: [báo cáo triển khai](PROFESSIONAL_UPGRADE.md). Bản nền tảng CMS/desktop: [báo cáo kiểm thử](ADMIN_UPGRADE_REPORT.md).

## Đối chiếu những hạn chế trong ghi chú cũ

| Hạng mục | Hiện trạng / bước tiếp theo |
| --- | --- |
| v1.5: tìm CRM chưa khớp tiếng Việt không dấu | Hoàn thiện trong v1.18; kiểm thử SQL rollback và trình duyệt. |
| v1.1–1.3: chưa có database, Pages hoặc CAPTCHA | Là trạng thái lịch sử; backend/website đã triển khai ở các phiên bản sau. Không dùng các dòng này để kết luận hệ thống hiện chưa kết nối. |
| v1.12: thống kê theo tên, chưa có tài khoản nhân viên | Hệ thống tài khoản/phân quyền và giao việc theo user đã có từ v1.13; vẫn cần nghiệm thu tài khoản Nhân viên thực. |
| v1.6–1.13: nghiệm thu bằng tài khoản thật | Cần doanh nghiệp cung cấp email nhân viên và thực hiện luồng thư mời/đăng nhập. Không tự mời người dùng hoặc dùng tài khoản SQL giả làm bằng chứng. |
| v1.4: email CRM; v1.6–1.9: email/thông báo đẩy | Tiếp tục hoãn theo lựa chọn đã ghi nhận; không tự bật gửi thông báo. |
| v1.17: phê duyệt và phiên bản hợp đồng | Đã có snapshot được duyệt và kiểm thử; trạng thái ký là ghi nhận bên ngoài, không phải chữ ký số. Checklist cũ là tài liệu chuẩn bị nghiệm thu, không phủ nhận việc release v1.17 đã phát hành. |
| Nội dung công trình, ảnh và pháp nhân | Chờ tài liệu thật/xác nhận của chủ website. Không tự tạo hồ sơ công trình minh họa thành công trình thật. |
| CMS công khai phục vụ SEO | v1.19 có HTML tĩnh theo slug, schema, sitemap và đồng bộ bài đã duyệt qua API công khai. Kiểm thử bài tổng hợp trong CMS dùng fixture; chưa ghi bài thử production. |
| Windows | Đã có feed cập nhật; chưa ký số, chưa nghiệm thu nâng cấp trên máy người dùng cài phiên bản cũ. |

## Các ghi chú theo thứ tự phiên bản

Kiểm chứng phát hành 05/11/2026: [triển khai Pages](https://github.com/infiniti-money/Web-Design/actions/runs/41938181600), [browser smoke sau deploy](https://github.com/infiniti-money/Web-Design/actions/runs/41938359037), [gói nguồn web](https://github.com/infiniti-money/Web-Design/actions/runs/41938190521) và [bộ cài Windows](https://github.com/infiniti-money/Web-Design/actions/runs/41938190526) đều thành công. `release.json` trên website khớp commit `4c2d8d63a726ddc6a3683b18c12eb3c57423cb27`. Gói nguồn web tải về đã khớp SHA-256; feed PC trả version 1.1.1. Kiểm thử SQL không thay thế đăng nhập bằng tài khoản nhân viên thực.

- [v1.0](RELEASE_NOTES.md): website demo ban đầu.
- [v1.1](RELEASE_NOTES_V1_1.md), [v1.1.1](RELEASE_NOTES_V1_1_1.md), [v1.1.2](RELEASE_NOTES_V1_1_2.md): nền tảng Admin và Supabase.
- [v1.2](RELEASE_NOTES_V1_2.md): API tư vấn được bảo vệ.
- [v1.3](RELEASE_NOTES_V1_3.md), [v1.3.1](RELEASE_NOTES_V1_3_1.md), [v1.3.2](RELEASE_NOTES_V1_3_2.md), [v1.3.3](RELEASE_NOTES_V1_3_3.md), [v1.3.4](RELEASE_NOTES_V1_3_4.md): CAPTCHA, consent, lưu giữ và ghi nhận liên hệ.
- [v1.4](RELEASE_NOTES_V1_4_0.md): nền tảng email CRM.
- [v1.5](RELEASE_NOTES_V1_5_0.md): phân trang/tìm/lọc CRM.
- [v1.6](RELEASE_NOTES_V1_6_0.md), [v1.7](RELEASE_NOTES_V1_7_0.md): lịch chăm sóc, ghi chú và lịch sử chỉnh sửa.
- [v1.8](RELEASE_NOTES_V1_8_0.md), [v1.9](RELEASE_NOTES_V1_9_0.md), [v1.10](RELEASE_NOTES_V1_10_0.md): giao việc, Kanban và chỉnh sửa nhiệm vụ.
- [v1.11](RELEASE_NOTES_V1_11_0.md), [v1.12](RELEASE_NOTES_V1_12_0.md): ưu tiên và hiệu suất.
- [v1.13](RELEASE_NOTES_V1_13_0.md), [v1.13.1](RELEASE_NOTES_V1_13_1.md): tài khoản và bảo mật vai trò.
- [v1.17](RELEASE_NOTES_V1_17_0.md): báo giá và hợp đồng.
- [v1.18](RELEASE_NOTES_V1_18_0.md): CRM không dấu và hợp nhất nền tảng quản trị mới.
- [v1.19](RELEASE_NOTES_V1_19_0.md): kiến thức HTML, nội dung nền và [lộ trình chuyên nghiệp](WEBSITE_ROADMAP.md).
- [v1.20](RELEASE_NOTES_V1_20_0.md): hiệu suất/khả năng sử dụng trang chủ, tiếp tục chặng 4/6.
- [v1.21](RELEASE_NOTES_V1_21_0.md): trạng thái gửi tư vấn và [nghiệm thu chuyển đổi](CONSULTATION_ACCEPTANCE.md).
- [v1.21.1](RELEASE_NOTES_V1_21_1.md): bản tích hợp main; giữ tag/gói nguồn v1.21.0 đã tạo trước hợp nhất.
- [v1.22](RELEASE_NOTES_V1_22_0.md): Catalog công khai và [nghiệm thu quyền đọc/chia sẻ](CATALOG_PUBLIC_ACCEPTANCE.md).
- [v1.23](RELEASE_NOTES_V1_23_0.md): tìm/lọc kiến thức và [nghiệm thu trải nghiệm đọc](KNOWLEDGE_EXPERIENCE_ACCEPTANCE.md).

Không tạo ghi chú v1.14–v1.16 hoặc tag lịch sử giả chỉ để lấp số thứ tự. Các module tương ứng đã có trong nguồn; chỉ ghi nhận release khi có bằng chứng phát hành.

Đã tải trọn bộ cài PC 1.1.1 qua feed stable (121.547.909 byte) và đối chiếu SHA-512 khớp metadata. Đây là kiểm tra tải và tính toàn vẹn, chưa phải nghiệm thu cài nâng cấp trên máy người dùng đang có bản cũ. Bản cài tiếp tục chưa ký số.
