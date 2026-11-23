# Pet Care Platform – bản chạy được của PA4 (Nhóm 12)

Ứng dụng web kết nối chủ thú cưng với cơ sở chăm sóc thú cưng (spa, phòng khám thú y, khách sạn thú cưng).
Đây là phiên bản của Sprint 4: **backend Express + TypeScript**, **frontend React + TypeScript**, cơ sở dữ liệu **SQLite**
(chạy không cần cài đặt; đích triển khai là PostgreSQL, xem SAD mục 5).

> **Thành viên nhóm kiểm thử:** xem [docs/test/HUONG_DAN_KIEM_THU.md](docs/test/HUONG_DAN_KIEM_THU.md)
> (cách clone, chạy, ca kiểm thử được giao và cách báo lỗi bằng GitHub Issues).

> **Phần việc Quân:** [kế hoạch và trạng thái bàn giao](docs/quan/PLAN.md), [SAD mục 5–6](docs/quan/SAD_Sections_5_6.md), [UI prototype](docs/quan/UI_Prototype.html), [rà soát F4 và kết quả kiểm chứng](docs/quan/F4_REVIEW.md).

## Phần Quân bàn giao cho PA04

Nhánh `quan/04` chứa tài liệu Quân và phần sửa code F4, được tạo từ nhánh `fix/1-uc02-session-idle` để có sẵn bàn giao Quỳnh. Đây là phần bàn giao cho nhóm tích hợp, chưa phải toàn bộ gói nộp PA4 của nhóm.

| Phần bàn giao | Vị trí | Cách sử dụng |
|---|---|---|
| SAD mục 5–6 bản riêng | [SAD_Sections_5_6.html](docs/quan/SAD_Sections_5_6.html), [nguồn Markdown](docs/quan/SAD_Sections_5_6.md), `docs/quan/diagrams/` | Mở HTML để xem; dùng Markdown và nguồn PlantUML để chỉnh sửa/tích hợp. SVG là ảnh dùng trong tài liệu. |
| UI prototype | [UI_Prototype.html](docs/quan/UI_Prototype.html), toàn bộ `docs/quan/screens/` | Tài liệu 16 màn hình/trạng thái. Luôn giữ kèm ảnh khi gửi offline. Bốn màn hình dùng bàn giao Quỳnh, có ghi nguồn. |
| Đề xuất đồng bộ SAD mục 1–4 | [SAD_PA04_Alignment.md](docs/quan/SAD_PA04_Alignment.md) | Gửi Thắng đối chiếu; chưa áp dụng vào SAD PA03 gốc. |
| Báo cáo sửa F4 và bằng chứng | [F4_REVIEW.md](docs/quan/F4_REVIEW.md), `docs/quan/evidence/` | Gửi Thái/nhóm để tổng hợp kiểm thử; phân biệt kiểm thử tự động với kết quả chạy tay. |
| Mã nguồn và test F4 | `backend/src/common/time.ts`, `backend/tests/api.test.ts`, `frontend/src/api.ts`, `frontend/src/pages/FacilityPages.tsx`, `frontend/dist/`, `e2e/tests/f4-regression.spec.ts` | Được bàn giao bằng commit trên nhánh; chỉ gửi `docs/quan` sẽ thiếu phần code này. |

`docs/quan/PLAN.md` và `PA03_REVIEW.md` là ghi chú tiến độ/đối chiếu để review; hai script `build_*.py` giúp dựng lại HTML. Giữ các tệp này trong repo để bảo trì, không cần đưa vào bộ tài liệu chính khi Thắng đóng gói bài nộp. Markdown và HTML có vai trò nguồn chỉnh sửa/bản xem; PlantUML và SVG có vai trò nguồn sơ đồ/ảnh xuất, nên không phải bản trùng dư thừa.

Khi bàn giao tài liệu, lấy `docs/quan` cùng các thư mục ảnh/sơ đồ của nó. Các liên kết nguồn Quỳnh dùng `docs/pa4/quynh/`; giữ thư mục này nếu cần mở cả tài liệu nguồn. Phần code lấy từ nhánh `quan/04`. `docs/pa4/quynh/` và `docs/test/` là tài liệu của thành viên/nhóm, không xóa khi dọn phần Quân. `old PAs/` là tư liệu tham chiếu cục bộ, không nằm trong phần commit bàn giao này; SAD PA03 gốc giữ nguyên.

