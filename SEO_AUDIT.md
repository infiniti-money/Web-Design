# Kiểm toán nền tảng website — 04/11/2026

Repo được kiểm tra: [infiniti-money/Web-Design](https://github.com/infiniti-money/Web-Design), nhánh `main` tại thời điểm clone. Báo cáo phân biệt dữ kiện trong mã nguồn với thông tin cần chủ website xác nhận.

## Hiện trạng xác minh được

- Website là HTML/CSS/JavaScript tĩnh trên GitHub Pages; Admin và dữ liệu Supabase đang cùng repo. Mã nguồn có luồng đăng nhập, quản lý khách hàng và dự án; giữ nguyên các phần đó trong đợt SEO này.
- README đang dùng địa chỉ `https://infiniti-money.github.io/Web-Design/`. Khi kiểm tra trực tiếp ngày 04/11/2026, trang chủ trả HTTP 200; `/robots.txt` và `/sitemap.xml` trả 404.
- Trước khi chỉnh sửa, trang công khai chỉ có trang chủ, `catalog.html` và `privacy.html`; dịch vụ chưa có URL riêng. Sau đợt này, đã có trang dịch vụ tổng quan và ba trang dịch vụ tĩnh theo URL riêng.
- `supabase/schema.sql` đánh dấu rõ dữ liệu dự án mẫu. README ghi 6 dự án minh họa và nói ảnh/tên/mô tả chưa phải công trình đã thi công thực tế. Những nội dung này không nên giới thiệu như hồ sơ công trình thật.
- Ảnh hiện dùng URL `images.unsplash.com`, không có sổ theo dõi tác giả, giấy phép hoặc quyền đối với đối tượng xuất hiện trong ảnh. Unsplash cho phép dùng ảnh theo giấy phép của họ, nhưng hướng dẫn chính thức nêu quyền với người, thương hiệu, tác phẩm và tài sản được chụp có thể cần xác minh riêng: [Unsplash License](https://unsplash.com/license), [Releases and Trademarks](https://help.unsplash.com/en/articles/2612329-releases-and-trademarks).
- Chủ website đã xác nhận **ATELIER HOME** là tên sử dụng trên website; đã thống nhất tên trong trang công khai, trang tài khoản và giao diện quản trị. Thông tin đăng ký pháp lý, địa chỉ hành chính và khu vực phục vụ vẫn chưa được xác nhận, nên chưa xuất bản JSON-LD `LocalBusiness`.
- Chủ website đã chọn URL chính tắc **`https://infiniti-money.github.io/Web-Design/`**; không dùng custom domain ở giai đoạn này.
- Kiểm tra gốc hostname `https://infiniti-money.github.io/robots.txt` trả HTTP 404 ngày 04/11/2026. Theo [hướng dẫn robots.txt của Google](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt), file phải nằm tại gốc hostname. Bản `/Web-Design/robots.txt` không điều khiển crawl cho GitHub Pages project; cần đặt bản này tại user-site gốc nếu có quyền quản lý. Không có robots không đồng nghĩa chặn crawl; meta `noindex` trên các trang riêng vẫn được giữ, sitemap có thể khai báo qua Search Console.
- `admin.html` và phần lớn trang tài khoản đã đặt `noindex`; `set-password.html` trước đợt này chưa có chỉ thị đó.
- Trước đợt này, CI đã có kiểm thử tĩnh, API và trình duyệt nhưng chưa có bài kiểm tra SEO riêng. Đợt này bổ sung kiểm thử SEO, kiểm tra đầu ra HTML tĩnh và đo Lighthouse local; chưa có dữ liệu Core Web Vitals thực địa hoặc quyền Search Console.

## Lỗi theo mức ưu tiên

### P1 — cần xử lý trước khi đẩy mạnh SEO

1. **Supabase còn chứa sáu bản ghi minh họa đang `published=true`.** Đã đổi phần hiển thị trên trang chủ thành “Ý tưởng không gian” và nêu rõ ảnh minh họa. Các bản ghi này không được chuyển tự động thành hồ sơ công trình hoặc URL dự án SEO. Khi có dữ liệu thật, cần cập nhật lại nội dung tương ứng.
2. **Thông tin doanh nghiệp còn cần bổ sung.** Tên hiển thị ATELIER HOME và URL GitHub Pages đã chốt. Cần thông tin pháp lý/địa chỉ/điện thoại, email và khu vực phục vụ đã xác nhận để khai báo LocalBusiness đáng tin cậy. Trạng thái quyền sở hữu Search Console chưa xác minh được từ repo.
3. **Thiếu nền tảng crawl/preview.** Trước đợt này không có canonical, sitemap, robots, Open Graph, favicon hoặc structured data trên các trang công khai; sitemap và robots trả 404.

### P2 — cần xử lý trong các giai đoạn kế tiếp

4. **Trang công trình theo slug đã có luồng tạo HTML, còn chờ nội dung thật.** Ba trang dịch vụ có URL riêng; generator tạo `/du-an/<slug>/`, gallery và phần trước/sau từ JSON. Catalog vẫn mở chi tiết bằng dialog; trang kiến thức chưa triển khai.
5. **Nội dung thương hiệu và dữ liệu mẫu chưa đủ để viết SEO địa phương.** Cần tài liệu dịch vụ thật, quy trình, vật liệu, phạm vi nhận công trình, ảnh trước/sau và thông tin đo lường.
6. **Chưa có đo lường hiệu năng/a11y thực địa.** Cần Lighthouse trên domain chính, thiết bị di động, kiểm tra bàn phím/độ tương phản và kiểm thử biểu mẫu sau khi dữ liệu và nội dung được chốt.

## Hoàn tất trong clone hiện tại

- Thêm canonical, Open Graph, thẻ Twitter và JSON-LD `WebSite`/`WebPage`/`CollectionPage` cho trang chủ, catalog và chính sách, dùng thương hiệu ATELIER HOME. Structured data không khẳng định pháp nhân, địa chỉ hay dịch vụ địa phương chưa xác minh.
- Thêm favicon SVG, hình Open Graph 1200×630 tự dựng, `robots.txt`, `sitemap.xml`, trang 404; thêm `noindex` cho trang thiết lập mật khẩu.
- Tạo trang dịch vụ tổng quan cùng trang chi tiết thiết kế, thi công và tư vấn/trang trí; sitemap và trang chủ liên kết tới các URL này. CTA mang loại dịch vụ sang biểu mẫu để chọn sẵn dịch vụ.
- Cố định cấu hình thương hiệu và URL đã xác nhận trong `content/site.json`; thống nhất tên hiển thị, chính sách và tên file CSV thành ATELIER HOME. Không thay đổi định danh nghiệp vụ, khóa idempotency hoặc dữ liệu CRM.
- Thêm generator công trình tĩnh, mẫu dữ liệu và hướng dẫn tại `content/README.md`. Nội dung chưa xác nhận là công trình thật hoặc ảnh chưa có quyền sử dụng sẽ không được dựng thành trang xuất bản. Nguồn hiện có 0 công trình; trang tổng quan hiển thị trạng thái cập nhật, đặt noindex và không vào sitemap.
- Generator gỡ trang cũ và URL sitemap khi bỏ xuất bản; không ghi đè file thủ công. CI kiểm tra HTML/sitemap đã đồng bộ với nội dung; test kiểm tra cả slug không hợp lệ, chèn HTML, dữ liệu nháp và thao tác gỡ trang.
- Trang chủ bỏ Supabase JS SDK khỏi lần tải đầu; chỉ gọi REST API với publishable key khi portfolio gần màn hình. Widget Turnstile cũng đợi gần biểu mẫu hoặc tương tác.
- Thêm `tests/seo.test.cjs` để kiểm tra metadata, JSON-LD, sitemap, noindex, liên kết nội bộ, heading H1, tài sản ảnh, URL dịch vụ và ánh xạ CTA.
- Tối ưu URL ảnh Unsplash theo kích thước mục tiêu, tải ưu tiên cho ảnh hero và tải trễ cho ảnh dưới màn hình; chỉnh màu chữ để cải thiện độ tương phản.
- Mọi thay đổi nằm trên nhánh local `codex/seo-foundation-audit`; chưa đẩy lên GitHub, vì vậy website đang chạy chưa nhận các tệp SEO mới.

## Xác minh trên bản local

Đo bằng Lighthouse 13.6.0 tại `http://127.0.0.1:4173/` ngày 04/11/2026. Đây là phép đo phòng thí nghiệm trên máy local, không phải dữ liệu thực địa (CrUX) hay kết quả trên domain đã phát hành.

| Thiết bị | Hiệu năng | Trợ năng | Best practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Mobile | 88 | 100 | 100 | 100 | 3,5 giây | 0 | 0 ms |
| Desktop preset | 99 | 100 | 100 | 100 | 1,0 giây | 0,001 | 0 ms |

Mobile còn dư địa cải thiện LCP; ảnh hero tải sớm và được phát hiện ngay trong HTML. Kết quả có thể thay đổi theo mạng, cache và phản hồi ảnh bên thứ ba. Lighthouse cho trang chủ không thay thế việc kiểm tra bàn phím/thao tác thật trên nhiều thiết bị.

Trang chi tiết thi công được đo riêng trên mobile: 100 điểm ở cả bốn hạng mục, LCP 0,8 giây, CLS 0, TBT 0 ms. Bộ test Node hiện có 54 bài: 53 đạt, 1 bài gửi lead tổng hợp được chủ động bỏ qua để tránh ghi dữ liệu thử vào hệ thống thật; kiểm tra GET dự án công khai đạt HTTP 200 và truy vấn ẩn danh bảng inquiries bị từ chối.

Browser smoke trên bản local đã đạt sau khi đồng bộ cách kiểm tra với tải trễ: API dự án, lọc/bàn phím, biểu mẫu có và không có kết nối API, Admin/CRM giả lập, xuất CSV và mobile không tràn ngang. POST biểu mẫu được chặn và phản hồi giả lập trong trình duyệt; các thao tác CRM dùng dữ liệu giả lập, không ghi Supabase thật. Trang tổng quan công trình được kiểm tra riêng trên mobile: HTTP 200, canonical chính xác, noindex khi chưa có nội dung, menu bàn phím và chuyển tới dịch vụ hoạt động.

## Cần xác nhận để tiếp tục

- Chủ website sẽ gửi hồ sơ công trình thật và ảnh được phép đăng; có thể đưa vào mẫu `content/project.template.json` khi có dữ liệu.
- Khu vực nhận dự án, thông tin pháp lý/liên hệ và mức chi tiết địa điểm nào được phép công khai.
- Quyền truy cập Search Console/Analytics (nếu đã thiết lập). Repo không cho biết trạng thái xác minh hoặc dữ liệu hiệu suất tìm kiếm.
