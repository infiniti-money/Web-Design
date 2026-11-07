# Thu tiền và đối soát ATELIER HOME — 08/11/2026

Trang quản trị: [Thu tiền & đối soát](https://infiniti-money.github.io/Web-Design/payments.html). Đăng nhập tại admin.html bằng tài khoản Admin đang hoạt động trước khi mở trang. Manager/Employee không được đọc sổ thu hoặc thực hiện thao tác.

## Đợt kiểm chứng 10.000 VND

Chủ website chọn 10.000 VND để kiểm chứng. Hiện giới hạn ở một báo giá đã được chấp nhận, một yêu cầu mới và đúng số tiền này. Cả Edge Function và database kiểm tra phạm vi. Tạo lại với cùng request key trả yêu cầu cũ; key mới bị chặn sau khi đã có yêu cầu pilot. Chưa mở thu tiền đại trà.

Thực hiện trong giao diện Admin:

1. Bấm **Xác minh webhook payOS**. Backend dùng SDK và secret tại máy chủ để đăng ký URL cố định của website; thao tác có thể thay webhook hiện có trên kênh merchant. payOS gửi callback kiểm tra có chữ ký. Chỉ khi nhà cung cấp xác nhận URL mới ghi sự kiện webhook_confirmed; database chặn tạo link nếu chưa có xác nhận này. Không đưa accountNumber/accountName hoặc secret trong kết quả API về trình duyệt.
2. Tạo yêu cầu **10.000 VND** cho báo giá pilot. Mở link payOS, kiểm tra số tiền và người nhận. Chủ sở hữu tự chuyển khoản trên ứng dụng ngân hàng, không chia sẻ OTP/mật khẩu. Không tự chuyển tiền bằng công cụ tự động.
3. Chọn **Tất cả** hoặc **Chờ thanh toán**, mở yêu cầu → **Truy vấn lại từ payOS**, nhập căn cứ. SDK xác minh chữ ký response. Chỉ ghi paid khi đúng order/link/số tiền, PAID, amountPaid đủ, amountRemaining=0, tổng transaction khớp và reference không trùng. Việc này không tự chứng minh số dư tài khoản ngân hàng.
4. Chủ sở hữu đối chiếu tiền vào tài khoản tại ngân hàng. Khi intent đã paid, nút **Tôi đã kiểm tra tiền vào ngân hàng** cho lưu xác nhận và lý do. Đây là xác nhận của Admin, không phải kiểm tra số dư ngân hàng tự động.

Nếu kết quả tạo link chưa rõ, **Kiểm tra lại yêu cầu** dùng cùng request key; không tự tạo key mới hay retry merchant. Có thể tìm yêu cầu đã có qua bộ lọc Tất cả rồi truy vấn lại provider. Nếu chưa tìm thấy link từ provider, giữ yêu cầu để kiểm tra; không xóa reservation theo timeout.

## Xử lý các trường hợp cần đối soát

- unknown/reserved: truy vấn lại theo order code trên máy chủ; chỉ khôi phục link khi provider ký đúng dữ liệu PENDING, chưa thu tiền và chưa có receipt mâu thuẫn.
- review/thiếu tiền: không tự báo paid. Sau khi provider xác nhận đủ tổng và giao dịch hợp lệ, có thể đối soát thành paid; receipt gốc giữ nguyên và lưu snapshot kế toán cùng kết quả truy vấn trong lịch sử.
- CANCELLED/EXPIRED: chỉ giải phóng reservation khi provider xác nhận chưa thu, không có transaction/receipt. Callback đến muộn được đưa vào review.
- unmatched hoặc khoản phải xử lý ngoài hệ thống: **Lưu ghi chú**, **Ghi nhận đã xử lý bên ngoài**, **Mở lại xem xét** đều thêm nhật ký. Các thao tác này không tăng số tiền đã thu, không tự hoàn tiền và không xóa chứng từ gốc.
- paid: không hạ trạng thái bằng nút giao diện; phát sinh bất thường giữ trong receipt/nhật ký để kiểm tra. Không có chức năng chuyển tiền hoặc hoàn tiền tự động trong đợt này.

## Triển khai và kiểm chứng kỹ thuật

- Đã có backup mới tại thư mục riêng `C:\AtelierPrivateBackups\2026-11-08-pre-reconciliation`, ngoài repository; có roles/schema/data/managed schema/migration history/checksum. Auth/Storage migration metadata vẫn 82/80; Storage hiện trống.
- Migration `20261107180731_payos_reconciliation_admin.sql` đã áp dụng lên production sau thử đầy đủ trên database phục hồi và PostgreSQL tổng hợp. Gồm quote-history guard, ledger, policy pilot riêng và audit append-only. Sau migration: 1 báo giá, 1 phiên bản giữ nguyên; chưa tạo intent/receipt lúc kiểm tra postflight.
- Backend `payos-admin` cho Auth Admin xác thực lại và profile active. RPC service-only kiểm tra vai trò live lần nữa. Admin RLS chỉ cho đọc ledger/audit. Ghi chú/ngân hàng không có quyền gán paid bằng body client.
- Snapshot provider chỉ giữ order/link/số tiền/trạng thái/reference; không lưu raw bank/customer payload. Các trường người dùng nhập được render bằng textContent.
- Màn hình phân trang 25 yêu cầu/receipt, lọc trạng thái; lỗi đọc xóa dữ liệu cũ, khóa tạo link và không báo thành công giả. Ghi/sync có khóa chống bấm trùng, giới hạn body, timeout, CORS giới hạn và lỗi đã lọc.
- Node core/admin, SQL pilot/recovery/partial-paid-cancelled/audit/roles và trình duyệt desktop/mobile với fixture đã đạt. Đã chuẩn bị route/page cho mã nguồn PC và kiểm tra allowlist; chưa phát hành bộ cài PC mới trong đợt này.
- Advisor giữ bốn cảnh báo RPC SECURITY DEFINER cũ và leaked-password protection cũ. Hai INFO private RLS không policy gồm inquiry_rate_limits và payos_pilot_policy là mặc định từ chối; bảng policy không cấp quyền browser/service_role trực tiếp.

## Bằng chứng thực tế phải cập nhật sau thao tác Admin

Tại thời điểm triển khai chưa khẳng định merchant credentials hợp lệ, webhook thật đã qua hoặc ngân hàng đã nhận tiền. Cần quan sát sự kiện webhook_confirmed, callback đã xác minh, intent paid / provider_sync và xác nhận ngân hàng của chủ sở hữu. Các test giả lập không thay thế các bằng chứng này. [Kết quả kiểm thử trước](PAYOS_ACCEPTANCE_20261108.md) ghi trạng thái trước khi bổ sung màn hình này.

Nếu cần dừng tạo yêu cầu mới, tắt enabled trong private.payos_pilot_policy bằng quyền quản trị database. Giữ webhook hoạt động để tiếp nhận callback muộn; không xóa ledger hoặc tắt callback đang dùng để xử lý sự cố tạo link.
