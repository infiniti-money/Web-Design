# Trợ lý tư vấn Gemini — v1.27.0

Ngày 08/11/2026. Theo lựa chọn chủ website, chuyển từ OpenAI sang Gemini để dùng hạn mức miễn phí. Khóa Gemini nhập qua cửa sổ bảo mật cục bộ, kiểm tra API thành công. Không đưa khóa vào Git, trình duyệt, mã nguồn hoặc báo cáo. Khóa OpenAI đã tạo trước đó chỉ còn ở tệp local được Git bỏ qua; tính năng này không dùng và không tải khóa OpenAI lên Supabase.

## Phạm vi tư vấn

Khách mở nút **Trợ lý AI tư vấn nội thất** ở đầu trang. Cửa sổ nhận loại không gian, diện tích, số phòng ngủ, phong cách, ưu tiên, mức đầu tư dạng lựa chọn và chủ đề (công năng/vật liệu/phạm vi báo giá/nghiệm thu). Không có ô nhập tên, điện thoại, địa chỉ, văn bản tự do hoặc tải hồ sơ lên AI.

Gemini tham khảo bốn bài biên tập gốc công khai, đưa hai phương án để cân nhắc, điểm cần đối chiếu và câu hỏi cho buổi khảo sát. Không đọc CRM, báo giá riêng, hồ sơ nhân sự hoặc dữ liệu công trình chưa duyệt. Snapshot kiến thức sinh bởi `scripts/build-ai-knowledge.cjs`; CI kiểm tra bản snapshot còn khớp nguồn. Bài CMS từ API không được tự động đưa vào prompt.

Chưa có dữ liệu giá/xưởng/vùng phục vụ/bảo hành được xác nhận, nên hệ thống yêu cầu AI không tự tạo cam kết hoặc giá cố định. Đây là hướng dẫn mô hình, không phải bảo đảm mọi câu trả lời đều chính xác; nhân viên cần kiểm tra trước khi áp dụng. Câu trả lời hiển thị dạng text an toàn, không thực thi HTML/Markdown hoặc tự mở URL mô hình tạo.

Nút **Chuyển nhu cầu sang nhân viên** chỉ ghép lựa chọn vào mô tả form tư vấn, giữ nội dung cũ và giới hạn 1.000 ký tự. Không chuyển báo cáo AI dài vào CRM tự động, không tự điền liên hệ, không chọn đồng ý chính sách thay khách, không tự gửi lead hoặc mở chat tawk.to. Khách vẫn tự quyết định gửi form hay liên hệ nhân viên.

## Miễn phí và dữ liệu

Google công bố Free tier cho model `gemini-3.5-flash-lite`, có hạn mức và điều kiện tài khoản. Giá token miễn phí chỉ áp dụng khi project thực sự dùng Free tier; API trả 200 chưa xác nhận được billing tier. Không tự liên kết Cloud Billing, nâng gói, bật Google Search/Maps grounding hoặc chuyển sang OpenAI khi hết hạn mức.

Ở dịch vụ Gemini miễn phí, Google có thể dùng nội dung gửi/nhận để cải thiện sản phẩm và có người đánh giá; không gửi dữ liệu cá nhân hoặc bí mật. Vì vậy UI có opt-in riêng, chỉ gửi lựa chọn theo allowlist; API từ chối trường thừa như phone/email/details. Form khách hàng hiện tại là luồng riêng. Google vẫn xử lý lựa chọn và câu trả lời theo điều khoản của họ; không gọi đây là AI offline hoặc dữ liệu không ra ngoài máy chủ.

