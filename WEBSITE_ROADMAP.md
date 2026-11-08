### Cập nhật thực hiện — 08/11/2026

Đợt v1.25 tiếp tục chặng 2/3/6: Catalog có HTML tĩnh theo ID, giữ URL cũ và dữ liệu Admin; thêm bài gốc đối chiếu hồ sơ vật liệu; bổ sung kiểm toán SEO GET-only theo lịch và sau deploy. Không index nội dung chưa xác minh, không xuất ảnh chưa xác nhận. Kiểm tra trước phát hành: 127/128 Node đạt (1 gửi thật bỏ qua), 2 bài an toàn PC đạt, Catalog không JavaScript/bàn phím/mobile và Catalog cũ đạt. Chờ xác minh Actions/URL online ở phần cập nhật phát hành.

Các ghi chú phía dưới phản ánh từng thời điểm. Cổng backup/quote-history từng còn mở ở v1.24 đã được xử lý trong đợt payOS sau đó: có sao lưu độc lập, thử phục hồi cách ly, bảo vệ lịch sử báo giá; thu đại trà đã được chủ website yêu cầu và kích hoạt sau thử 10.000 đồng cùng xác nhận ngân hàng. Xem PAYOS_GENERAL_RELEASE.md để đối chiếu bằng chứng, không coi những việc này là thay đổi trong đợt Catalog.

Còn mở: dữ liệu pháp lý/liên hệ/vùng phục vụ, công trình và quyền ảnh thật; nghiệm thu tài khoản/PC thực; Search Console và CWV thực địa. Thứ tự tiếp theo là duyệt nội dung thật → xuất bản công trình/catalog đủ hồ sơ → UAT nhân sự/PC → theo dõi chuyển đổi/CWV. Không đánh dấu hoàn tất toàn bộ sáu chặng.

 Lộ trình website chuyên nghiệp ATELIER HOME

Ngày lập: 05/11/2026. Giữ GitHub Pages, thương hiệu ATELIER HOME, Supabase và tài khoản hiện tại. Thời lượng dưới đây là ước lượng công việc, không phải cam kết lịch khi thiếu dữ liệu/nghiệm thu.

| Chặng | Kết quả bàn giao | Điều kiện đạt | Ước lượng |
| --- | --- | --- | --- |
| 1. Chuẩn hóa nền tảng | Kiểm kê URL, nguồn nội dung, lỗi ưu tiên và kênh phát hành | Không mất URL/dữ liệu; có cách phục hồi bản trước | 1–2 ngày |
| 2. Website công khai | Trang dịch vụ, công trình theo slug, catalog, kiến thức, liên hệ; điều hướng mobile thống nhất | Mỗi nội dung có URL riêng, dùng được bằng bàn phím và trên điện thoại | 3–5 ngày |
| 3. Nội dung và SEO | HTML bài viết, canonical, sitemap, Article/Breadcrumb schema, metadata chia sẻ và cụm nội dung gốc | Đọc bài khi tắt JavaScript; không index bản nháp; cập nhật/gỡ bài đúng | 3–5 ngày cho nền tảng, biên tập liên tục |
| 4. Chuyển đổi tư vấn | CTA theo dịch vụ, biểu mẫu dễ hiểu, chống spam, xác nhận và xử lý lỗi | Không mất nội dung khi lỗi, không báo thành công giả; kiểm tra trên thiết bị thật | 2–3 ngày |
| 5. Vận hành | CMS, dự án, CRM, nhân sự, báo giá, tài khoản và PC | Kiểm tra đúng quyền; nghiệm thu Admin/Quản lý/Nhân viên thực | 3–5 ngày nghiệm thu, tính năng nền đã có |
| 6. Hiệu suất và phát hành | Kiểm thử tự động, đo Lighthouse/CWV, kiểm tra dữ liệu có cấu trúc, Search Console và theo dõi lỗi | Chỉ công bố số đo đã chạy; không hứa thứ hạng hay Google index | 2–3 ngày thiết lập, theo dõi liên tục |

## Đợt thực hiện bắt đầu ngay

