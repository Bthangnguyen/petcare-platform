## Việc này làm gì

Closes #<số issue>

<!-- Một đến hai câu: use case nào, thay đổi gì. -->

## Người review chéo

<!-- Tên theo bảng trong CONTRIBUTING.md, ví dụ: Trường -->

## Tác giả kiểm tra trước khi bấm Ready for review

- [ ] Chỉ sửa file thuộc use case của mình (không sửa `app.ts`, `App.tsx`, `Layout.tsx`, `schema.ts`, `seed.ts`, `deps.ts`)
- [ ] **Không** có file nào trong `frontend/dist`
- [ ] `cd backend && npx tsc --noEmit && npm test` đạt (dán kết quả bên dưới)
- [ ] `cd frontend && npx tsc --noEmit` đạt
- [ ] Có ít nhất một test API cho use case
- [ ] Đã tự chạy thử trên máy: luồng chính và ít nhất một luồng lỗi
- [ ] Có dữ liệu mẫu trong `backend/src/db/seed-uc/` nếu cần cho demo
- [ ] Thông báo cho người dùng bằng tiếng Việt, kiểm tra dữ liệu ở phía máy chủ

## Kết quả kiểm tra

```
npm test:  # tests X, pass X, fail 0
```

## Dành cho người review chéo

- [ ] Đã lấy nhánh về và chạy
- [ ] Đã thử từng tiêu chí hoàn thành trong issue
- [ ] Đã đọc diff (đúng file được phép, có test, không có bí mật trong code)
- [ ] Approve
