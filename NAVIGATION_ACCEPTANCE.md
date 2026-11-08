# Kiểm chứng chuyển trang — 08/11/2026

## Nguyên nhân và thay đổi

Tái hiện trước sửa trên Pages: giữ request ảnh hero, sau DOMContentLoaded stylesheet #home-fonts vẫn media=print, document.fonts có 0 face. JavaScript cũ chỉ bật stylesheet sau load/error của ảnh nên tiêu đề đổi phông muộn.

Chuyển stylesheet phông và biểu mẫu sang media=all; script tương thích HTML cũ bật phông ngay. Preload bốn subset Latin/Vietnamese của hai phông chính. Trang công khai có mốc public-ready sau H1 và rel=expect để trình duyệt hỗ trợ đợi nội dung đầu trang. CSS bật native cross-document view transitions cùng origin, không fade/zoom hay chặn liên kết bằng JavaScript; scrollbar-gutter ổn định. Giảm chuyển động tắt opt-in.

## Bằng chứng cục bộ

- Playwright Edge: 1440px và 390px, thêm 390px reduced motion. Khi giữ ảnh hero chưa hoàn tất, phông Playfair đã sẵn sàng và chiều cao H1 không đổi sau khi giải phóng ảnh.
- Nhấp menu thật qua Dịch vụ, Catalog, Kiến thức, Trang chủ, Dự án; kiểm tra trang đích hiện, không tràn ngang, Back/Forward. Snapshot được ghi nhận ở các trang không có fragment khi không giảm chuyển động. Không ghi dữ liệu production.
- Kiểm tra shell riêng tám route tại 1440/1024/390/320px: phông tiếng Việt thực tế, bàn phím, no-JS/font lỗi, header và CTA.
- URL có fragment và history có thể khiến Chromium bỏ snapshot (bao gồm thông báo native opt-in disabled); bài kiểm tra vẫn yêu cầu nội dung đích hiện và không có lỗi ứng dụng. Không che mọi lỗi pageerror.

## Phạm vi

Đây là sửa tải phông và chuyển trang website công khai. Trình duyệt không hỗ trợ native transition dùng điều hướng bình thường; trình duyệt có thể bỏ snapshot khi tải quá lâu. Không cam kết mọi thiết bị/mạng hết mọi nhấp nháy. Không sửa dữ liệu, RLS, khóa API hay ứng dụng PC. Kiểm tra bản Pages và CI ghi bổ sung sau triển khai.

## Bản Pages đã kiểm tra

Revision 212978d432e49d7496e321b5d5a40889453828cd phục vụ từ release.json. Kiểm tra trực tiếp ở 1440px/390px và reduced motion: ảnh hero bị giữ nhưng phông đã sẵn sàng, H1 ổn định; liên kết năm mục và Back/Forward hiện nội dung đúng. Có snapshot native trên desktop/mobile; browser có thể bỏ một snapshot khi chuyển tiếp nhanh. Reduced motion không tạo snapshot ở cả năm lần nhấp.

Ba lượt Lighthouse riêng trên Pages: Performance 97/98/98, LCP 2.525/2.241/2.243 giây, CLS 0 ở cả ba. Đây là phép đo phòng thử nghiệm, không phải số liệu CWV người dùng thật. Báo cáo cục bộ dist/audits/home-v1-28-1-2026-11-08-{1,2,3}.report.json/html.

CI đầu phát hiện fixture giữ nhiều request ảnh nhưng chỉ giải phóng request cuối (khác biệt srcset giữa Chromium/Edge). Đã sửa fixture giải phóng toàn bộ request giữ; không đổi mã sản phẩm để vượt kiểm thử. Bài kiểm tra yêu cầu ít nhất một snapshot native thay vì giả định browser bắt buộc dùng snapshot trong mọi lần nhấp.

## CI cuối và nghiệm thu triển khai

Revision cuối ff8d57f459e9521ba6dbebe4a3fc424adce33fc6 đã xác nhận từ Pages release.json. [Validate 42455134138](https://github.com/infiniti-money/Web-Design/actions/runs/42455134138): tất cả job thành công, gồm Chromium navigation regression, toàn bộ UI fixture và SQL cách ly. [Pages 42455134235](https://github.com/infiniti-money/Web-Design/actions/runs/42455134235), [browser smoke 42455170041](https://github.com/infiniti-money/Web-Design/actions/runs/42455170041), [SEO/Lighthouse CI 42455170007](https://github.com/infiniti-money/Web-Design/actions/runs/42455170007) đều thành công. Node 143 đạt/1 lead thật chủ động bỏ qua; desktop security 2 đạt. Không phát sinh yêu cầu AI hay giao dịch thật trong kiểm thử.

[Release v1.28.1](https://github.com/infiniti-money/Web-Design/releases/tag/v1.28.1), workflow 42455308783 thành công. Đã tải ZIP 992139 byte và đối chiếu SHA256 04b1d2339433ef8afa8e62d4f511ddb0aabfa46c06e3189dcf28a55768dbffc1 với digest GitHub: khớp. Không có bộ cài PC mới.
