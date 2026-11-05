# ATELIER HOME web v1.21.1 — Tích hợp luồng tư vấn với nhánh chính mới

Ngày: 05/11/2026.

Trong lúc hoàn thiện v1.21.0, main có thêm các commit nâng cấp Operations, CRM/CMS, Catalog/dự án và bảo vệ lịch sử báo giá. Lần push main đầu tiên bị từ chối fast-forward; v1.21.0 chỉ có tag/gói nguồn nhánh làm việc. Bản này hợp nhất main tới a2be922, giữ các thay đổi đó và không viết lại tag/release đã xuất bản.

Luồng tư vấn giữ hướng dẫn ba bước và ghi nhận dịch vụ đã chọn từ main, cùng khóa trường khi gửi, ngăn gửi lặp, xác nhận/bắt đầu lại và nút khôi phục captcha của v1.21.0. Thống nhất mốc timeout 15 giây theo main. Phản hồi 429/mạng/chưa rõ xác nhận dùng trạng thái cảnh báo; không tự gửi lại hoặc khẳng định chưa ghi dữ liệu. Retry-After chỉ điều khiển thời gian có thể thao tác lại khi trình duyệt đọc được header, không tạo POST tự động.

Sau hợp nhất: 86 bài Node, 85 đạt và 1 bài gửi lead thật bỏ qua. Bộ consultation recovery đạt, gồm timeout 15 giây, API lỗi, captcha, POST trùng và xác nhận mobile. Các bộ consultation context, CMS, Catalog, Operations và browser smoke được chạy lại bằng fixture. Kiểm tra PostgreSQL cô lập trong CI tiếp tục giữ nguyên; không tự áp dụng migration mới vào database production trong đợt tích hợp này.

Không phát hành lại ứng dụng PC trong đợt này. Nghiệm thu tiếp nhận yêu cầu thật và thiết bị thật vẫn còn mở theo CONSULTATION_ACCEPTANCE.md.
