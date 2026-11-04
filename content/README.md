# Nội dung công trình ATELIER HOME

Domain chính tắc đã xác nhận: `https://infiniti-money.github.io/Web-Design/`.

`projects.json` là nguồn bài viết và ảnh cho các trang HTML tĩnh `/du-an/<slug>/`. Dữ liệu CRM, người dùng, biểu mẫu và bảng dự án Supabase tiếp tục vận hành như hiện tại. Thay đổi trong Admin/Supabase không tự sửa bài viết tĩnh; cập nhật nội dung ở file này và tạo lại HTML trước khi phát hành.

## Thêm công trình thật

1. Sao chép đối tượng từ `project.template.json` vào mảng `projects` trong `projects.json`.
2. Điền tên, slug, loại không gian, mô tả, nội dung giải pháp và ảnh thật. Có thể dùng cùng slug đang có trong Supabase để đối chiếu. `location` chỉ ghi mức địa điểm được phép công khai.
3. Đặt ảnh local trong `assets/projects/<slug>/`, hoặc dùng URL HTTPS công khai. Điền mô tả ảnh (`alt`), kích thước gốc và người sở hữu/tác giả (`credit`). Đặt `rightsConfirmed: true` khi đã xác nhận quyền sử dụng từng ảnh.
4. Đặt `realProjectConfirmed: true` cho công trình đã xác nhận thực tế. `published: false` giữ bản nháp; chuyển thành `true` khi nội dung sẵn sàng công khai.
5. Chạy các lệnh sau từ thư mục repo rồi xem thay đổi trong Git:

```powershell
node scripts/build-project-pages.cjs
node scripts/build-project-pages.cjs --check
node --test tests/project-pages.test.cjs tests/seo.test.cjs
```

HTML đầu ra nằm ở `du-an/`; sitemap được tạo lại từ `site.json` và các công trình đã xuất bản. Không chỉnh tay file HTML có dòng `ATELIER GENERATED PROJECT PAGE`. CI kiểm tra HTML và sitemap có khớp dữ liệu nguồn hay không.

## Thư viện ảnh và ảnh trước/sau

`gallery` là mảng ảnh có cùng các trường như `cover`, có thể thêm `caption`. Tùy chọn `beforeAfter` gồm hai ảnh `before` và `after`; trang chi tiết hiển thị hai ảnh cùng nhãn rõ ràng, sử dụng được khi không có JavaScript.

```json
{
  "beforeAfter": {
    "before": {
      "src": "assets/projects/slug-cong-trinh/before.webp",
      "alt": "Mô tả hiện trạng trước cải tạo",
      "width": 1600,
      "height": 1000,
      "credit": "Người sở hữu ảnh",
      "rightsConfirmed": false
    },
    "after": {
      "src": "assets/projects/slug-cong-trinh/after.webp",
      "alt": "Mô tả không gian sau hoàn thiện",
      "width": 1600,
      "height": 1000,
      "credit": "Người sở hữu ảnh",
      "rightsConfirmed": false
    }
  }
}
```

## Gỡ xuất bản

Chuyển `published` thành `false` rồi tạo lại HTML. Generator xóa trang cũ do chính nó quản lý và gỡ URL khỏi sitemap. Các file viết tay khác được giữ lại. Nếu chưa có công trình thật, trang tổng quan hiển thị trạng thái đang cập nhật, đặt `noindex` và không nằm trong sitemap. Sáu dự án minh họa hiện tại không được nhập tự động vào nguồn này.
