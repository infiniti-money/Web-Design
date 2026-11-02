# Tân Design v1.18.0 — Cổng nghiệm thu trước migration và Release

**Trạng thái:** bản nháp PR #18. Không chạy migration SQL lên production và không phát hành khi còn điều kiện chưa đạt.

## Kiểm thử tự động đã đạt — 02/11/2026
- [x] [Node/CI Validate](https://github.com/infiniti-money/Web-Design/actions/runs/41406003677) chạy bộ kiểm thử cấu trúc.
- [x] [Chromium preview desktop và mobile](https://github.com/infiniti-money/Web-Design/actions/runs/41406003689) — editor, snapshot giả lập, xuất PDF A4.
- [x] [Windows 2022 Chromium](https://github.com/infiniti-money/Web-Design/actions/runs/41406003686) — tính tiền, tạo PDF A4 trên Windows runner, màn hình 390 px. **Không thay thế** thử máy in Windows thực hay Safari iOS.
- [x] Supabase SQL test trong `BEGIN ... ROLLBACK` với **JWT giả lập trên mã tài khoản Admin/Quản lý hiện hữu**: Manager không duyệt được; sai tổng tiền bị chặn; Admin duyệt và hợp đồng gắn đúng phiên bản; UPDATE/DELETE phiên bản và sửa qua RPC sau duyệt đều bị chặn.
- [x] Đối chiếu sau rollback: 2 hồ sơ tư vấn, 1 báo giá, 1 phiên bản và 1 hợp đồng giữ nguyên; `commercial_quote_totals` chưa được cài trên production.
- [x] Bản in có tên Tân Design, chi tiết hạng mục, đơn giá, VAT/tổng tiền và nhãn nháp/đã duyệt, không in banner demo.

## Chưa đạt / phải xác nhận trước khi phát hành
- [ ] Đăng nhập Admin thật qua Supabase Auth trên máy tính, xác minh quyền, tạo/sửa hạng mục, phê duyệt, in thử bản v1.18; không chia sẻ mật khẩu, JWT hoặc ảnh chứa thông tin khách hàng ra nơi công cộng.
- [ ] Đăng nhập Quản lý thật, xác minh tạo và trình báo giá nhưng không thể phê duyệt hoặc sửa phiên bản đã duyệt.
- [ ] Đăng nhập Nhân viên thật để xác minh bị chặn truy cập. Hiện chưa có tài khoản Nhân viên active.
- [ ] In trên Edge/Chrome Windows bằng máy in hoặc Microsoft Print to PDF. Xem trước và kiểm tra khổ A4, dấu tiếng Việt, nhiều trang, tiêu đề bảng lặp và không cắt số liệu.
- [ ] Kiểm tra thật trên điện thoại Android/iOS; chạy xem trước bản in hoặc Share/Print, đối chiếu font, tràn ngang, thao tác thêm dòng.
- [ ] Kiểm tra phiên bản đã được Admin duyệt trong dữ liệu thật không đổi, hợp đồng đã lưu vẫn tham chiếu đúng phiên bản. Kiểm tra trên bản sao/transaction rollback trước; không chỉnh sửa dữ liệu khách đang sử dụng.
- [ ] Đánh giá Supabase Security Advisor warning cũ về các RPC `SECURITY DEFINER`; không gỡ quyền cần thiết nếu chưa thay thế bằng API an toàn.
- [ ] Xác nhận sao lưu và kiểm tra count trước/sau migration, tối thiểu `inquiries`, `customer_quotes`, `customer_quote_versions`, `customer_contracts`, `commercial_audit`.

## Phương án migration an toàn (sau khi ký duyệt UAT)
1. Xác minh đúng Supabase project `mswiegltusllzvuavjdh`; sao lưu trước thao tác.
2. Áp dụng `supabase/quotes-detailed-v1_18.sql`, sau đó `supabase/quotes-version-lock-v1_18.sql` **trong cùng một quy trình migration được ghi nhận**.
3. Kiểm tra kết quả số lượng bản ghi và quyền `EXECUTE` của hàm tính tiền (không cấp trực tiếp cho `anon` hoặc `authenticated`).
4. Chạy regression SQL có rollback; kiểm tra RPC bằng tài khoản được ủy quyền.
5. Chỉ khi nghiệm thu đạt: gộp PR #18 vào `main`, xác minh GitHub Pages, phát hành tag `v1.18.0`.

**Không dùng script rollback để xác nhận đăng nhập thật.** Nó kiểm tra ràng buộc phía SQL và mô phỏng quyền JWT, không kiểm tra cookie/phiên người dùng trong trình duyệt.
