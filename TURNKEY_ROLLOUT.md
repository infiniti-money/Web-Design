# Thiết kế, thi công trọn gói — v1.26.0

Quyết định của chủ website ngày 08/11/2026: **chưa có đơn giá được phép công khai; dựng công cụ chờ cấu hình**. Giữ form tư vấn, tawk.to và cơ chế tiếp nhận hiện tại; chuẩn bị tích hợp Zalo/Email sau. Không gửi tin, tạo file Excel trên dịch vụ ngoài hoặc đăng hồ sơ khách từ đợt này.

## Bản công khai hiện tại

- Hero cao theo màn hình, giữ ảnh minh họa hiện có, CTA chuẩn bị dự toán, phong cách màu xanh đậm/ngà và bố cục mobile. Không thay ảnh cũ bằng video kho rồi gọi là công trình bàn giao.
- Sáu bước: khảo sát, thiết kế 3D, báo giá, sản xuất tại xưởng, thi công, nghiệm thu. Đây là khung trao đổi, không xác nhận sở hữu xưởng hoặc cam kết tiến độ áp dụng cho mọi hợp đồng.
- Ba nguyên tắc trao đổi về vật liệu, phạm vi ngân sách và hồ sơ bàn giao. Không đăng “tiết kiệm 20%”, “chính xác 99%”, “không phát sinh” hoặc số năm bảo hành chưa được xác nhận.
- Công cụ nhận diện tích căn hộ 10–1.000 m², phòng ngủ và mức đầu tư. Khi đơn giá chưa được duyệt/hết hiệu lực thì không tính hoặc hiển thị tiền. Sau khi khách chọn tiếp tục, ghép nhu cầu vào form hiện có, giữ nội dung cũ, không nhân đôi và không vượt giới hạn 1.000 ký tự. Chưa gửi dữ liệu cho tới khi khách nhập liên hệ, đồng ý chính sách, qua xác minh và gửi form; chỉ thông báo tiếp nhận theo phản hồi API hiện tại.
- Portfolio dựng tối đa năm hồ sơ đã xác nhận từ `content/projects.json`. Hiện nguồn có **0 công trình đã xác nhận**, nên hiển thị thông báo cập nhật hồ sơ; sáu ảnh/ý tưởng minh họa cũ vẫn tách biệt. Không thêm công trình giả để đủ 3–5 thẻ.
- Trang dự án hỗ trợ vật liệu chủ đạo, chi phí được phép công khai, nhật ký và đối chiếu 3D/thực tế hoặc trước/sau. Có fallback hai ảnh được gắn nhãn khi không có JavaScript. Thanh kéo dùng được bằng bàn phím, chỉ bật sau xác nhận cùng góc tham chiếu; không tự suy diễn phần trăm chính xác.

Giữ domain, Title, Description, canonical, thẻ chia sẻ, ảnh và liên kết/ID cũ. Các section/CTA mới bổ sung ID/liên kết; kiểm thử bảo toàn metadata/ảnh và toàn bộ đích cũ vẫn bắt buộc. H1/nội dung hiển thị được thay theo thiết kế mới. Không đổi Supabase, RLS, Admin, payOS hoặc dữ liệu khách.

## Bật video thật

Cấu hình `heroVideo` trong `content/conversion.json` mặc định `null`. Chỉ thêm khi có file được phép công bố và bằng chứng xác nhận riêng:

```json
{
  "src": "assets/media/ten-video.mp4",
  "caption": "Mô tả đúng công trình và nguồn được phép công bố",
  "rightsConfirmed": true,
  "realFootageConfirmed": true
}
```

File local MP4/WebM phải tồn tại trong `assets/media/`, tối đa 20 MiB; có thể dùng URL HTTPS không chứa thông tin đăng nhập. Khuyến nghị clip ngắn, nén và bỏ âm thanh nếu không cần. Chưa có video thật nên nút xem đang ẩn. Video không có `src` khi tải trang, `preload=none`, chỉ nạp sau thao tác xem; có controls và nút trở về ảnh. Chưa nghiệm thu giải mã/phát một video production thực tế.

## Duyệt đơn giá

`estimate` mặc định `enabled:false`, `approved:false`, không có giá. Khi doanh nghiệp có bảng giá và phạm vi được duyệt, khai báo version, `validUntil` dạng ISO có múi giờ và đủ ba gói `economy`, `balanced`, `premium`. Mỗi gói có số nguyên VND `minPerM2`, `maxPerM2`, `perBedroom`; max phải lớn hơn hoặc bằng min. Không lấy giá fixture trong tests làm giá kinh doanh.

