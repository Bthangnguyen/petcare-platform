# Quy trình làm việc (Sprint 5 – PA5)

Mục tiêu: 5 người làm song song mà không giẫm chân nhau, mọi thay đổi đều được một người khác xem lại trước khi vào `main`.

## 1. Nhận việc

- Mỗi việc là một **GitHub Issue** (nhãn `sprint5`) có: mô tả, tiêu chí hoàn thành, file được phép sửa, hạn, **người review chéo**.
- Chỉ làm việc được giao cho mình. Muốn đổi người, đổi hạn hoặc cắt việc thì nói trong nhóm chat hoặc buổi họp tuần.
- Bị kẹt thì báo ngay trong issue (đừng chờ đến hạn). Kiểm tra giữa vòng: thứ Tư 02/12 và 09/12.

## 2. Chuẩn bị nhánh

```bash
git clone https://github.com/<tài khoản của bạn>/petcare-platform.git      # bản fork của bạn
git remote add upstream https://github.com/Bthangnguyen/petcare-platform.git
git fetch upstream
git checkout -b feat/uc12-dang-ky-co-so upstream/main                        # một nhánh cho mỗi use case
```

Tên nhánh: `feat/ucXX-ten-ngan`. Trước khi làm tiếp ở ngày hôm sau: `git fetch upstream && git rebase upstream/main`.

## 3. Mỗi use case có file riêng – không sửa file của người khác

Nền tảng (PR `feat/sprint5-foundation`) đã tạo sẵn khung cho từng use case. Bạn chỉ sửa file của use case mình; đầu mỗi file có ghi **chủ sở hữu**.

| Việc | File của use case |
|---|---|
| API (router) | `backend/src/modules/<module>/<tên>.controller.ts` (đã mount sẵn trong `app.ts`, đang trả 501) |
| Nghiệp vụ và SQL | file `*.service.ts` và `*.repository.ts` mới, đặt cạnh router trong cùng thư mục module |
| Trang giao diện | `frontend/src/pages/<Tên>Pages.tsx` (route đã đăng ký sẵn trong `App.tsx`, đang là trang giữ chỗ) |
| Dữ liệu mẫu | `backend/src/db/seed-uc/ucXX.ts` (chạy cuối `seedDemoData`) |
| Test API | `backend/tests/ucXX.test.ts` |
| Test chức năng (nếu có) | `e2e/tests/ucXX-*.spec.ts` |

**Không sửa** `app.ts`, `App.tsx`, `Layout.tsx`, `schema.ts`, `seed.ts`, `deps.ts`, `frontend/dist`. Cần thêm bảng, cột, menu hay route thì mở issue gắn nhãn `foundation` hoặc báo Thắng; Thắng làm trong một PR nhỏ riêng.
Dùng chức năng của module khác qua **service** có trong `deps` (`deps.identity`, `deps.notifications`, `deps.catalog`, `deps.pets`, `deps.bookings`, `deps.mailer`, `deps.auth`; UC17 và UC20 có sẵn cổng `deps.reminders` và `deps.ratings`, đang là bản rỗng cho đến khi hai use case đó được merge), không đọc bảng của module khác.

Chạy thử giao diện khi đang làm: mở hai cửa sổ, `cd backend && npm start`, rồi `cd frontend && npm run dev` (Vite ở http://localhost:5173, tự chuyển `/api` sang cổng 3000). Xóa `backend/data` để có dữ liệu mẫu mới.

## 4. Pull request

1. Mở PR **nháp (Draft)** ngay từ ngày đầu, ghi `Closes #<số issue>` để Thắng thấy tiến độ.
2. Mỗi PR chỉ một use case (hoặc một việc), nhỏ và dễ đọc.
3. Trước khi bấm **Ready for review**, chạy và dán kết quả vào PR:
   ```bash
   cd backend && npx tsc --noEmit && npm test
   cd ../frontend && npx tsc --noEmit
   ```
4. Có ít nhất một test API cho use case; test cũ không được hỏng.
5. **Không đưa `frontend/dist` vào PR.** Thắng build lại một lần ở mỗi mốc (28/11, 05/12, 11/12, 18/12). CI sẽ báo lỗi nếu PR có sửa `dist`.

## 5. Review chéo – bắt buộc trước khi merge

Mỗi PR có **đúng một người review chéo**, theo bảng:

| Tác giả PR | Người review chéo |
|---|---|
| Quân | Trường |
| Trường | Quỳnh |
| Quỳnh | Quân |
| Thắng (PR nền tảng) | Quân |
| Thắng (UC17, UC19) | Thái |
| Thái (test case, Katalon, báo cáo kiểm thử) | Thắng |

Người review:

- Lấy nhánh về chạy thử và **thử từng tiêu chí hoàn thành** của issue (không chỉ đọc code).
- Đọc diff: đúng file được phép, có test, không có mật khẩu hay khóa trong code, thông báo lỗi bằng tiếng Việt như phần còn lại.
- Để comment trực tiếp trên PR; chỉ bấm **Approve** khi mọi tiêu chí đã đạt. Trả lời trong vòng 24 giờ.

Tác giả sửa theo comment trong 24 giờ và báo lại cho người review.

## 6. Merge

- **Thắng merge** sau khi có Approve của người review chéo và CI xanh. Tác giả không tự merge, người review không merge hộ.
- Dùng "Create a merge commit" để giữ lịch sử các commit.
- Sau khi merge: xóa nhánh, `git fetch upstream && git rebase upstream/main` ở các nhánh đang làm.

## 7. Hạn và mốc

Xem `docs/` và kế hoạch PA5. Mốc chính: PR nền tảng 28/11; vòng 1 xong 05/12; vòng 2 và **đóng băng tính năng 11/12**; kiểm thử 12–15/12; **đóng băng mã nguồn 18/12 18:00**; thuyết trình 19/12.
