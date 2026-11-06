# ATELIER HOME web v1.23.0 — Tìm và đọc hướng dẫn

Ngày: 07/11/2026. Tiếp tục chặng 2/3 của lộ trình, giữ GitHub Pages và nguồn bài đã xuất bản.

- Tìm tiêu đề/mô tả bài bằng tiếng Việt có hoặc không dấu, kết hợp lọc chủ đề. URL lưu lựa chọn để tải lại hoặc chia sẻ; có số kết quả, trạng thái không tìm thấy và nút xóa bộ lọc.
- Tất cả thẻ bài vẫn có trong HTML. JavaScript chỉ lọc nội dung đã dựng, không gọi thêm API hoặc tải SDK; khi tắt JavaScript vẫn đọc được toàn bộ bài và liên kết.
- Bài chi tiết có mục lục HTML, neo cho từng heading, liên kết đến từng phần, thời gian đọc ước tính và liên kết về đầu bài. Hỗ trợ in và giảm chuyển động.
- Không thêm bài hoặc dữ liệu công trình giả, không thay schema/RLS, tài khoản hoặc dữ liệu khách hàng. Gói PC vẫn ở phiên bản độc lập 1.1.1.

Thực hiện chức năng và triển khai trước, sau đó kiểm thử sâu trên URL Pages theo yêu cầu chủ website; giữ nguyên các chốt kiểm tra CI hiện có. Bằng chứng sau phát hành ghi trong [nghiệm thu trải nghiệm kiến thức](KNOWLEDGE_EXPERIENCE_ACCEPTANCE.md). Chưa ghi nhận đạt khi chưa chạy kiểm tra thực tế.