Công thức: **khoảng chi phí = diện tích × khoảng đơn giá/m² + số phòng ngủ × phụ phí/phòng**. Chỉ áp dụng nếu doanh nghiệp phê duyệt công thức và xác định rõ phần nào đã bao gồm trong m² để tránh tính trùng phòng ngủ. Có thể đặt phụ phí bằng 0. Cần đối chiếu thuế, vận chuyển, thiết bị, hiện trạng, phần loại trừ và điều kiện thay đổi. Đây là tổng sơ bộ; bảng chi tiết theo hạng mục vẫn được lập và duyệt ở nghiệp vụ báo giá.

Hết `validUntil`, trình duyệt ngừng tính tiền dù artifact cũ còn được cache. Đổi cấu hình qua Git/Pages, không đưa khóa nhà cung cấp hoặc chứng từ cá nhân vào JSON. Bản dựng chỉ xuất các trường công khai cho phép; không chấp nhận bật giá thiếu phê duyệt hoặc thiếu phiên bản.

## Hồ sơ công trình chuyên sâu

Giữ cấu trúc dự án hiện có và chốt `published`, `realProjectConfirmed`, quyền ảnh. Trường bổ sung:

- `featured: true` để chọn lên trang chủ (tối đa năm; nếu chưa đánh dấu thì chọn tối đa năm hồ sơ công khai đã xác nhận).
- `materials: ["Tên vật liệu đã đối chiếu"]`.
- `budget: "Phạm vi chi phí được phép nêu"` cùng `budgetPublicConfirmed:true`. Không công khai giá của khách nếu chưa được phép.
- `beforeAfter.type: "design-real"` hoặc `"before-after"`; `sameViewConfirmed:true` để bật slider. Hai ảnh vẫn phải có quyền, nguồn, alt và kích thước. Hình 3D/ảnh hiện trường cần cùng góc tham chiếu để so sánh có ý nghĩa.
- `journal` tối đa 20 mốc, mỗi mốc có heading, description, date YYYY-MM-DD; ảnh tùy chọn dùng cùng bộ kiểm tra quyền ảnh. Loại bỏ mặt người, biển số, địa chỉ/căn hộ chi tiết nếu chưa được phép công bố.

Admin/Supabase vẫn quản lý danh sách cũ. Hồ sơ HTML chuyên sâu dùng nguồn đã biên tập ở `content/projects.json`; không tự coi bấm công khai bản ghi Supabase là đã xuất bản hồ sơ HTML.

## Local SEO và chăm sóc tự động tiếp theo

Chỉ thêm Hưng Yên/Hà Nội hoặc tên chung cư khi doanh nghiệp xác nhận vùng phục vụ/công trình thật và quyền công bố. Không sinh trang chỉ đổi địa phương. Tiêu đề công trình có thể nêu loại dịch vụ, tên dự án và khu vực khi đủ bằng chứng; canonical/sitemap theo slug hiện có.

Giữ form tư vấn và tawk.to theo lựa chọn mới. CRM hiện có xuất CSV cho tài khoản đủ quyền, có thể mở bằng Excel. Chưa bật ZNS/Messenger, tự gửi bảng giá qua Email hoặc đồng bộ Excel bên ngoài. Giai đoạn sau cần tài khoản doanh nghiệp, kênh được chọn, template được duyệt, cấu hình server-side, đồng ý nhận tin, kiểm soát gửi trùng và trạng thái gửi; không báo “đã gửi” từ thao tác trình duyệt đơn thuần.

## Kiểm chứng và giới hạn

Node kiểm tra giá chưa duyệt/hết hạn, công thức, biên đầu vào, video/quyền ảnh, portfolio tối đa năm, chi phí công khai, nhật ký và fallback. Playwright trên artifact fixture kiểm tra 320/390/1440 px, chuyển nhu cầu giữ form/consent, không tự POST, không tải video lúc vào trang, slider bằng bàn phím và không JavaScript. Hình thật cũ được xem lại trên preview, không tràn ngang; tiếp tục chạy kiểm thử tư vấn và trang chủ hiện có.

Các bộ kiểm tra này không phải UAT video/công trình/đơn giá thật, không chứng minh xưởng hay chính sách bảo hành. Kết quả CI, triển khai online và số đo Lighthouse được cập nhật sau phát hành; không cam kết tốc độ dưới ba giây trên mọi mạng.
