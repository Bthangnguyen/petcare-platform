# Kế hoạch thực hiện phần Quân trong PA04

Cập nhật ngày 22/11/2026. Phạm vi theo phiếu PA4: SAD mục 5–6, UI prototype, rà soát và sửa F4. Theo yêu cầu người dùng, SAD được làm thành bản riêng, không sửa hoặc ghép vào SAD PA03 gốc. Bảng phân công PA04 trong phiếu là đề xuất; chưa có biên bản xác nhận PA04 trong repo. Mốc cũ 17–19/11 và hạn nộp 21/11 đã qua; không tự coi là lịch gia hạn.

## Kế hoạch và tiến độ

| ID | Việc cần thực hiện | Tiêu chí hoàn thành | Trạng thái |
|---|---|---|---|
| Q01 | Đọc PA cũ, phiếu PA4 và code hiện có | Xác định phạm vi và các đầu vào | Đã làm |
| Q02 | Viết SAD mục 5 | Có UML deployment cho bản hiện tại và dự kiến, mô tả node, giao tiếp và giới hạn | Hoàn thành bản riêng HTML/Markdown, PlantUML và SVG; đã đối chiếu PA03 |
| Q03 | Viết SAD mục 6 | Cây thư mục và vai trò các thư mục, tệp hỗ trợ đúng repo | Hoàn thành trong bản SAD riêng; có tệp đề xuất đồng bộ mục 1–4 |
| Q04 | Soạn UI prototype riêng | Trang chính và ít nhất 3 màn hình; ảnh thật, mục đích, thông tin, cách dùng, use case | Đã làm 16 màn hình/trạng thái; tích hợp 4 ảnh/mô tả Quỳnh và 12 ảnh bổ sung Quân; còn review/bàn giao Trường |
| Q05 | Rà soát và sửa F4 | Đối chiếu UC07–09; ghi phát hiện; kiểm thử thay đổi và luồng chính | Đã sửa 3 lỗi; API kết hợp Quỳnh đạt 17/17; kiểm thử tích hợp trên nhánh bàn giao đạt 78/78 (UC02, UC03, UC07 và hồi quy F4); xem F4_REVIEW.md |
| Q06 | Kiểm tra bản bàn giao | Tài liệu đọc được, đường dẫn hợp lệ, ghi rõ kiểm thử đã chạy và giới hạn | Đã làm: kiểm tra ảnh/UI desktop và 360 px, hai sơ đồ, liên kết nội bộ và git diff |
| Q07 | Review và bàn giao bản riêng cho nhóm | Nhận đầu vào còn thiếu và review chéo trước khi Thắng đóng gói | Chờ phần Trường/Thái và review nhóm; không tự ghép vào SAD gốc |

## Các đầu vào cần bàn giao

| ID | Người | Cần nhận | Dùng để hoàn tất | Tình trạng |
|---|---|---|---|---|
| H01 | Thắng | SAD mục 1–4 mới nhất; phản hồi TA nếu có; xác nhận kiến trúc và lịch nộp | Review cho bản tích hợp sau, không chặn bản riêng Quân | Đã có SAD PA03 v1.0, nhóm 12; đã soạn riêng đề xuất cập nhật 1–4; còn review và xác nhận lịch mới nếu có |
| H02 | Quỳnh | Mô tả màn hình đăng nhập, đăng ký, trang chủ, hồ sơ thú cưng; code F1/F2 cuối và thay đổi API | Review nội dung UI và tích hợp F4 với phiên, thú cưng | Đã nhận docs/pa4/quynh; đã tích hợp 4 ảnh/mô tả, chuyển sang tiếng Việt và ghi nguồn. API kết hợp đạt 17/17. Còn review cuối |
| H03 | Trường | Mô tả tìm cơ sở, chi tiết cơ sở/đặt lịch, lịch hẹn cơ sở; code và seed F3/F6 cuối; kết quả chạy UC07 | Review UI, dữ liệu dịch vụ/nhân viên/ca làm và lỗi tích hợp | Chưa nhận bản mô tả và kết quả chạy tay |
| H04 | Thái | Test plan theo Moodle, danh sách ca chính thức, lỗi và kết quả tổng hợp | Đồng bộ bằng chứng F4 với báo cáo kiểm thử của nhóm | Có bộ test trong repo; chưa nhận test plan/báo cáo cuối |
| H05 | Cả nhóm | Review chéo tài liệu, Chrome/Edge và màn hình 360 px; xác nhận commit cuối | Chốt bản nộp | Chưa nhận |

Không cần chờ các đầu vào còn thiếu để soạn SAD, mô tả UI theo bản hiện có và chạy kiểm thử tự động. Nội dung do Quân chuẩn bị chưa đồng nghĩa đã được người khác duyệt. Kiểm thử tự động không thay cho kết quả chạy tay có tên người thực hiện.

## Đầu ra dự kiến