## Chức năng đã chạy được

| Use case | Nội dung |
|---|---|
| UC01 Đăng ký | Chủ thú cưng / chủ cơ sở đăng ký, kiểm tra dữ liệu, e-mail không trùng |
| UC02 Đăng nhập | Phiên đăng nhập phía máy chủ, khóa 15 phút sau 5 lần sai, phiên hết hạn sau 30 phút không hoạt động, trang chủ theo vai trò, đăng xuất |
| UC03 Hồ sơ thú cưng | Thêm / sửa / lưu trữ, mã QR, cân nặng (có biểu đồ), tiêm phòng |
| UC06 Tìm cơ sở | Lọc theo khu vực, loại dịch vụ, giá; sắp xếp; xem chi tiết cơ sở (không cần đăng nhập) |
| UC07, UC08 Đặt lịch | Tính khung giờ trống từ ca làm việc và lịch đã đặt; xác nhận lại trong giao dịch, không đặt trùng |
| UC09 Lịch hẹn của tôi | Xem lịch hẹn sắp tới / đã qua, hủy trước giờ hẹn ít nhất 2 giờ |
| UC11 Lịch hẹn của cơ sở | Chủ cơ sở xem lịch, đổi trạng thái (check-in, bắt đầu, hoàn thành, vắng mặt, hủy) |
| UC25 Thông báo | Thông báo trong ứng dụng, số chưa đọc cập nhật mỗi 30 giây |

Chưa làm (kế hoạch Sprint 5): UC10 lưu trú, UC12–UC15 quản lý cơ sở và nhân viên, UC16–UC19 kết quả dịch vụ, nhắc lịch và AI,
UC20–UC23 đánh giá và quản trị, UC24 quên mật khẩu.

## Yêu cầu

- Dùng Node.js 22 và npm cho bộ dependency hiện tại; cần Internet khi chạy `npm install`. Node 26 không tương thích với `better-sqlite3` 11.x trong bản này (đã kiểm tra khi cài trên Windows).

## Chạy ứng dụng

Giao diện đã được build sẵn trong `frontend/dist`, nên chỉ cần cài backend:

```bash
cd backend
npm install
npm start
```

Mở http://localhost:3000. Lần chạy đầu tiên, máy chủ tạo file `backend/data/petcare.db` và nạp dữ liệu mẫu (giả lập).

Tài khoản mẫu (mật khẩu `Password123`):

| E-mail | Vai trò |
|---|---|
| an.owner@example.com | Chủ thú cưng (đã có 2 thú cưng) |
| binh.owner@example.com | Chủ thú cưng (chưa có thú cưng) |
| lan.fo@example.com | Chủ cơ sở Happy Paws Pet Spa và Bubble Pet Grooming |
| hung.fo@example.com | Chủ cơ sở Pet Care 24 và Pet Hotel Sài Gòn |

Muốn dữ liệu mới: dừng máy chủ, xóa thư mục `backend/data`, chạy lại `npm start`.

## Xem tài liệu UI prototype

Từ thư mục gốc dự án, chạy trong PowerShell:

```powershell
Start-Process ".\docs\quan\UI_Prototype.html"
```

Hoặc mở trực tiếp `docs/quan/UI_Prototype.html` bằng Chrome/Edge. Tài liệu gồm 16 màn hình và trạng thái với ảnh chụp, mục đích, thông tin hiển thị và cách dùng. Chọn mục lục để đến từng màn hình; bấm ảnh để xem kích thước đầy đủ. Giữ thư mục `docs/quan/screens` cạnh tệp HTML để ảnh hiển thị đúng. Xem tài liệu này không cần chạy backend.

## Xem bản SAD riêng của Quân

Từ thư mục gốc dự án, mở bản mục 5–6 bằng PowerShell:

```powershell
Start-Process ".\docs\quan\SAD_Sections_5_6.html"
```

Bản riêng có sơ đồ triển khai UML, mô tả node và cấu trúc mã nguồn. Nguồn chỉnh sửa nằm ở `docs/quan/SAD_Sections_5_6.md`; đề xuất đồng bộ mục 1–4 ở [SAD_PA04_Alignment.md](docs/quan/SAD_PA04_Alignment.md). SAD PA03 gốc được giữ nguyên. Để dựng lại tài liệu sau khi sửa nguồn, chạy `python docs/quan/build_sad_document.py`; để dựng lại UI prototype từ ảnh và mô tả, chạy `python docs/quan/build_ui_prototype.py`.

