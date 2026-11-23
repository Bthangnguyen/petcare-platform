# PA4 Verification Notes & Test Report for Thái

**Tester:** Thái (Nhóm 12 – NMCNPM)  
**Phân công nhiệm vụ:** Kiểm thử thủ công UC02 (Đăng nhập), xác minh bản sửa lỗi thời hạn phiên (Issue #1 / PR #2), và tổng hợp kết quả kiểm thử PA4.  
**Ngày thực hiện:** 22/11/2026  
**Môi trường thử nghiệm:** Google Chrome `157.0.8103.79` trên Windows 11, Node.js 22, SQLite với dữ liệu giả lập (seeded demo data).  
**Mã nguồn đối chiếu:** Build PA4 `0.4.0` (commit `5777ca3`) và bản sửa lỗi idle timeout (commit `d8138a8`, PR #2).  
**Tệp dữ liệu kiểm thử:** [TestCases_Thai.xlsx](TestCases_Thai.xlsx) (sao chép từ [TestCases_Quynh.xlsx](../quynh/TestCases_Quynh.xlsx) và cập nhật dữ liệu chạy tay của Thái).

---

## 1. Nguồn gốc và quy trình tạo `TestCases_Thai.xlsx`

Theo đúng [Hướng dẫn kiểm thử PA4](../../test/HUONG_DAN_KIEM_THU.md):
1. **Khởi tạo:** Thái sao chép file kết quả [TestCases_Quynh.xlsx](../quynh/TestCases_Quynh.xlsx) do Quỳnh bàn giao để làm việc độc lập, tránh xung đột git.
2. **Kế thừa dữ liệu:** Giữ nguyên 8 ca kiểm thử của **UC03 – Quản lý hồ sơ thú cưng** mà Quỳnh đã kiểm thử đạt (Pass 8/8, có ghi chú cách làm ở cột *Remark*).
3. **Ghi đè kết quả thực tế UC02:** Thái trực tiếp thao tác chạy tay 8 ca kiểm thử của **UC02 – Đăng nhập** trên trình duyệt Google Chrome, thay thế toàn bộ kết quả tự động cũ bằng kết quả quan sát thực tế, đổi `Tester` thành **Thái**, `Tested Date` là **2026-11-22**, và ghi nhận môi trường kiểm thử chi tiết.
4. **Đối chiếu UC07:** Giữ kết quả ca kiểm thử đặt lịch hẹn UC07 đã được đồng bộ từ bản kiểm thử tự động của nhóm.

---

## 2. Bảng kết quả kiểm thử chi tiết UC02 (Đăng nhập)

Toàn bộ 8 ca kiểm thử của UC02 đều **Đạt (Pass 8/8 – 100%)**:

| Case ID | Test case name | Actual Result (Ghi nhận thực tế) | Status | Tester | Tested Date | Remark |
|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-UC02-01** | Log in with a correct e-mail and password | The home page of the pet owner shows "Xin chào, Nguyễn Văn An"; the menu shows the user name and the button "Đăng xuất". | **Pass** | Thái | 2026-11-22 | Manual browser run on Google Chrome 157, Windows 11. Tested with active pet owner account (`an.owner@example.com`). |
| **TC-UC02-02** | Log in with a wrong password | Stays on the login page with the general message "E-mail hoặc mật khẩu không đúng." (it does not reveal whether the e-mail or the password is wrong). | **Pass** | Thái | 2026-11-22 | Manual browser run on Google Chrome 157, Windows 11. |
| **TC-UC02-03** | Log in with an e-mail that is not registered | Same general message as for a wrong password: "E-mail hoặc mật khẩu không đúng."; the system prevents user enumeration. | **Pass** | Thái | 2026-11-22 | Manual browser run on Google Chrome 157, Windows 11. |
| **TC-UC02-04** | Log in with blank e-mail and password | No login; form validation flags both fields with "Vui lòng nhập e-mail." and "Vui lòng nhập mật khẩu." | **Pass** | Thái | 2026-11-22 | Manual browser run on Google Chrome 157, Windows 11. |
| **TC-UC02-05** | The account is blocked after 5 wrong passwords | After the 5th failure: "Bạn đã nhập sai 5 lần. Tài khoản bị khóa 15 phút.". The correct password is also refused while the account is locked: "Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút." | **Pass** | Thái | 2026-11-22 | Manual browser run on Google Chrome 157, Windows 11. Confirmed UC02 A1.2 and NFR-08 lockout rule. |
| **TC-UC02-06** | Log out; protected pages are closed afterwards | After "Đăng xuất", the login page is shown; attempting to open /pets redirects back to /login requiring authentication. | **Pass** | Thái | 2026-11-22 | Manual browser run on Google Chrome 157, Windows 11. Confirmed UC02 A3 session termination. |
| **TC-UC02-07** | The session ends after a period without activity | After the idle period without activity, opening /pets redirects to the login page with "Phiên đăng nhập đã hết hạn.". Background notification badge polling does not extend the session. | **Pass** | Thái | 2026-11-22 | **Verified bug fix for UC02 A4 (PR #2, commit d8138a8):** unread badge polling no longer refreshes `lastActivityAt`. Google Chrome 157, Windows 11. |
| **TC-UC02-08** | A facility owner gets the home page of the role | The facility owner is redirected to "Lịch hẹn của cơ sở" (/facility/bookings); the menu does not display the "Thú cưng" item of the pet owner. | **Pass** | Thái | 2026-11-22 | Manual browser run on Google Chrome 157, Windows 11. Tested with facility owner demo account (`lan.fo@example.com`). |

---

## 3. Xác minh chuyên sâu lỗi UC02 A4 (Session Idle Timeout – Issue #1)

* **Hiện tượng lỗi ban đầu:** Giao diện có cơ chế polling ngầm gọi `GET /api/notifications/unread-count` mỗi 30 giây để cập nhật số lượng thông báo chưa đọc. Trước bản sửa, middleware xác thực phiên tự động cập nhật thời điểm hoạt động (`touch()` / `lastActivityAt`), vô tình giữ phiên đăng nhập mãi mãi dù người dùng không thao tác.
* **Xác minh bản sửa của Thắng (commit `d8138a8`):**
  * Tách biệt cơ chế xác thực: Polling ngầm đếm thông báo được gắn tùy chọn `{ recordActivity: false }` — xác thực phiên nhưng **không cập nhật thời điểm hoạt động**.
  * Khi hết thời gian idle (`SESSION_IDLE_SECONDS`), request đếm thông báo nhận phản hồi `401 Unauthorized (SESSION_EXPIRED)`. Khi người dùng truy cập trang được bảo vệ (`/pets`), hệ thống chuyển hướng về trang đăng nhập kèm thông báo *"Phiên đăng nhập đã hết hạn."*.
  * Ngược lại, khi người dùng chủ động mở trang thông báo (`/api/notifications`), hệ thống vẫn cập nhật hoạt động bình thường.
  * Bản sửa đã được kiểm chứng bằng test API tự động (16/16 pass), test Playwright (16/16 pass), và kiểm thử tay trên Chrome đạt chuẩn.

---

## 4. Tình trạng bàn giao kiểm thử PA4 toàn nhóm

| Use Case | Người phụ trách | Kết quả | Trạng thái trong `TestCases_Thai.xlsx` |
|---|---|:---:|:---:|
| **UC01 Đăng ký** | Nhóm | Đạt | Đã kiểm tra theo ghi chú xác minh |
| **UC02 Đăng nhập** | **Thái** | **Pass 8/8** | **Đã cập nhật kết quả chạy tay của Thái** |
| **UC03 Hồ sơ thú cưng** | Quỳnh | Pass 8/8 | Kế thừa nguyên vẹn từ bản nộp của Quỳnh |
| **UC07 Đặt lịch hẹn** | Trường | Pass 8/8 | Đồng bộ kết quả kiểm thử tự động Playwright |

**Kết luận:** File [TestCases_Thai.xlsx](TestCases_Thai.xlsx) đã hoàn tất 100% dữ liệu, chuẩn hóa tiếng Anh đồng bộ với phong cách dự án, và đáp ứng đầy đủ yêu cầu nghiệm thu bàn giao của giai đoạn PA4.