Ưu tiên P0: giữ các lớp bảo vệ và phát hành đã có. P1: hoàn thiện HTML tĩnh cho kiến thức và bài CMS đã duyệt, vì hiện các trang này phụ thuộc JavaScript và noindex. Bổ sung ba bài gốc dạng hướng dẫn chuẩn bị nhu cầu, đọc báo giá và chuẩn bị nghiệm thu; không tự nhận đã thi công dự án, không tạo đánh giá khách hàng hoặc giá bán minh họa thành thông tin thật.

Luồng mục tiêu: Admin duyệt bài trong CMS → bộ dựng đọc API công khai → sinh HTML, metadata, schema, sitemap → CI kiểm tra → Pages triển khai. Đồng bộ định kỳ giúp bài mới/sửa/gỡ phản ánh lên website; lịch GitHub có thể trễ, không coi thời điểm lưu CMS là thời điểm deploy thành công. Nếu API lỗi, dừng bản dựng và giữ bản đang chạy.

Kiểm chứng bắt buộc: loại nháp/bài hẹn giờ; chống chèn HTML/script và URL không an toàn; slug không thoát thư mục; không xuất dữ liệu nội bộ; bài có nội dung khi JavaScript tắt; kiểm tra responsive và link; triển khai rồi đối chiếu commit thực tế. Đợt này không thay đổi database hoặc tăng quyền API.

## Phần cần doanh nghiệp cung cấp

Tiến độ đợt v1.19: đã lập lộ trình; đã dựng danh mục/bài kiến thức HTML, ba bài gốc, metadata/schema/sitemap và luồng đọc bài CMS công khai; kiểm thử Node và trình duyệt khi tắt JavaScript đạt. Việc triển khai thực tế được xác nhận sau khi Actions hoàn tất. Các chặng còn lại tiếp tục theo tiêu chí trong bảng, không đánh dấu hoàn thành chung.

