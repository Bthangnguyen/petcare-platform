# PA4 verification notes for Quỳnh

Kiểm tra ngày 22/11/2026 trên build PA4 `0.4.0`, commit `5777ca3`, Chrome `157.0.8103.79` trên Windows. Mỗi lần chạy dùng SQLite riêng và dữ liệu giả lập.

| Phần | Kết quả |
|---|---|
| UC01 đăng ký | Trên màn hình rộng 360 px, form không tràn ngang. Mật khẩu xác nhận sai hiện lỗi. Dữ liệu đúng tạo tài khoản và chuyển sang đăng nhập. Gửi lại cùng email hiện liên kết đăng nhập. |
| UC02 đăng nhập | Tài khoản vừa tạo đăng nhập được và mở trang chủ của chủ thú cưng. Xác nhận lỗi thời hạn phiên bên dưới. |
| UC03 hồ sơ thú cưng (Quỳnh phụ trách) | Qua giao diện trình duyệt, cả 8 ca đạt. Bộ Playwright Chrome riêng cũng đạt 8/8. Excel ghi hai lần kiểm tra riêng. |
| Tài liệu UI | `UI/Screen_Descriptions.md` tham chiếu bốn ảnh của bản chạy: đăng nhập, đăng ký, trang chủ của chủ thú cưng và hồ sơ thú cưng. |

## UC02 A4 — Đếm thông báo làm mới phiên khi người dùng không thao tác

- **Bước tái hiện.** Chạy ứng dụng cục bộ với `SESSION_IDLE_SECONDS=45`, đăng nhập và giữ trang chủ mở mà không thao tác trong khoảng 60 giây. Chu kỳ hỏi số thông báo chưa đọc vẫn là 30 giây.
- **Mong đợi.** Sau 45 giây không thao tác, yêu cầu thăm dò tiếp theo nhận phản hồi hết phiên.
- **Quan sát.** Hai lượt thăm dò kế tiếp đều trả HTTP 200 và trang vẫn đăng nhập sau khoảng 60 giây. Middleware từng lượt gọi kiểm tra phiên và cập nhật `lastActivityAt`.
- **Bản sửa cục bộ.** Yêu cầu nền đếm thông báo vẫn xác thực phiên và trả về số chưa đọc của người dùng, đồng thời bỏ qua bước cập nhật thời điểm hoạt động. Mở trang thông báo vẫn cập nhật hoạt động theo quy tắc cũ.
- **Kiểm tra sau sửa.** TypeScript backend đạt, API đạt 16/16 và Playwright Chrome UC02–UC03 đạt 16/16. Ca API mới dùng đồng hồ thử để kiểm tra yêu cầu nền trước và sau ngưỡng hết phiên, hoạt động bình thường và yêu cầu không có phiên. Bản sửa nằm trong commit `d8138a8` và liên kết với Issue #1. Kết quả Excel ở trên thuộc lần kiểm tra build `5777ca3` trước bản sửa.

## Chênh lệch UC03 đối chiếu đặc tả

- Form chưa có ảnh thú cưng.
- Ảnh QR hiển thị được. Đích QR hiện dùng `petcare.example`, nên kết quả ca 01 chỉ xác nhận hiển thị ảnh QR.
- Tiêm phòng lưu bản ghi. Tạo hoặc dừng nhắc lịch phụ thuộc UC17, nằm trong Sprint 5 theo README.

## Kết quả kiểm thử và bàn giao

Sheet `Test cases` trong `TestCases_Quynh.xlsx` lưu kết quả `TC-UC03-01` đến `TC-UC03-08`. Cột `Tester` ghi Quỳnh, thành viên phụ trách UC03. Cột `Remark` ghi lần thao tác trên trình duyệt do trợ lý thực hiện thay Quỳnh. Kiểm tra xác nhận ngày sinh hợp lệ và ngày tiêm nhắc được lưu khi nhập qua bàn phím, ngày sinh tương lai bị chặn, và lịch sử cân nặng và tiêm phòng vẫn còn sau lưu trữ. Thái nhận workbook, Quân nhận thư mục `UI`, và Thắng nhận ghi chú này cùng kết quả đối chiếu phạm vi.
