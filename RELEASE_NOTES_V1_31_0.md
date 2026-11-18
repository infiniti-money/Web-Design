# ATELIER HOME 1.31.0 — Nền xuyên suốt và hệ khung kính mờ

Toàn bộ trang công khai dùng một nền ảnh phủ viewport khi cuộn, thay các dải nền đặc bằng mặt kính sáng/tối có độ tương phản rõ. Rà soát khung giới thiệu, quy trình, công trình, dịch vụ, dự toán, tư vấn, bài viết, Catalog, FAQ, bộ lọc, popup và footer; thống nhất bo góc, đường viền, nút và trường nhập.

Các trang tài khoản, khôi phục, trả về thanh toán và404 dùng nền kiến trúc cục bộ và khung kính; quản trị/Manager1.3.1 bổ sung các khung vận hành, công trình, báo cáo, nghiệm thu, thanh toán, chat. Không đổi Auth, schema/RLS, dữ liệu hoặc nội dung SEO.

Mobile dùng mức blur nhỏ hơn, không thêm vòng xử lý cuộn JavaScript. Có fallback thiếu backdrop-filter và chế độ giảm độ trong suốt/chuyển động. Kiểm thử18 route công khai/tài khoản ở4 kích thước, giữ nguyên các kiểm thử tương tác, form và phân quyền. Catalog no-JS kiểm tra từng viewport trong context riêng để tránh lỗi native View Transition khi resize giữa chuyển trang.