UI prototype đã tích hợp 4 ảnh và mô tả từ bàn giao Quỳnh, có ghi nguồn dưới từng ảnh. Giữ nguyên cấu trúc thư mục `docs/` để các liên kết tới tài liệu bàn giao hoạt động.

## Sử dụng ứng dụng

Sau khi chạy backend, mở http://localhost:3000 để thao tác trực tiếp:

1. **Chủ thú cưng:** đăng nhập bằng `an.owner@example.com` hoặc đăng ký tài khoản mới. Vào **Thú cưng** để thêm hồ sơ nếu chưa có.
2. **Đặt lịch:** chọn **Tìm cơ sở**, lọc kết quả và chọn một cơ sở. Chọn dịch vụ, thú cưng, ngày, nhân viên nếu muốn, rồi chọn khung giờ trống. Kiểm tra tóm tắt và bấm **Xác nhận đặt lịch**. Khi đổi dịch vụ, ngày hoặc nhân viên, chọn lại khung giờ.
3. **Theo dõi lịch:** vào **Lịch hẹn** để xem lịch sắp tới và đã qua. Lịch đang xác nhận có thể hủy trước giờ hẹn ít nhất 2 giờ; thao tác hủy cần xác nhận lại.
4. **Chủ cơ sở:** đăng xuất rồi đăng nhập bằng `lan.fo@example.com` hoặc `hung.fo@example.com`. Lọc lịch theo ngày/trạng thái và cập nhật check-in, bắt đầu, hoàn thành hoặc hủy theo các nút trên lịch. Khi cơ sở hủy, nhập lý do.
5. **Thông báo:** chọn biểu tượng chuông để xem cập nhật lịch hẹn và đánh dấu đã đọc.

Mật khẩu của các tài khoản mẫu là `Password123`. Dữ liệu trong ứng dụng là dữ liệu giả lập phục vụ demo và kiểm thử.

### Chỉnh sửa giao diện (không bắt buộc)

```bash
cd frontend
npm install
npm run build        # tạo lại frontend/dist
npm run dev          # chạy Vite ở http://localhost:5173, gọi API ở cổng 3000
```

## Kiểm thử

- Test API của backend (17 ca, chạy trong bộ nhớ): `cd backend && npm test`
- Test chức năng trên trình duyệt (Playwright, 26 ca × 4 project trình duyệt/viewport, cộng project chụp màn hình): `cd e2e && npm install && npx playwright install chromium && npx playwright test`
  (project `chrome` và `edge` cần Google Chrome và Microsoft Edge đã cài trên máy; có thể chạy riêng `--project=chromium`).

## Cấu trúc thư mục

```
SourceCode/
  backend/            Máy chủ ứng dụng (Express + TypeScript)
    src/common/       Lớp API chung: AuthMiddleware, RequestValidator, ApiErrorHandler, thời gian
    src/db/           Lược đồ SQLite, mở cơ sở dữ liệu, dữ liệu mẫu
    src/modules/      identity, pet, facility, booking, notification (Controller – Service – Repository)
    tests/            Test API
  frontend/           Giao diện web (React + TypeScript + Vite)
  e2e/                Test chức năng bằng Playwright
  docs/               Tài liệu làm việc: ca kiểm thử (docs/test), mô tả màn hình, bàn giao của từng thành viên (xem docs/README.md)
```

`frontend/dist` (giao diện đã build) được đưa vào repo để chạy ngay sau khi `npm install` ở backend; sau khi sửa giao diện hãy chạy lại `npm run build` trong `frontend` và commit thư mục `dist`.

## Xử lý sự cố

- **`npm install` báo lỗi ở `better-sqlite3`** (thư viện SQLite có phần mã gốc): máy chưa tải được bản build sẵn cho phiên bản Node đang dùng.
  Cài Node.js 22 LTS (đã thử với Node 22.16) rồi xóa thư mục `backend/node_modules` và chạy lại `npm install`.
- **Cổng 3000 đã bị chiếm**: chạy với cổng khác, ví dụ PowerShell `$env:PORT=3001; npm start`.
- **Muốn dữ liệu mẫu mới**: dừng máy chủ, xóa thư mục `backend/data`, chạy lại `npm start`.
