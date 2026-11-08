# Xuất bản Catalog HTML

Catalog vẫn quản lý tại `admin-catalog.html` trên Supabase hiện tại. Không thêm bảng, sửa RLS hoặc chuyển dữ liệu. Bản dựng chỉ GET các hàng `published=true` bằng publishable key, chọn đúng trường công khai, phân trang tối đa 5.000 mục và dừng nếu API lỗi. Bản dựng lỗi không thay website đang chạy.

## URL và cập nhật

- Giữ nguyên `catalog.html` và link cũ `catalog.html?item=<uuid>` cùng bộ lọc, dialog, nút chia sẻ.
- Thêm `catalog/` và `catalog/muc-<uuid>/`. ID cố định là phần định danh của slug; sửa tên không đổi URL. Thứ tự dùng `sort_order`, sau đó ID, giống ý nghĩa thứ tự quản trị.
- Chi tiết có HTML hoàn chỉnh, canonical riêng, H1, Open Graph, WebPage/Breadcrumb JSON-LD và liên hệ tư vấn. Không suy diễn Product, giá, tồn kho, đánh giá hay công trình đã thi công.
- Pages dựng mới khi đẩy main hoặc theo lịch phút 17/47 mỗi giờ. GitHub có thể chạy trễ. Xác nhận deploy thành công và `catalog-publication.json` online trước khi coi thay đổi đã công khai. Gỡ `published` sẽ bỏ URL khỏi artifact kế tiếp; bản cũ còn chạy nếu deploy lỗi.

## Duyệt nội dung và quyền ảnh độc lập

Mặc định mục được công khai vẫn `noindex,follow`, không nằm trong sitemap. Không xuất ảnh của mục sang trang HTML mới nếu chưa có xác nhận quyền. Việc này không sửa ảnh hay dữ liệu của catalog cũ.

Chỉ sau khi chủ website cung cấp và xác nhận hồ sơ, người biên tập mới thêm bản ghi vào `content/catalog-publication.json`:

```json
{
  "schema": 1,
  "items": [{
    "id": "uuid-thuc-cua-muc",
    "contentApproved": true,
    "imageRightsConfirmed": true,
    "imageAlt": "Mô tả đúng ảnh",
    "imageCredit": "Nguồn và chủ sở hữu đã được xác nhận",
    "imageWidth": 1200,
    "imageHeight": 800
  }]
}
```

Ví dụ trên là cấu trúc, không phải UUID hợp lệ để đưa vào chạy. Không đưa giấy tờ, dữ liệu cá nhân hoặc chứng từ quyền ảnh vào kho công khai. Lưu bằng chứng riêng, chỉ khai báo các trường được phép công bố.

`contentApproved` yêu cầu mô tả hữu ích tối thiểu 120 ký tự và biên tập xác minh; ngưỡng này là chốt chất lượng nội bộ, không phải yêu cầu của Google. `imageRightsConfirmed` còn yêu cầu HTTPS, alt, nguồn và kích thước đúng. Duyệt nội dung không tự duyệt ảnh; quyền ảnh không tự bật index. Danh mục `catalog/` chỉ được index khi có ít nhất một mục nội dung đã duyệt. Danh mục vẫn có thể dẫn tới mục tham khảo noindex và ghi rõ trạng thái biên tập.

## Kiểm tra

```text
node --test tests/catalog-static.test.cjs tests/public-audit.test.cjs
node tests/catalog-static-browser.cjs
node scripts/build-pages.cjs dist/ten-thu-muc-moi --cms
node scripts/audit-public.cjs
```

Playwright cần được cài để chạy kiểm tra trình duyệt. Output build phải mới/rỗng. Không dùng khóa dịch vụ hoặc thông tin merchant. Kiểm tra không tạo báo giá, thanh toán, lead hay tin nhắn thật.
