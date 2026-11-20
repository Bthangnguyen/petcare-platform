# Hướng dẫn kiểm thử cho thành viên (PA4)

Mục đích: mỗi thành viên **chạy tay** các ca kiểm thử được giao, ghi kết quả thật và báo lỗi (nếu có).

## 1. Lấy mã và chạy ứng dụng

```bash
git clone https://github.com/Bthangnguyen/petcare-platform.git
cd petcare-platform/backend
npm install
npm start
```

Mở http://localhost:3000. Tài khoản mẫu (mật khẩu `Password123`): `an.owner@example.com` (chủ thú cưng có 2 thú cưng),
`binh.owner@example.com` (chưa có thú cưng), `lan.fo@example.com` và `hung.fo@example.com` (chủ cơ sở).
Muốn dữ liệu sạch: dừng server, xóa thư mục `backend/data`, chạy lại `npm start`.

Yêu cầu: Node.js 20 trở lên (đã thử với 22), Git, trình duyệt Chrome hoặc Edge.

## 2. Phân công chạy tay (theo phiếu giao việc PA4)

| Người | Use case | Các ca |
|---|---|---|
| Thái | UC02 Đăng nhập | TC-UC02-01 … TC-UC02-08 (ít nhất 5 ca) |
| Quỳnh | UC03 Hồ sơ thú cưng | TC-UC03-01 … TC-UC03-08 (ít nhất 5 ca) |
| Trường | UC07 Đặt lịch hẹn | TC-UC07-01 … TC-UC07-08 (ít nhất 5 ca) |

Quân và Thắng: chạy thử một số ca bất kỳ ở trình duyệt khác (ví dụ Edge) để so sánh.

## 3. Cách chạy một ca và ghi kết quả

1. Mở `docs/test/TestCases_PetCarePlatform.xlsx`, sheet **Test cases**. **Lưu thành bản của riêng bạn**
   (ví dụ `TestCases_Quynh.xlsx`) để không bị xung đột khi nhiều người cùng sửa; Thái gộp kết quả sau.
2. Làm đúng từng bước ở cột *Test step*, so với cột *Expected Result*.
3. Điền: **Actual Result** (điều bạn thấy thật), **Status** (Pass / Fail), **Tester** (tên bạn),
   **Tested Date**, và trình duyệt vào cột *Remark* (ví dụ "Chrome 157, Windows 11").
4. Ca nào **Fail** thì tạo Issue trên GitHub (mẫu "Báo lỗi / Bug report"), ghi mã ca (ví dụ TC-UC07-03), các bước, kết quả mong đợi, kết quả thực tế, mức độ.

Lưu ý: cột *Actual Result* và *Status* trong file mẫu đang là kết quả của lần chạy **tự động** (Playwright). Hãy ghi đè bằng kết quả chạy tay của bạn.

## 4. Chạy kiểm thử tự động (không bắt buộc)

```bash
cd backend && npm test                      # 15 test API
cd ../e2e && npm install
npx playwright install chromium
npx playwright test --project=chromium      # 24 ca trên Chromium
```

Các project `chrome` và `edge` cần Google Chrome và Microsoft Edge đã cài trên máy.

## 5. Quy trình sửa lỗi (theo kế hoạch dự án)

- Mỗi lỗi là một Issue; sửa trên nhánh riêng (`fix/<số issue>-mo-ta-ngan`), commit ghi số issue.
- Mở Pull Request vào `main`, cần ít nhất 1 người review trước khi gộp.
- Sau khi sửa, chạy lại ca bị lỗi và cập nhật kết quả.
