# Đề xuất đồng bộ SAD PA04 với bản chạy

Nguyễn Minh Quân chuẩn bị riêng ngày 22/11/2026 để đi cùng bản bàn giao mục 5–6. Đây là nội dung đề xuất cho người tích hợp; chưa áp dụng vào `old PAs/SoftwareArchitectureDocument_PetCarePlatform_v1.0.docx` và chưa thay thế quyết định của nhóm.

## Mục 1 Introduction

Sau đoạn mô tả phạm vi toàn hệ thống, có thể thêm đoạn tiếng Anh sau để thống nhất với ngôn ngữ SAD gốc:

> The architecture describes the target product, while the PA4 executable build implements a subset of its use cases. The current build uses a React web interface and one TypeScript Node.js/Express server with SQLite persistence through better-sqlite3. PostgreSQL with Prisma remains part of the PA3 target design and is not used by the current executable. Sections 5 and 6 distinguish the current deployment and implementation from the proposed production architecture.

Trong bảng viết tắt, đổi mô tả ORM từ khẳng định “the project uses Prisma” thành:

> Object–relational mapping; Prisma is part of the target design. The PA4 build uses better-sqlite3 without an ORM.

## Mục 2 Architectural Goals and Constraints

Giữ quyết định ba tầng và modular monolith. Bổ sung trạng thái thực hiện cho AD-1 và AD-5:

> The target data tier is PostgreSQL. The PA4 demonstration build embeds SQLite on the application computer to simplify installation. Repositories currently use synchronous better-sqlite3 queries. PostgreSQL deployment requires an adapter, schema and query migration, and renewed transaction tests; changing configuration alone does not switch database engines.

Về chống đặt trùng, thay câu khẳng định CSDL hiện tại chống mọi khoảng chồng lấn bằng:

> The current build checks active booking intervals inside an SQLite IMMEDIATE transaction. A partial unique index additionally rejects active bookings with the same staff member and start time. The target PostgreSQL implementation must preserve the interval-level guarantee under concurrent requests and multiple application processes.

Hosting, LLM và email vẫn chọn theo cấu hình; không coi Render/Neon là nhà cung cấp đã chốt. Các yêu cầu hiệu năng vẫn là mục tiêu: xác nhận booking trong hai giây và tính availability trong một giây chưa được benchmark trong đợt sửa F4.

## Mục 3 Use Case Model

Giữ mô hình 25 use case của Use-Case Specification v2.0; bổ sung bảng trạng thái PA04 hoặc dẫn sang Implementation View. Không đổi tổng số use case thành số luồng đã chạy.

| Use case | Trạng thái thực hiện của bản PA04 |
|---|---|
| UC01, UC02 | Có đăng ký/đăng nhập, phiên, khóa tạm và phân quyền; background unread polling không gia hạn idle session |
| UC03 | Có hồ sơ, cân nặng, tiêm phòng và hiển thị QR; chưa có ảnh thú cưng và đầy đủ tích hợp reminder |
| UC06, UC07, UC08, UC09 | Có tìm cơ sở, đặt lịch hẹn, tính giờ trống, xem/hủy lịch hẹn; phần boarding trong UC08/UC09 chưa có |
| UC11 | Có quản lý trạng thái lịch cho chủ cơ sở; chưa đầy đủ luồng Staff/reassign theo đặc tả |
| UC25 | Có trang thông báo trong ứng dụng và bộ đếm; chưa đầy đủ dropdown/điều hướng và mọi loại thông báo của đặc tả |
| Các luồng còn lại | Thiết kế đích hoặc phạm vi phát triển sau theo README; không coi hiện diện trong sơ đồ là đã hiện thực |

## Mục 4 Logical View

Giữ sơ đồ chín thành phần như kiến trúc đích. Có thể thêm đoạn sau ở đầu mục 4 để giải thích sự khác nhau với mã nguồn:

> The component diagrams show the target logical design. In the PA4 build, Identity, Pet, Facility, Booking and Notification are implemented in one Express process. Facility search (UC06) is currently located in the facility module although the target design assigns it to Booking & Availability. The implementation does not yet contain every port, entity or service in the class diagrams. Section 6 maps the implemented components to their source folders.

Bổ sung ghi chú trạng thái vào các mục tương ứng:

- Data: SQLite + better-sqlite3 là hiện thực hiện tại; PostgreSQL + Prisma là thiết kế đích.
- Reminder and Notification: đã có thông báo trong ứng dụng; email gateway, retry email và scheduled reminder job chưa triển khai.
- AI Extraction Gateway, Review and Administration, boarding: giữ phần thiết kế, ghi rõ chưa có module chạy tương ứng.
- Identity: kiểm tra phiên cho unread polling không cập nhật `lastActivityAt`; thao tác bình thường vẫn cập nhật theo chính sách hiện tại.

## Revision History khi nhóm tích hợp

Gợi ý nội dung Description cho bản 1.1, chỉ ghi ngày và tác giả thực tế khi nhóm tạo bản tổng hợp:

> Added the Deployment and Implementation Views for PA4; distinguished the SQLite demonstration build from the PostgreSQL/Prisma target design; documented implementation status and the UC02 idle-session polling correction.

Không tự thay tác giả, ghi nhận phê duyệt hoặc coi bản đề xuất này là SAD v1.1 chính thức.
