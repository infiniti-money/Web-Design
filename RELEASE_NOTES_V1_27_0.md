# ATELIER HOME web 1.27.0

Thêm trợ lý Gemini tư vấn theo không gian, diện tích, phòng ngủ, phong cách, ưu tiên và chủ đề. AI dùng bốn bài hướng dẫn công khai; không đọc CRM hoặc nhận tên/điện thoại/tài liệu riêng. Opt-in riêng giải thích cách Google xử lý dữ liệu ở Free tier. Câu trả lời chỉ là tham khảo, không tự tạo giá/cam kết hay giao dịch.

Backend giữ khóa trong Supabase secrets, Turnstile action riêng, quota nguyên tử 20 lượt/ngày toàn website và 5 lượt/giờ theo mạng, timeout/giới hạn input-output. Không tự retry hoặc đổi sang provider tính phí. UI hỗ trợ chuyển nhu cầu sang form hiện có, giữ nội dung và quyền quyết định gửi của khách.

Thêm Node/Playwright/SQL isolated cho bảo mật, quota, opt-in, phục hồi và mobile. Khóa Gemini được kiểm tra API trực tiếp; kích hoạt công khai còn phụ thuộc xác nhận Free tier. Xem AI_CONSULTATION_RUNBOOK.md để biết trạng thái và bằng chứng cuối cùng. Giữ metadata, ảnh, URL, Admin/Supabase/payOS/tawk.to. Đây là bản web, không phải bộ cài PC mới.
