# PR #18 → v1.20: Bảo vệ lịch sử phiên bản báo giá

## Phạm vi được chuyển

Nhánh PR #18 cũ có tính tổng server, trình nhập hạng mục, bản in PDF và khóa sửa/xóa phiên bản. Ở v1.20, giao diện hiện hành đã có báo giá theo dòng, tính VND/thuế/giảm trừ, trigger kiểm tra tổng khi INSERT, xuất PDF theo snapshot và phân quyền RPC theo vai trò hiện tại. **Không sao chép** giao diện, công thức hoặc bản \`commercial_action\` từ PR #18 vì sẽ ghi đè các cải tiến/bảo mật mới hơn.

Tính năng còn thiếu được chuyển riêng là: một bản ghi \`public.customer_quote_versions\` đã INSERT thì không thể UPDATE hoặc DELETE, kể cả khi có quyền bảng, chỉ tạo phiên bản mới. Giữ nguyên dữ liệu lịch sử, các chức năng ghi qua \`commercial_action\`, schema và URL hiện tại.

## Kiểm thử mã nguồn và cơ sở dữ liệu

- Workflow \`Validate ATELIER HOME\` chạy các bài Node sẵn có, kiểm tra SQL migration và thêm job PostgreSQL 17 **cách ly**, không dùng khóa hoặc dữ liệu Supabase production.
- \`tests/quote-version-guard-isolated.sql\` tạo bảng/role giả trong một transaction, áp dụng migration **2 lần** để kiểm tra idempotency, kiểm tra trigger bật đúng 1 lần, không lộ EXECUTE tới \`anon\`/\`authenticated\`, tạo phiên bản mới thành công, chặn UPDATE/DELETE phiên bản cũ, đã duyệt và mới, chặn cả bảng chủ sở hữu và vai trò \`authenticated\` có quyền ghi. Kết thúc bằng ROLLBACK.
- Những bài thử này **không chứng minh** đã nghiệm thu Supabase Auth thật, backup/restore độc lập hoặc migrate production.

## Điều kiện bắt buộc trước khi áp dụng lên Supabase hiện hữu

1. Xác nhận project/environment đích, tạo backup **có thể khôi phục** và thử restore trên môi trường riêng (bao gồm chính sách Auth/Storage), ghi thời điểm và đối chiếu số bản ghi.
2. Kiểm tra migration hiện tại có các bảng, \`private\` schema và \`commercial_action\`; trên môi trường staging dùng đúng migration của PR này, chạy SQL regression nghiệp vụ đầy đủ.
3. Kiểm thử bằng phiên Supabase Auth **thật** của Admin, Quản lý và vai trò không được phép. Xác minh lưu phiên bản mới vẫn thành công; phiên bản đã duyệt và hợp đồng vẫn trỏ đúng snapshot; UPDATE/DELETE bị từ chối như thiết kế. Không đưa token hay dữ liệu khách lên GitHub.
4. Phê duyệt triển khai SQL, áp dụng duy nhất file \`supabase/migrations/20261105093000_quote_version_immutability.sql\` qua quy trình migration có ghi lịch sử, không chạy lại các migration v1.17/v1.18 cũ. Xác nhận trigger bật, kiểm tra số lượng và quyền, theo dõi lỗi.
5. **Cổng phát hành**: chỉ đưa SQL vào production sau backup, UAT thật, đánh giá quyền và biên bản đối chiếu đạt. Merge code vào \`main\`/triển khai GitHub Pages **không đồng nghĩa** SQL đã được áp dụng.

## Phục hồi

Khi cần hoàn tác thay đổi hành vi trong tình huống khẩn cấp, sau khi được phê duyệt và xác minh dữ liệu, có thể gỡ riêng trigger \`commercial_quote_version_append_only\` bằng một migration đảo mới, rồi kiểm tra lại chức năng; không chạy \`DROP TABLE\`, không ghi đè báo giá và không tự động khôi phục dữ liệu trên production. Giữ lại hàm private là vô hại. SQL trên chỉ tạo hàm/trigger, không sửa/xóa bản ghi hiện có.
