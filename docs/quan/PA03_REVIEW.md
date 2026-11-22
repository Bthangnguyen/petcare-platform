# Tài liệu PA03 cần dùng cho phần Quân trong PA04

Kiểm tra ngày 22/11/2026 sau khi bộ PA03 được bổ sung vào `old PAs`. Đã có SAD tổng hợp v1.0 và đặc tả use-case v2.0; hai tài liệu này là bản nền để tiếp tục phần Quân. Chưa sửa các tệp Word gốc.

## Tài liệu và mục đích sử dụng

| Tài liệu | Nội dung đã kiểm tra | Dùng trong PA04 |
|---|---|---|
| `old PAs/SoftwareArchitectureDocument_PetCarePlatform_v1.0.docx` | Version 1.0, ngày revision 09/11/2026, Group 12; mục 1–4 có kiến trúc và chín thành phần, 18 ảnh nhúng; mục 5 Deployment và 6 Implementation View ghi rõ để trống cho PA4 | Bản nền để ghép mục 5–6; giữ cấu trúc, thuật ngữ và sơ đồ PA03; Thắng cập nhật mục 1–4 |
| `old PAs/UseCaseSpecification_PetCarePlatform_v2.0.docx` | Revision 09/11/2026; có UC24, UC25, actor hierarchy, 25 use case; đã đọc lại đầy đủ UC07–09 | Thay bản v1.0 làm cơ sở đối chiếu F4, luồng màn hình và mã use case |
| `old PAs/ClassDiagrams/` | Có component diagram và các ảnh sơ đồ lớp theo mục 4.1–4.8, đặc biệt BookingAvailability 4.5 | Đối chiếu phụ thuộc và tên lớp khi ghép SAD, giữ thiết kế dự kiến tách khỏi hiện thực; không cần vẽ lại toàn bộ sơ đồ lớp |
| `old PAs/MeetingMinutes_PA3.docx` | Họp 25/10 và 02/11; ghi nhận Quân làm Logical View, Review/Administration, common API; Thắng tích hợp SAD | Xác định chủ sở hữu phần cũ và đầu mối review; không thay cho biên bản xác nhận phân công PA04 |
| `old PAs/WeeklyReport_Week4.docx`, `WeeklyReport_Week5.docx` | Tuần 4: 24–30/10; tuần 5: 31/10–06/11; báo cáo nhóm 12, Thắng chuẩn bị | Cơ sở nối tiếp báo cáo tuần 6–7 của Thắng và đối chiếu các việc đã báo cáo; không phải đầu vào chặn phần kỹ thuật của Quân |

## Các điểm cần thống nhất trước bản SAD v1.1

1. SAD cũ mô tả PostgreSQL với Prisma; code hiện dùng SQLite và `better-sqlite3`, không có Prisma. Mục 2, 4, 5 và 6 cần phân biệt thiết kế đích với bản chạy PA04. Không chỉ bổ sung mục 5–6 rồi giữ nguyên các câu mô tả công nghệ hiện tại ở mục 1–4.
2. SAD cũ chọn ba tầng, một ứng dụng Node.js/Express chia module, Controller → Service → Repository → Entity. Hướng này phù hợp bản chạy; các module không phải máy chủ độc lập. Một số port/entity trong thiết kế chưa có đầy đủ trong code.
3. SAD mục 2.2 nói hosting, LLM và email chọn qua cấu hình, chưa cố định nhà cung cấp. Render/Neon trong phiếu PA3 là đề xuất. Sơ đồ đích đã đổi sang nhãn chung hosting/CSDL được quản lý để phù hợp SAD gốc.
4. UC06 trong SAD thuộc Booking & Availability; code hiện đặt trong module `facility`. Mục 6 đã nêu chênh lệch này; mục 4 của bản cập nhật cần thống nhất ánh xạ.
5. SAD thiết kế chống chồng lấn booking bằng ràng buộc CSDL. Bản SQLite kiểm tra khoảng chồng lấn trong giao dịch `IMMEDIATE`, cộng chỉ mục duy nhất cho cùng nhân viên/cùng giờ bắt đầu. Không ghi thành ràng buộc CSDL chống mọi khoảng chồng lấn đã có sẵn.
6. SAD còn mô tả AI, email, reminder job (`node-cron`), boarding, các vai trò và quản trị đầy đủ. Bản PA04 chưa hiện thực đầy đủ các phần này; ghi rõ trạng thái triển khai thay vì coi sơ đồ thiết kế là chức năng đã chạy.

## Kết quả đối chiếu F4 với use-case v2.0

Các luồng cốt lõi UC07–09 đã đọc vẫn phù hợp hướng hiện thực và bộ test hiện có: chọn dịch vụ/thú cưng/ngày/nhân viên/giờ, tóm tắt và xác nhận, kiểm tra lại chỗ, xử lý slot bị lấy, hết chỗ, chưa có thú cưng, rời bước xác nhận; tính giờ từ ca làm và booking; hủy trước ít nhất hai giờ. Các phần boarding và xem kết quả/review lịch cũ thuộc phạm vi chưa triển khai đầy đủ.

Ngưỡng xác nhận booking trong hai giây và tính availability trong một giây vẫn có trong v2.0. Đợt kiểm thử F4 trước chưa benchmark các ngưỡng này. UC25 v2.0 mô tả thêm dropdown, điều hướng tới đối tượng và nhiều loại thông báo; không coi toàn bộ UC25 đã hoàn thành chỉ vì trang thông báo hiện có.

## Trạng thái đầu vào

H01 đã nhận được SAD nền PA03. Quân đã chuẩn bị bản riêng mục 5–6 và [đề xuất đồng bộ mục 1–4](SAD_PA04_Alignment.md); còn review Thắng, phản hồi TA riêng nếu có và xác nhận triển khai nhóm. Số nhóm trong SAD và biên bản mới là 12. Theo yêu cầu người dùng, không ghép vào SAD Word gốc và không coi bản riêng là đã được nhóm duyệt.
