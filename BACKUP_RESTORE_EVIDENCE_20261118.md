# Sao lưu trước chat — 18/11/2026

Bản logical backup mới lưu riêng ngoài Git/OneDrive tại C:\AtelierPrivateBackups\2026-11-18-pre-chat-141737; ACL chủ máy và SYSTEM. Không đưa dump, session hoặc dữ liệu khách vào repository. Roles/schema/data COPY, lịch sử migration và Auth/Storage schema tham chiếu được xuất bằng CLI đăng nhập hiện tại.

Khôi phục trong container riêng public.ecr.aws/supabase/postgres:17.11.0.011, network none, không publish cổng, PostgreSQL không nghe TCP, cron.launch_active_jobs=off. Chỉ thay skeleton Auth/Storage trống của đích thử. Transaction ON_ERROR_STOP đã COMMIT. 59/59 bảng COPY có số dòng khớp dump; bổ sung 84 migration Auth và 80 migration Storage. Counts và hash nội dung projects/customer_quotes/customer_quote_versions khớp nguồn hiện tại. Manifest SHA-256 và log chi tiết giữ ở thư mục riêng.

Migration chat đã tạo được trên bản phục hồi; bộ SQL fixture độc lập kiểm tra RLS, owner, idempotency, read markers, cursor trùng timestamp, anonymous/expired/deleted session và direct-write denial. Không gửi tin/email, gọi merchant hay chuyển tiền từ lần thử.

Production: migration internal_staff_chat ghi trong lịch sử dịch vụ phiên bản 20261118165744; file CLI cục bộ 20261118165415_internal_staff_chat.sql có cùng SQL, không chạy lại file lên production. Kiểm tra metadata sau áp dụng: ba bảng RLS, anon không SELECT, authenticated không INSERT trực tiếp, 0 public SECURITY DEFINER chat, realtime publication có chat_messages; lúc xác minh có 0 phòng/0 tin. Không thay bảng hay policy nghiệp vụ cũ.

Advisor không thêm cảnh báo bảo mật do chat; bốn index mới báo unused trên bảng trống là dự kiến. Các cảnh báo cũ về public definer nghiệp vụ, leaked-password protection và index nghiệp vụ vẫn chưa được giải quyết trong đợt này.

Giới hạn: dump tuần tự không phải snapshot nguyên tử xuyên toàn hệ thống; chưa khôi phục Auth service/Storage blobs/Edge secrets, chưa có bản mã hóa trên thiết bị khác, chưa UAT tài khoản thật. Kết quả này chỉ xác nhận mức database.

Tham chiếu các cảnh báo cũ: [public SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [bảo vệ mật khẩu bị rò rỉ](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Chúng không do migration chat tạo ra.