Nguồn chính thức: [bảng giá và Free tier](https://ai.google.dev/gemini-api/docs/pricing), [điều khoản dữ liệu](https://ai.google.dev/gemini-api/docs/terms), [khóa API](https://aistudio.google.com/apikey).

## Bảo vệ API và hạn mức

- Edge Function `ai-consultation`, public gateway nhưng CORS chỉ hostname website hiện tại. Không dùng publishable key làm biện pháp bảo mật cho chi phí.
- Khách đồng ý riêng và hoàn tất Turnstile với action `ai_consultation`, đúng hostname. Không mượn token action `consultation` của form liên hệ.
- RPC `reserve_ai_consultation_budget(text)` chỉ `service_role` được gọi; anon/authenticated không có execute. SECURITY INVOKER, search_path rỗng, không tăng quyền truy cập của người dùng.
- Hạn mức nguyên tử: **20 lượt/ngày toàn website** theo ngày Việt Nam, **5 lượt/giờ theo dấu băm mạng**. Tái sử dụng bảng throttle riêng tư hiện có bằng namespace ai-; không sửa counter ip:/phone: của liên hệ. Dùng khóa transaction để chống vượt quota khi nhiều request cùng tới. Mạng dùng IP proxy nên không đồng nhất với một người.
- Dấu băm HMAC đổi theo giờ; chỉ lưu counter và thời hạn, không lưu IP thô hay nội dung tư vấn trong counter. Xóa counter AI hết hạn ở lần gọi sau; không khẳng định đây là xóa mọi log hạ tầng của nhà cung cấp.
- Input tối đa 4 KiB, enum/diện tích/phòng ngủ được kiểm tra phía máy chủ, output tối đa 1.600 token và chỉ nhận câu trả lời kết thúc hoàn chỉnh. Không có tools, URL fetch do khách chỉ định hoặc bộ nhớ hội thoại.
- Trừ hạn mức trước khi gọi provider; lỗi provider cũng tiêu thụ lượt đã giữ, không hoàn lượt tự động. Hạn mức Google có thể thấp hơn chốt nội bộ và thay đổi. Khi hết lượt/timeout, báo chưa trả lời, cho chuyển nhân viên, không tự retry.
- Browser timeout 40 giây; đóng cửa sổ hủy request, bỏ phản hồi cũ và xóa đáp án/opt-in của lượt trước. Không lưu hội thoại vào localStorage/CRM bởi tính năng này.

Migration `20261108015706_ai_consultation_budget.sql` đã áp dụng. Chỉ thêm một function service-only, không tạo bảng hoặc thay RLS khách/báo giá/thanh toán. SQL cách ly kiểm tra cap mạng/global, rollback lượt bị từ chối, giữ counter liên hệ và từ chối vai trò trình duyệt. Postflight production thử RPC trong transaction rollback, không giữ counter hay ghi khách hàng.

## Cấu hình máy chủ

Secret trên Supabase: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`, `AI_QUOTA_READY=true`, `AI_ENABLED`. TURNSTILE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY dùng cấu hình máy chủ hiện có. Không gửi `.env.local` nguyên tệp lên server vì còn khóa OpenAI không sử dụng; quy trình triển khai chỉ chuyển các secret Gemini/AI cần thiết và xóa tệp chuyển tạm.

Health: `https://mswiegltusllzvuavjdh.supabase.co/functions/v1/ai-consultation/health`. Health chỉ báo cấu hình đã sẵn sàng, không chứng minh quota Google còn hay mọi câu trả lời đúng.

Đợt này đã kiểm tra Gemini trực tiếp bằng nhu cầu tổng hợp, không có dữ liệu khách thật: HTTP 200, model gemini-3.5-flash-lite, kết thúc STOP; mẫu vật liệu 2.997 ký tự, không có giá VND cố định/cam kết 20%/99%. Đây không phải kiểm thử trực tiếp CAPTCHA của khách trên production. Khóa không được in hoặc ghi trong artifact QA.

**Trạng thái ban đầu: AI_ENABLED=false**, chờ chủ website xác nhận project khóa đang ở Free tier/chưa liên kết thanh toán. Cửa sổ vẫn hỗ trợ chuyển nhu cầu sang nhân viên khi AI tắt. Chỉ bật sau khi đáp ứng yêu cầu miễn phí và nguồn triển khai đã qua kiểm tra.

Tạm dừng an toàn (không chứa khóa): `supabase secrets set AI_ENABLED=false --remote=mswiegltusllzvuavjdh --yes`. Không xóa Gemini key đang dùng cho ứng dụng khác, không thay payOS/tawk.to. Muốn bật lại: kiểm tra Free tier/quota, secret/model và RPC; đổi AI_ENABLED=true rồi đối chiếu health và hoàn tất Turnstile thật để nghiệm thu. Không giả lập bỏ CAPTCHA trên production.

## Kiểm chứng

Node: enum/opt-in/PII injection, CORS, default-off, token hostname/action, quota trước provider, payload không chứa private data, output incomplete/blocked và hạn mức. Playwright fixture: 320/390/1440 px, chưa đồng ý không POST, kiểm tra token riêng, text không thực thi HTML, không tự retry, disabled fallback, chuyển nhân viên, đóng lúc đang chờ/mở lại và Escape. SQL isolated chạy PostgreSQL 17, không kết nối dữ liệu thật. Kiểm thử tư vấn cũ, dự toán và an toàn PC tiếp tục đạt.

Chưa kiểm chứng đầy đủ mọi chủ đề/phong cách, mọi sai sót mô hình hoặc CAPTCHA thật của khách. UAT hoàn tất khi chủ website mở AI trên trình duyệt thường, đồng ý, qua Turnstile và nhận câu trả lời đúng phạm vi; không coi chỉ có health xanh là UAT đạt. Số liệu CWV/Search Console và bộ cài PC là hạng mục riêng.

### Advisory sau triển khai function

Security Advisor hiện có nhóm cảnh báo RPC SECURITY DEFINER hiện hữu và leaked-password protection, cùng INFO RLS bật nhưng không có policy ở bảng private. Function quota AI mới dùng SECURITY INVOKER và chỉ service_role có execute; không nới quyền hay sửa RPC cũ trong đợt này. Tham khảo [kiểm soát RPC đặc quyền](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [bảo vệ mật khẩu](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) và [RLS không policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Không coi việc kiểm thử AI đạt là đã xử lý toàn bộ advisory của project.