- `SAD_Sections_5_6.html` và `.md`: bản riêng mục 5–6, xem offline và chỉnh sửa nguồn.
- `SAD_PA04_Alignment.md`: đề xuất đồng bộ mục 1–4, chưa áp dụng vào SAD gốc.
- `diagrams/*.puml`: sơ đồ triển khai UML có thể chỉnh sửa.
- `UI_Prototype.html` và `screens/`: tài liệu màn hình xem offline.
- `F4_REVIEW.md`: đối chiếu, lỗi, thay đổi và kết quả kiểm chứng.
- `PLAN.md`: điểm theo dõi tiến độ và bàn giao.

## Kết quả đã có và bước tiếp theo

Phần bàn giao chính và phần hỗ trợ được liệt kê ở mục **Phần Quân bàn giao cho PA04** trong README gốc. Tài liệu nằm tại `docs/quan`; code F4 và test nằm ngoài thư mục này, được bàn giao cùng commit trên nhánh `quan/04`. Bản bàn giao kế thừa tài liệu Quỳnh từ nhánh UC02.

Đã dọn đúng 6 ảnh không còn được HTML sử dụng: `02_login.png`, `04_register.png`, `05_home_owner.png`, `08_pet_detail.png` (đã thay bằng ảnh Quỳnh) và `m1_login.png`, `m2_home.png` (ảnh bổ sung không dùng). Đã sao lưu các ảnh này ngoài repo trước khi bỏ. `screens/` còn đúng 16 ảnh được tài liệu tham chiếu; script dựng UI chỉ lấy các ảnh cần dùng từ thư mục chụp thô. Giữ tài liệu nguồn, sơ đồ, script, bằng chứng và toàn bộ tài liệu Quỳnh/nhóm vì các tệp này vẫn có mục đích sử dụng.

Đã hoàn thành bản SAD mục 5–6 riêng bằng HTML/Markdown, SVG và nguồn UML; có tệp đề xuất đồng bộ mục 1–4. Không sửa SAD Word PA03 gốc. UI HTML đã tích hợp ảnh và mô tả Quỳnh, mở offline cùng thư mục ảnh.

Ngày 22/11/2026 đã chuyển từ main sang nhánh `fix/1-uc02-session-idle`, nhận bàn giao Quỳnh ở commit `023cc38` và giữ lại phần Quân chưa commit. Git stash dự phòng vẫn được giữ. Không có xung đột khi khôi phục; API kết hợp đạt 17/17 và TypeScript backend đạt. [Mô tả màn hình Quỳnh](../pa4/quynh/UI/Screen_Descriptions.md), [ghi chú kiểm chứng](../pa4/quynh/Verification_Notes.md), [Excel bàn giao](../pa4/quynh/TestCases_Quynh.xlsx). Đã tích hợp ảnh/mô tả vào HTML. Chưa đọc/đối chiếu các ô Excel; tổng hợp test thuộc H04.

Đã nhận thêm bộ PA03: SAD v1.0 tổng hợp, Use-Case Specification v2.0, biên bản họp, báo cáo tuần 4–5 và bộ sơ đồ. Xem [đối chiếu tài liệu PA03](PA03_REVIEW.md). Không còn thiếu bản SAD nền; cần đồng bộ bản PA04 với Thắng. Use-case v2.0 thay v1.0 làm cơ sở đối chiếu tiếp theo.

Đã kiểm tra hai tài liệu HTML ở desktop và 360 px: ảnh tải đủ, mục lục không trùng ID, không tràn ngang toàn trang; đã xem lại 4 màn hình tích hợp và sơ đồ. Hash SAD Word gốc giữ nguyên. Bằng chứng: [document-integration.json](evidence/document-integration.json).

Thứ tự tiếp theo: nhận review H01/H02 và bàn giao H03 để chỉnh nội dung bị ảnh hưởng; đồng bộ H04 vào báo cáo test; cả nhóm thực hiện H05, sau đó Thắng tích hợp gói nộp. Hai việc tích hợp UI Quỳnh và chuẩn bị SAD riêng đã hoàn thành. Không tự ghép vào SAD gốc, nộp Moodle hoặc xác nhận thời hạn mới.

## Nguồn

- `old PAs/PA4_PhieuGiaoViec.docx`.
- PA1/PA2: Vision, SDP và UseCaseSpecification trong `old PAs/`.
- `old PAs/PA3_PhieuGiaoViec.pdf`, các phần SAD Identity/PetProfile hiện có.
- `old PAs/SoftwareArchitectureDocument_PetCarePlatform_v1.0.docx`, `old PAs/UseCaseSpecification_PetCarePlatform_v2.0.docx`, `old PAs/MeetingMinutes_PA3.docx`, báo cáo tuần 4–5 và `old PAs/ClassDiagrams/`.
- `README.md`, `docs/test/HUONG_DAN_KIEM_THU.md`, mã nguồn và bộ kiểm thử.
