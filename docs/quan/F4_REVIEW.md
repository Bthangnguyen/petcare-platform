# Rà soát và kiểm chứng phần đặt lịch F4

Ngày thực hiện: 22/11/2026. Phạm vi Quân: luồng UC07 đặt lịch, UC08 giờ trống, UC09 lịch hẹn của tôi và tích hợp với module hiện có. Đây là kết quả kiểm chứng tự động của đợt sửa; kết quả chạy tay và báo cáo nhóm do Thái tổng hợp riêng.

## Kết quả

| Hạng mục | Kết quả thực chạy |
|---|---|
| API backend | 17/17 ca đạt trên nhánh bàn giao, gồm ca ngày không tồn tại và ca idle polling UC02 của Quỳnh |
| Backend TypeScript | `npm run typecheck` đạt |
| Frontend | `npm run build` đạt, đã cập nhật `frontend/dist` |
| UC07 và hồi quy F4 trên Chrome | 10/10 ca đạt |
| UC07 và hồi quy F4 trên Edge | 10/10 ca đạt |
| UC07 và hồi quy F4 trên viewport 360 × 740 | 10/10 ca đạt |
| Kiểm thử tích hợp trước bàn giao | 78/78 lượt đạt: 26 ca UC02, UC03, UC07 và hồi quy F4 trên Chrome, Edge, mobile 360 px |
| Chụp UI | Project `screens` đạt; tạo 18 ảnh desktop/mobile, trong đó 16 ảnh được dùng trong tài liệu |
| Bố cục | Bộ chụp xác nhận trang đặt lịch không tràn ngang ở 360 CSS px; tài liệu HTML cũng không tràn ngang ở chiều rộng này |

Môi trường: Windows trên máy làm việc; Node 22.14.0 dùng riêng trong phiên; Chrome 157.0.8103.79; Edge 158.0.4370.33; Chromium 159.0.8154.6 dùng cho mobile và bộ chụp. CSDL test là SQLite riêng do Playwright tạo và SQLite trong bộ nhớ cho test API. Không dùng dữ liệu thật.

## Phát hiện và thay đổi

| ID | Bằng chứng trước sửa | Hành vi sau sửa | Tệp chính |
|---|---|---|---|
| F4-01 | API giờ trống trả HTTP 200 với `2026-11-31`; ca mới mong đợi 400 bị fail | Kiểm tra round-trip ngày ISO để từ chối ngày bị JavaScript tự chuẩn hóa. API giờ trống và tạo lịch đều trả 400 cho ngày không tồn tại. | `backend/src/common/time.ts`, `backend/tests/api.test.ts` |
| F4-02 | Chọn giờ rồi đổi nhân viên: tóm tắt của lựa chọn trước vẫn tồn tại; test Edge fail | Đổi nhân viên xóa lựa chọn giờ, buộc chọn lại trước khi xác nhận. | `frontend/src/pages/FacilityPages.tsx`, `e2e/tests/f4-regression.spec.ts` |
| F4-03 | Đổi ngày và giữ request giờ trống mới chưa trả lời: tóm tắt/khung giờ cũ vẫn hiện; test Edge fail | Đổi cơ sở, dịch vụ hoặc ngày xóa giờ trống, lựa chọn giờ và bộ lọc nhân viên. Response cũ được bỏ qua bằng số thứ tự request; xác nhận kiểm tra ngày/dịch vụ của dữ liệu giờ trống. | `frontend/src/pages/FacilityPages.tsx`, `frontend/src/api.ts` |
| ENV-01 | `npm ci` thất bại trên Node 26.13.1 khi build `better-sqlite3` 11.10.0 | Cài và chạy thành công bằng Node 22.14.0 riêng; cập nhật README và hướng dẫn kiểm thử dùng Node 22. | `README.md`, `docs/test/HUONG_DAN_KIEM_THU.md` |

Hai ca hồi quy UI đã được chạy trên bản chưa sửa và cùng thất bại, rồi chạy đạt trên ba môi trường sau sửa. Ca API mới ban đầu thất bại với `200 !== 400`, sau sửa đạt. Cơ chế bỏ response cũ được rà soát trong code; chưa có ca riêng đảo thứ tự hai response, nên không coi đây là kết quả đã kiểm thử độc lập.

## Đối chiếu use case