Đã triển khai và đối chiếu `release.json` online ở commit `4f3c9e4aeab4c0bcb40edbf2deed232f217f1c92`. [Pages deployment](https://github.com/infiniti-money/Web-Design/actions/runs/41940468321) và [gói phát hành v1.19](https://github.com/infiniti-money/Web-Design/actions/runs/41940476601) thành công. Đã đo Lighthouse trang chủ/mục Kiến thức; xem [kết quả và việc còn phải tối ưu](PERFORMANCE_BASELINE.md). Chặng 6 mới hoàn thành đo ban đầu, chưa có Search Console/CWV thực địa.

[Browser smoke sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/41940527081) thành công, gồm kiểm tra Kiến thức không JavaScript và chuyển URL cũ. Không coi toàn bộ lộ trình đã hoàn tất; các đầu vào doanh nghiệp ở dưới và những điểm tối ưu trong báo cáo vẫn còn mở.

- Xác nhận tên pháp lý, thông tin liên hệ và khu vực phục vụ để công khai chính xác.
- Hồ sơ công trình thật, nội dung mô tả và ảnh có quyền sử dụng; đã ghi nhận chủ website sẽ gửi.
- Email nhân viên và cho phép gửi lời mời để nghiệm thu đăng nhập thực; không dùng fixture SQL làm bằng chứng.
- Quyết định kích hoạt email/thông báo đẩy và cấu hình nhà cung cấp khi muốn mở lại hạng mục đang hoãn.
- Quyền Search Console/đo lường khi triển khai phần tương ứng; không tự chèn mã đo lường chưa được xác nhận.

## Cách đánh giá hoàn thành

Đợt v1.24 (07/11/2026) ưu tiên P0/P1 của chặng 5: kiểm tra quyền công trình với Auth/nhân sự hiện tại, không tin claim Admin cũ; lưu/xóa có xác nhận ID, bảo toàn biểu mẫu, cảnh báo chưa lưu, khóa gửi trùng và không hiển thị danh sách/số liệu cũ khi lỗi. Migration policy đã áp dụng và SQL rollback đạt, dữ liệu 6 công trình giữ nguyên checksum. Giao diện triển khai trước rồi kiểm thử sâu sau; bằng chứng cập nhật trong [nghiệm thu quản trị công trình](PROJECT_ADMIN_ACCEPTANCE.md). Quote history, backup độc lập và UAT thật vẫn là cổng riêng.

Đã hoàn tất đợt kỹ thuật v1.24: web chạy revision `df691d92ad57b004fa09d8a34ad024433e631d7b`, Validate/PostgreSQL cách ly, Pages và browser smoke mới đều thành công; Node đạt 96/97 bài với 1 bài gửi thật bỏ qua. Phát hành Windows Manager 1.1.2 (Setup/Portable), Electron smoke thật và 4 bài an toàn/updater đạt; Setup tải qua feed stable khớp SHA-512, nguồn web khớp SHA-256. Chưa nghiệm thu cài nâng cấp trên máy cũ, tài khoản thật hoặc ký mã Windows. Chi tiết và cách phân biệt tag với nhánh chính trong [báo cáo v1.24](PROJECT_ADMIN_ACCEPTANCE.md).

Đợt v1.23 (07/11/2026) tiếp tục chặng 2/3: tìm bài không dấu, lọc chủ đề và URL giữ bộ lọc; mục lục HTML/neo heading, thời gian đọc ước tính và hỗ trợ in. Triển khai chức năng trước rồi kiểm thử sâu sau theo yêu cầu chủ website, giữ chốt CI hiện có. Trạng thái và bằng chứng cập nhật trong [nghiệm thu trải nghiệm kiến thức](KNOWLEDGE_EXPERIENCE_ACCEPTANCE.md); không sửa database hoặc tạo nội dung doanh nghiệp giả.

Đã triển khai v1.23.0 tại revision `6ec7849d4372606f71863afe778eb3a7ad901fe9`, xác nhận `release.json`. Sau triển khai, hai bộ browser kiến thức đều đạt trên Pages; bộ Node mở rộng 96/97 bài đạt, 1 bài gửi thật bỏ qua. Validate, Pages và gói phát hành thành công; checksum nguồn tải về khớp. Giữ các việc cần nội dung thật, UAT và CWV/Search Console ở trạng thái mở.

Đã xử lý lượt CI hết thời gian do tải font Ubuntu bằng image Playwright có sẵn trình duyệt, khóa phiên bản và digest. Website hiện ở revision `68005aeab6ae0d63a2761796332ec06b06ae7bf1` sau cập nhật CI/tài liệu; Validate, Pages và hai lượt browser CI mới đều thành công. Toàn bộ các ca browser tương đương cũng đã đạt trực tiếp trên Windows hướng vào website; không ghi dữ liệu thật. Bằng chứng chi tiết ở [báo cáo kiến thức](KNOWLEDGE_EXPERIENCE_ACCEPTANCE.md).

Đợt v1.22 tiếp tục chặng 2/5 với Catalog công khai: REST nhẹ, URL chia sẻ/khôi phục bộ lọc, phân trang và trạng thái lỗi rõ. Sửa policy làm anon bị 401 do tham chiếu staff_profiles; giữ bảng nhân sự riêng tư và kiểm tra Admin hiện hành. SQL rollback, API public thực tế và browser fixture đã đạt. Xem CATALOG_PUBLIC_ACCEPTANCE.md; dữ liệu sản phẩm/ảnh thật và trang SEO độc lập còn mở.

Xác minh lại ngày 07/11/2026: website chạy revision `d3489e0bf7a3a1ebeea340ff30d151d1ebd9ea9b`, giữ cập nhật CMS/Delivery từ nhánh chính sau gói nguồn v1.22.0. Pages và browser smoke thành công; hai bộ browser Catalog chạy trực tiếp trên Pages đều đạt. Bộ Node hiện tại đạt 94/95 bài, 1 bài gửi thật bỏ qua; API Catalog public 200 và bảng nhân sự vẫn chặn 401. [Bằng chứng và phạm vi còn mở](CATALOG_PUBLIC_ACCEPTANCE.md). Chặng 2/5 tiếp tục mở cho nội dung thật và UAT, không coi một mục hiện có là bộ Catalog doanh nghiệp hoàn chỉnh.

Đợt v1.21 tiếp tục chặng 4: khóa biểu mẫu khi gửi, xác nhận thành công/bắt đầu yêu cầu mới, giữ nội dung khi lỗi, timeout không tự gửi lại, khôi phục xác minh và CTA không che liên hệ. Xem [bảng nghiệm thu tư vấn](CONSULTATION_ACCEPTANCE.md). Kiểm thử bằng fixture đạt; việc tiếp nhận thật của doanh nghiệp và thiết bị thật vẫn chưa đánh dấu hoàn thành.

Bản tích hợp v1.21.1 giữ các nâng cấp main song song về Operations/CRM/CMS/Catalog, thống nhất timeout 15 giây; tổng 85/86 bài Node đạt (1 bài gửi thật bỏ qua). Tag v1.21.0 lưu nguồn trước hợp nhất; bản triển khai nhánh chính dùng v1.21.1. Xem RELEASE_NOTES_V1_21_1.md để phân biệt phạm vi của hai gói.

Đã xác minh v1.21.1 online ở revision `3fa98aef3b794145f262ecbeb45ee5def354a80f`; kiểm thử CI và trực tiếp trên trang công khai đều đạt bằng dữ liệu giả lập. Bằng chứng trong CONSULTATION_ACCEPTANCE.md. Chặng 4 đã bổ sung trạng thái/khôi phục lỗi, còn nghiệm thu tiếp nhận thật và thiết bị thật; không bổ sung theo dõi người dùng hoặc bật email ngoài phạm vi đã cho phép.

Đợt v1.20 xử lý phông chữ chặn hiển thị, ảnh responsive và nhãn truy cập trên trang chủ; bổ sung nhánh liên hệ khi JavaScript tắt. Kiểm thử 69/70 bài đạt (1 bài gửi dữ liệu thật chủ động bỏ qua), browser smoke và home experience đạt. So sánh local cho thấy font không còn nằm trong danh sách tài nguyên chặn render và lỗi nhãn đã hết; số đo online ghi sau triển khai.

Đã triển khai v1.20, đối chiếu revision `9d338249fc0aae4147a815c7e80297fe5b43d8b4`; CI triển khai và browser smoke đều thành công. Online đo 93 hiệu suất / 100 Accessibility / 100 Best Practices / 100 SEO. Đây là cải thiện cấu trúc tải và nhãn, chưa có bằng chứng tăng tốc tổng thể ổn định so với lần đo cũ; xem số đo đầy đủ trong PERFORMANCE_BASELINE.md. Chặng 4 và 6 tiếp tục mở cho nghiệm thu thật/CWV, không tự đánh dấu hoàn thành toàn bộ.

Mỗi đợt có ghi chú phạm vi, kiểm thử, URL đang chạy và giới hạn còn lại. Cập nhật bảng này theo bằng chứng thực tế. Các chặng 4–6 và nghiệm thu doanh nghiệp chưa tự động được xem là hoàn tất khi chỉ có giao diện hoặc build thành công.

## Chặng 5 — Đợt điều phối vận hành (05/11/2026)

- Bổ sung `operations.html` (Trung tâm vận hành) cho Admin và Quản lý, sử dụng Auth hiện tại và kiểm soát dữ liệu bằng RLS; không tạo bảng mới.
- Hàng đợi chỉ đọc: công việc quá hạn, đến hạn trong 7 ngày, báo giá chờ duyệt, bài chờ duyệt, số nhân sự hoạt động chỉ với Admin. Tổng số theo phạm vi tài khoản có thể đọc, không giả định tất cả hồ sơ trong doanh nghiệp.
- Không đưa dữ liệu khách hàng lên dashboard, không ghi trạng thái hoặc gửi thông báo; lỗi tải số liệu hiển thị `–`, không bị quy thành 0. Thao tác xử lý vẫn đặt tại các trang nghiệp vụ sẵn có.
- Bộ kiểm thử gồm Node cho Auth/role/count/filter, GitHub Pages package và desktop allowlist, Chromium smoke trên bản Pages sau triển khai. Các giới hạn nghiệm thu thật và kiểm thử khôi phục được ghi tại `OPERATIONS_RUNBOOK.md`.
- Các hạng mục chưa xác nhận: đăng nhập UAT với Admin/Quản lý/Nhân viên thật; backup/restore độc lập; kích hoạt migration quote history riêng; số liệu CWV/Search Console. Không đánh dấu hoàn thành chặng 5 chỉ vì deploy trang thành công.

## Chặng 4 — Trải nghiệm tư vấn an toàn (đợt tiếp theo, 05/11/2026)

- Trang chủ bổ sung hướng dẫn ba bước tư vấn và nhắc dịch vụ đã chọn từ trang dịch vụ (`?service=design|build|styling`); không bổ sung trường nhạy cảm vào URL hay lưu thông tin người dùng trên trình duyệt.
- Yêu cầu gửi đến Edge Function có giới hạn thời gian chờ 15 giây, khóa nút gửi khi đang xử lý và dùng `aria-busy` cho biểu mẫu. Khi API xác nhận `ok:true`, mới hiển thị tiếp nhận thành công và xóa form.
- Khi timeout/lỗi mạng/không có phản hồi xác nhận, giao diện không khẳng định dữ liệu chắc chắn chưa được ghi; bảo toàn form và hướng dẫn liên hệ kiểm tra trước khi gửi lại để tránh trùng. Không tự động gửi lại, không thay đổi API/Turnstile/Supabase.
- Ghi nhận kiểm thử Node/Playwright, giao diện di động, lỗi 429/403/mạng không ổn định và bản Pages triển khai. Nghiệm thu khách hàng thật và phép đo conversion/CWV vẫn là việc riêng, không đánh dấu đạt nếu chưa có bằng chứng.

## Đợt nâng cấp quản trị công trình & Catalog

- Catalog: tìm không dấu, lọc nháp/công khai, cảnh báo giới hạn 500 kết quả, xác nhận trước khi công khai/xóa, cảnh báo thay đổi chưa lưu, kiểm chứng kết quả ghi/xóa với ID từ Supabase. Không tự xuất bản mục nào.
- Công trình: sắp xếp thứ tự quản trị/ngày tạo/tên, báo rõ giới hạn 200 bản ghi, kiểm tra đường dẫn ảnh HTTPS và số thứ tự hợp lệ, xác nhận trước khi công khai.
- Trang công trình tĩnh vẫn dùng nguồn nội dung có xác minh ảnh riêng; xuất bản danh sách dự án không được đồng nhất với việc có hồ sơ dự án HTML. Không thay schema, tài khoản, RLS hay dữ liệu production.

## Đợt CRM, điều phối công việc và CMS

- CRM: khi truy vấn hồ sơ lỗi, ẩn dữ liệu trang cũ và khóa xuất CSV; thống kê lỗi hiển thị “—” thay vì giữ số cũ hoặc báo 0.
- Công việc: sau khi đổi tiến độ, đọc lại `status` theo RLS trước khi báo thành công, tránh PostgREST UPDATE 0 hàng không lỗi; yêu cầu xác nhận khi mở lại việc đã hoàn thành. Bảng/đếm lỗi không được coi là dữ liệu hợp lệ.
- CMS: thêm bộ kiểm tra trước xuất bản, lối tắt bài chờ duyệt, xác nhận xuất bản, đổi liên kết kiểm tra HTML sang đường dẫn thật `kien-thuc/<slug>/`. Bài hẹn giờ/chưa triển khai chưa được tuyên bố đã hiện trên Pages.
- Không tăng quyền dữ liệu, không thay schema/RLS, không xuất bản bài mới hoặc thao tác khách hàng thật từ CI. Kiểm thử trình duyệt dùng fixture Supabase trong bộ nhớ; UAT tài khoản thật vẫn cần nghiệm thu riêng.

## Nghiệm thu đợt v1.25

Đã triển khai và đối chiếu revision `044282a2390563185bfa75107653a3dadf5b1442`. Validate, PostgreSQL cách ly, Pages, browser sau triển khai và SEO/Lighthouse đều thành công. Báo cáo online 31 trang: 0 P1, 1 P2 robots gốc. [Bằng chứng và việc còn mở](SEO_AUDIT.md). Catalog và bài vật liệu đọc được không JavaScript; không sửa DB hoặc tạo dữ liệu/giao dịch doanh nghiệp thật. Các đầu vào còn thiếu phía trên tiếp tục để mở.

Gói [web v1.25.0](https://github.com/infiniti-money/Web-Design/releases/tag/v1.25.0) đã phát hành; [workflow đóng gói](https://github.com/infiniti-money/Web-Design/actions/runs/42431918553) thành công. Tải lại ZIP nguồn và đối chiếu SHA-256 với SHA256SUMS.txt đạt: `d073fa12391c445ea64e3d9aebe6bb7bab2e498607684467a96c0775e0591b95` (716773 byte). Tag giữ nguồn revision trên; bản cập nhật tài liệu sau đó không đổi gói hoặc giao diện.

## Đợt vận hành v1.25.1 — 08/11/2026

Đối chiếu các mục chặng 4/5 và CRM/Catalog/CMS: phần nền đã có, đợt này xử lý thêm số liệu vận hành cũ và thay đổi quyền trong lúc tải. Xóa snapshot khi refresh/logout/offline, giới hạn 15 giây, kiểm tra lại cùng tài khoản/vai trò active sau khi đọc; hủy/loại phản hồi cũ. Không sửa schema/RLS hoặc tạo dữ liệu doanh nghiệp. [Ma trận đối chiếu, cách vận hành và giới hạn UAT](OPERATIONS_RUNBOOK.md). Bằng chứng online được bổ sung sau khi triển khai và Actions hoàn tất.

## Nghiệm thu phát hành v1.25.1 — 08/11/2026

Online release.json khớp `f0db0853c600db7f0071af779e9f6ae1a84881f3`. [Validate trước triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42432751205), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42432751049), [browser sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42432788286) và [SEO/Lighthouse](https://github.com/infiniti-money/Web-Design/actions/runs/42432788274) đều thành công. Node: 130 bài, 129 đạt và 1 gửi lead thật bỏ qua; an toàn route PC: 2/2 đạt.

Kiểm tra lại operations-browser-smoke.cjs trực tiếp trên Pages cũng đạt toàn bộ tình huống vai trò, thu hồi quyền, timeout/thử lại, logout/phản hồi muộn và offline/online. Dữ liệu Auth/count chỉ là fixture trong bộ nhớ, không xác nhận UAT bằng tài khoản thật. CMS/báo giá, tư vấn, công trình và Catalog đều qua kiểm tra fixture; không ghi dữ liệu production hoặc phát hành bộ cài PC trong đợt này.

Gói [web v1.25.1](https://github.com/infiniti-money/Web-Design/releases/tag/v1.25.1) đã phát hành; [workflow đóng gói](https://github.com/infiniti-money/Web-Design/actions/runs/42432940589) thành công. Đã tải lại ZIP và xác minh SHA-256 với SHA256SUMS.txt: `525ff5bb709ffa673a5c3b68e7348a9e4ad59e7bb5dd5593aeec606c07ec04bf` (721987 byte). Cập nhật tài liệu sau tag không sửa giao diện hoặc gói đã phát hành.

## Đợt chuyển đổi trọn gói v1.26 — 08/11/2026

Theo yêu cầu bố cục hero/portfolio/quy trình sáu bước và dự toán, bổ sung trang chủ cùng mẫu hồ sơ chuyên sâu có vật liệu, nhật ký và đối chiếu ảnh. Chủ website xác nhận chưa có đơn giá: công cụ chỉ tổng hợp/chuyển nhu cầu vào form, chờ cấu hình được duyệt. Giữ tawk.to và tiếp nhận hiện tại; chưa tự gửi Zalo/Email. Video thật, công trình, giá, xưởng và các cam kết chưa xác nhận không được thay bằng dữ liệu giả. [Phạm vi, cấu hình và nghiệm thu](TURNKEY_ROLLOUT.md).

## Xác minh triển khai v1.26 — 08/11/2026

Bản online đối chiếu release.json revision `66a270a87ac63a1807eabf8de24ed80760b2e1ea`. [Validate/SQL cách ly/Playwright](https://github.com/infiniti-money/Web-Design/actions/runs/42434145973), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42434146004), [browser sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42434184720) và [SEO/Lighthouse](https://github.com/infiniti-money/Web-Design/actions/runs/42434184663) đều thành công. Node: 135 bài, 134 đạt, 1 gửi thật bỏ qua; an toàn route PC 2/2.

Kiểm tra thêm trực tiếp bản Pages ở 390 px: sáu bước, diện tích 95 m² chuyển vào form, họ tên/điện thoại trống và consent chưa chọn; không POST/không tạo lead thật. Config giá tắt, video không có src, 0 công trình thật. Kiểm toán GET-only 31 trang/12 URL sitemap: 0 P1, 1 P2 robots gốc. Ba mẫu Lighthouse cho LCP 3,26/2,23/2,23 giây, một mẫu vượt 3 giây; [bảng số đo và giới hạn](PERFORMANCE_BASELINE.md).

Không đánh dấu video/công trình/đơn giá thật hoặc gửi Zalo/Email đạt nghiệm thu khi chưa có đầu vào. Bản này là website, không phát hành bộ cài PC mới.

Gói [web v1.26.0](https://github.com/infiniti-money/Web-Design/releases/tag/v1.26.0) đã phát hành; [workflow đóng gói](https://github.com/infiniti-money/Web-Design/actions/runs/42434352733) thành công. ZIP tải lại khớp SHA-256 trong SHA256SUMS.txt: `028894c1ca8d6f64ba93c52917f073adfd93eabcdd032e51dae9fdc2a53f5e5e` (744136 byte). Tài liệu cập nhật sau tag không sửa giao diện/gói đã phát hành.

## Trợ lý tư vấn Gemini v1.27 — 08/11/2026

Theo lựa chọn dùng miễn phí, tích hợp Gemini qua máy chủ thay vì gọi OpenAI đã hết số dư. Tư vấn bằng lựa chọn cấu trúc, dựa trên bốn bài công khai, opt-in và Turnstile riêng; không gửi liên hệ hoặc CRM sang AI. Chốt 20 lượt/ngày toàn website, 5 lượt/giờ theo mạng, không tự nâng gói/provider. Gemini đã trả lời mẫu tổng hợp HTTP 200; công khai vẫn tắt tới khi chủ website xác nhận project đang Free tier. [Runbook AI, hạn mức, dữ liệu và nghiệm thu](AI_CONSULTATION_RUNBOOK.md).

## Nghiệm thu kỹ thuật v1.27 — 08/11/2026

Website online đối chiếu release.json đúng revision `5f1ae5b9bd5b0bf7e83328d1c78243cd8516ffe7`. [Validate/SQL/Playwright](https://github.com/infiniti-money/Web-Design/actions/runs/42436952367), [Pages](https://github.com/infiniti-money/Web-Design/actions/runs/42436952441), [browser sau triển khai](https://github.com/infiniti-money/Web-Design/actions/runs/42436986181), [payOS cách ly/SDK](https://github.com/infiniti-money/Web-Design/actions/runs/42436952446) và [SEO/Lighthouse](https://github.com/infiniti-money/Web-Design/actions/runs/42436986182) đều thành công. Node: 141 bài, 140 đạt, 1 gửi lead thật bỏ qua; 2/2 an toàn route PC đạt.

AI backend đã triển khai, model Gemini đã kiểm tra trực tiếp HTTP 200. SQL quota đã kiểm tra trên PostgreSQL 17 cách ly và thử production trong transaction rollback; không giữ counter thử hoặc ghi khách. Trực tiếp kiểm tra UI Pages ở 390 px: opt-in chưa chọn, AI tắt thì không POST, human handoff điền nhu cầu nhưng giữ liên hệ/consent trống. Cửa sổ không tràn ngang. Kiểm toán online 31 trang/12 URL sitemap: 0 P1, 1 P2 robots gốc.

Trạng thái chốt đợt: **AI_ENABLED=false**. Đang chờ chủ website xác nhận project của khóa Gemini thuộc Free tier/chưa liên kết thanh toán, đúng yêu cầu dùng miễn phí. Chưa nghiệm thu trả lời AI qua Turnstile thật của khách trên production; không coi health/model API thành công là hoàn tất bước này. Tawk.to và form tư vấn tiếp tục hoạt động. Không yêu cầu nạp OpenAI hoặc tự nâng gói Google.

Gói [web v1.27.0](https://github.com/infiniti-money/Web-Design/releases/tag/v1.27.0) đã phát hành; [workflow đóng gói](https://github.com/infiniti-money/Web-Design/actions/runs/42437279176) thành công. ZIP tải lại khớp SHA-256: `5b5a26d3da9b354142acefc97ca40b3c302d0d6a9d319493a35134c1c97f1479` (776894 byte). Cập nhật tài liệu sau tag không sửa gói hoặc giao diện.
