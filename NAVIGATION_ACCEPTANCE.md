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