| Yêu cầu | Hiện thực và kiểm chứng |
|---|---|
| UC07 chọn dịch vụ, thú cưng, ngày, nhân viên và giờ; xem tóm tắt | `FacilityPages.tsx`; TC-UC07-01, 02, 08 |
| UC07 kiểm tra lại chỗ và không đặt trùng nhân viên | Giao dịch `IMMEDIATE`, kiểm tra chồng lấn và chỉ mục duy nhất; test API đồng thời, TC-UC07-03 |
| UC07 chưa có thú cưng, khách chưa đăng nhập, rời bước xác nhận | TC-UC07-05, 06, 07 |
| UC08 tính giờ từ ca làm, thời lượng dịch vụ và lịch đang hoạt động | `availability.service.ts`, test API giờ trống; TC-UC07-04 kiểm tra đóng cửa và gợi ý ngày gần nhất |
| UC09 xem và hủy lịch trước ít nhất hai giờ, giải phóng chỗ | `booking.service.ts`, `BookingPages.tsx`; test API hủy sớm/hủy muộn và kiểm tra chỗ sau hủy |
| UC07 thông báo cho chủ thú cưng và cơ sở | Service tạo hai thông báo trong ứng dụng; test API xác nhận thông báo phía chủ thú cưng, bộ chụp UI thể hiện màn hình thông báo |

UC11 có trong bộ API để kiểm tra tích hợp cập nhật trạng thái bởi chủ cơ sở; phần F3/F6 và kết quả chạy tay UC07 của Trường vẫn cần bàn giao. Không mở rộng sang lưu trú UC10, email, AI hay đầy đủ quản lý nhân viên.

## Chạy lại

Dùng Node 22. Từ thư mục tương ứng:

```powershell
# backend
npm ci
npm test
npm run typecheck

# frontend
npm ci
npm run build

# e2e
npm ci
npx playwright install chromium
npx playwright test tests/uc07-booking.spec.ts tests/f4-regression.spec.ts --project=chrome --project=edge --project=mobile-360
```

Chrome và Edge cần đã cài trên máy. Hai cổng 3100/3101 phải trống; không chạy đồng thời hai lệnh Playwright vì cùng dùng các cổng này. Cấu hình tự khởi động máy chủ và tạo CSDL test riêng.

Để chụp và dựng lại tài liệu, từ thư mục gốc repo:

```powershell
$env:SCREENSHOT_DIR = Join-Path (Get-Location) 'e2e/results/screens'
Push-Location e2e
npx playwright test --project=screens
Pop-Location
python docs/quan/build_ui_prototype.py
```

Ảnh thô được chụp vào `e2e/results/screens` (không đưa vào Git); script chỉ sao chép các ảnh được tài liệu sử dụng vào `docs/quan/screens`, kèm bốn ảnh bàn giao Quỳnh. Thư mục ảnh bàn giao hiện có đúng 16 ảnh. Các đường dẫn ảnh trong JSON của lần chụp cũ là thông tin lịch sử, không phải danh sách tệp bắt buộc của tài liệu hiện tại.

## Bằng chứng và giới hạn

- [Kết quả UI trước sửa](evidence/f4-before-fix.json): 2 ca Edge thất bại.
- [Kết quả F4 sau sửa](evidence/f4-after-fix.json): 30 ca đạt, không skip hay flaky.
- [Kết quả tích hợp trên nhánh bàn giao](evidence/integration-after-merge.json): 78 lượt đạt, không skip hay flaky; đã kết hợp bản sửa UC02 của Quỳnh.
- [Kết quả chụp UI](evidence/ui-screens.json).
- [Log API và typecheck](evidence/backend-checks.txt).
- Ảnh chụp tại [screens](screens/), tài liệu [UI Prototype](UI_Prototype.html).

Đợt này chưa thực hiện benchmark ngưỡng một/hai giây của đặc tả, stress test nhiều tiến trình hay kiểm chứng PostgreSQL. Kết quả tự động không phải kết quả chạy tay có xác nhận của Quân, Trường hoặc Thái. Chưa ghi đè Excel test cases và chưa tạo Issue/PR bên ngoài.

## Đầu vào còn chờ

Theo [PLAN.md](PLAN.md): Thắng xác nhận kiến trúc/SAD và phản hồi TA; Quỳnh bàn giao hoặc review F1/F2 cùng mô tả màn hình; Trường review F3/F6, seed và gửi kết quả UC07; Thái đồng bộ mã ca, lỗi và báo cáo kiểm thử. Khi code nhóm thay đổi, chỉ chạy lại các kiểm tra liên quan và cập nhật ảnh/nội dung bị ảnh hưởng.
