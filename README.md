# Pet Care Platform – bản chạy được của PA4 (Nhóm 12)

Ứng dụng web kết nối chủ thú cưng với cơ sở chăm sóc thú cưng (spa, phòng khám thú y, khách sạn thú cưng).
Đây là phiên bản của Sprint 4: **backend Express + TypeScript**, **frontend React + TypeScript**, cơ sở dữ liệu **SQLite**
(chạy không cần cài đặt; đích triển khai là PostgreSQL, xem SAD mục 5).

> **Thành viên nhóm kiểm thử:** xem [docs/test/HUONG_DAN_KIEM_THU.md](docs/test/HUONG_DAN_KIEM_THU.md)
> (cách clone, chạy, ca kiểm thử được giao và cách báo lỗi bằng GitHub Issues).

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

- Node.js 20 trở lên (đã thử với Node 22) và npm; cần Internet khi chạy `npm install`.

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

### Chỉnh sửa giao diện (không bắt buộc)

```bash
cd frontend
npm install
npm run build        # tạo lại frontend/dist
npm run dev          # chạy Vite ở http://localhost:5173, gọi API ở cổng 3000
```

## Kiểm thử

- Test API của backend (15 ca, chạy trong bộ nhớ): `cd backend && npm test`
- Test chức năng trên trình duyệt (Playwright, 24 ca × 4 trình duyệt): `cd e2e && npm install && npx playwright install chromium && npx playwright test`
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
  docs/test/          Ca kiểm thử (xlsx) và hướng dẫn kiểm thử cho thành viên
```

`frontend/dist` (giao diện đã build) được đưa vào repo để chạy ngay sau khi `npm install` ở backend; sau khi sửa giao diện hãy chạy lại `npm run build` trong `frontend` và commit thư mục `dist`.
