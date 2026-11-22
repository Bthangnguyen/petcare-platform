# Mô tả màn hình – Tìm cơ sở (UC06), Chi tiết cơ sở & Đặt lịch (UC07/UC08), Lịch hẹn của cơ sở (UC11)

Tài liệu mô tả chi tiết các màn hình đã cài đặt trong mã nguồn (`frontend/src/pages/FacilityPages.tsx`, `frontend/src/pages/BookingPages.tsx`) đối chiếu với đặc tả Use Case (`docs/PA2-Group13/first.md`).

---

## 1. Màn hình Tìm cơ sở (`/facilities`)

- **Use case liên quan:** UC06 – Search facilities (bước 1–5, A1, A2).
- **Thành phần:** `FacilitiesPage` ([FacilityPages.tsx](file:///d:/Learning/NMCNPM/petcare-platform/frontend/src/pages/FacilityPages.tsx)).
- **Đối tượng sử dụng:** Khách vãng lai và tất cả người dùng đã đăng nhập (không yêu cầu đăng nhập).
- **Mục đích:** Cho phép tìm kiếm, lọc và sắp xếp các cơ sở chăm sóc thú cưng đã được duyệt (`APPROVED`) và có ít nhất một dịch vụ đang hoạt động.

### 1.1. Bố cục và các thành phần giao diện

| Khu vực | Thành phần | Kiểu / Nhãn | Mô tả hoạt động |
|---|---|---|---|
| Tiêu đề | `PageTitle` | `Tìm cơ sở chăm sóc thú cưng` | Tiêu đề trang. |
| Bộ lọc (`form.card.filters`) | Từ khóa (`#q`) | Ô nhập văn bản (`placeholder="Tên cơ sở hoặc dịch vụ..."`) | Tìm không phân biệt dấu theo tên cơ sở, địa chỉ hoặc tên dịch vụ. |
| | Khu vực (`#area`) | Danh sách chọn (`select`) | Giá trị: `Tất cả khu vực`, `Quận 1`, `Quận 3`, `Bình Thạnh`, `Thủ Đức`. |
| | Loại dịch vụ (`#type`) | Danh sách chọn (`select`) | Giá trị: `Tất cả`, `Spa / grooming` (`GROOMING`), `Thú y` (`VETERINARY`), `Lưu trú` (`BOARDING`). |
| | Giá từ (₫) (`#minPrice`) | Ô nhập số (`inputMode="numeric"`) | Chỉ nhận ký tự số; lọc cơ sở có dịch vụ giá $\ge$ giá trị nhập. |
| | Giá tối đa (₫) (`#maxPrice`) | Ô nhập số (`inputMode="numeric"`) | Chỉ nhận ký tự số; lọc cơ sở có dịch vụ giá $\le$ giá trị nhập. |
| | Nút `Tìm kiếm` | Button `submit` | Gọi `GET /api/facilities` với các tham số lọc hiện tại. |
| | Nút `Xóa bộ lọc` | Button `button` | Chỉ hiện khi có ít nhất 1 bộ lọc đang được chọn; đặt lại toàn bộ bộ lọc và tải lại danh sách. |
| Thanh kết quả | Số lượng kết quả | `<N> cơ sở` (`data-testid="result-count"`) | Hiển thị tổng số cơ sở khớp bộ lọc. |
| | Sắp xếp | Danh sách chọn (`aria-label="Sắp xếp"`) | `Tên` (`name`), `Giá thấp đến cao` (`priceAsc`), `Giá cao đến thấp` (`priceDesc`); đổi lựa chọn sẽ tải lại ngay. |
| Danh sách thẻ cơ sở | Thẻ `.facility-card` | Link tên cơ sở (`/facilities/:id`) | Hiển thị: Tên cơ sở (link mở chi tiết), địa chỉ, chip loại dịch vụ, danh sách tên dịch vụ (ngăn cách bởi `·`), `Giá từ <tiền> ₫`, đánh giá (`★ <điểm>` hoặc `Chưa có đánh giá`). |

### 1.2. Trạng thái đặc biệt & xử lý lỗi
- **Đang tải:** Hiển thị `Spinner`.
- **Không có kết quả (UC06 A1):** Hiển thị hộp thông báo `"Không tìm thấy cơ sở phù hợp. Hãy mở rộng khu vực hoặc bỏ bớt bộ lọc."` kèm nút `Xóa bộ lọc` (nếu đang lọc).
- **Lỗi mạng / API:** Hiển thị `ErrorBox` với thông báo lỗi tiếng Việt từ máy chủ.

---

## 2. Màn hình Chi tiết cơ sở & Đặt lịch (`/facilities/:id`)

- **Use case liên quan:** UC06 (bước 6–7, A3), UC07 – Book appointment, UC08 – Check availability.
- **Thành phần:** `FacilityDetailPage` ([FacilityPages.tsx](file:///d:/Learning/NMCNPM/petcare-platform/frontend/src/pages/FacilityPages.tsx)).
- **Đối tượng sử dụng:** Khách vãng lai (xem chi tiết và xem khung giờ trống), Chủ thú cưng `PET_OWNER` (đặt lịch hẹn).

### 2.1. Bố cục và các thành phần giao diện

| Khu vực | Thành phần | Mô tả hoạt động |
|---|---|---|
| Thông tin cơ sở | Tiêu đề + `.card` | Tên cơ sở, mô tả, bảng thông tin (`dl.facts`): `Địa chỉ`, `Giờ mở cửa`, `Điện thoại`, `Đánh giá` (`★ <điểm>` hoặc `Chưa có đánh giá`). |
| Dịch vụ và bảng giá | Bảng `.table` | Các cột: `Dịch vụ`, `Loại` (`Spa / grooming`, `Thú y`, `Lưu trú`), `Thời gian` (`<phút> phút` hoặc `Theo đêm`), `Giá` (`<tiền> ₫`). Bên dưới liệt kê `Nhân viên: <danh sách tên>`. |
| Đặt lịch (`#booking-title`) | Thông báo lưu trú | Nếu cơ sở chỉ có dịch vụ `BOARDING` (như *Pet Hotel Sài Gòn*), hiển thị thông báo tính năng đặt phòng lưu trú sẽ có ở phiên bản sau. |
| | `1. Chọn dịch vụ` | Danh sách `radio` cho các dịch vụ `GROOMING` / `VETERINARY` đang hoạt động: `<Tên> – <Thời gian> phút – <Giá> ₫`. |
| | `2. Chọn thú cưng` | Chỉ hiện với `PET_OWNER`. Nếu chưa có thú cưng (UC07 A3): hiện `"Bạn chưa có hồ sơ thú cưng."` và link `Tạo hồ sơ thú cưng` (`/pets/new`). Nếu đã có: `select` danh sách thú cưng `<Tên> (<Loài>)`. |
| | `3. Chọn ngày` & `Nhân viên (không bắt buộc)` | Ô `input[type="date"]` (`min={today()}`, mặc định hôm nay) và `select` nhân viên (`Bất kỳ` hoặc từng nhân viên có ca làm việc trong danh sách khung giờ). |
| | `4. Chọn khung giờ` | Gọi `GET /api/facilities/:id/availability`. Hiển thị các nút khung giờ `HH:mm – HH:mm` (`data-testid="slot-HH:mm"`). Nếu hết chỗ (UC07 A2): hiện `"Không còn khung giờ trống trong ngày này."` và các nút chọn nhanh `Các ngày gần nhất còn chỗ`. |
| | `5. Xác nhận đặt lịch` (`data-testid="booking-summary"`) | Hiện khi đã chọn khung giờ: tóm tắt `Cơ sở`, `Dịch vụ`, `Thú cưng`, `Thời gian`, `Nhân viên` (`(sắp xếp tự động)` nếu chọn `Bất kỳ`), `Giá`. |
| | Hành động ở bước 5 | - Chưa đăng nhập (UC06 A3): hiện `"Bạn cần đăng nhập để đặt lịch."` và link `Đăng nhập` (`/login?next=...` lưu lại `service`, `date`, `time`).<br>- Đã đăng nhập: nút `Xác nhận đặt lịch` (`POST /api/bookings`) và nút `Hủy` (đóng tóm tắt, UC07 A4). |

### 2.2. Trạng thái đặc biệt & xử lý lỗi
- **Đặt lịch thành công:** Hiển thị `data-testid="booking-success"` với nội dung `"Đặt lịch thành công: <Thú cưng> – <Dịch vụ>, <Giờ> ngày <dd/mm/yyyy>, nhân viên <Tên>."` và link `Xem lịch hẹn của tôi` (`/bookings`).
- **Trùng khung giờ (UC07 A1, HTTP `409 SLOT_TAKEN`):** Hiển thị cảnh báo `"Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác."`, đóng tóm tắt và cập nhật ngay danh sách khung giờ trống mới nhất.

---

## 3. Màn hình Lịch hẹn của cơ sở (`/facility/bookings`)

- **Use case liên quan:** UC11 – Manage facility bookings (bước 1–5, A1, A2, A3).
- **Thành phần:** `FacilityBookingsPage` ([BookingPages.tsx](file:///d:/Learning/NMCNPM/petcare-platform/frontend/src/pages/BookingPages.tsx)).
- **Đối tượng sử dụng:** Chủ cơ sở (`FACILITY_OWNER`), được bảo vệ bởi `RequireAuth(role="FACILITY_OWNER")` ở frontend và `requireRole('FACILITY_OWNER')` ở backend.

### 3.1. Bố cục và các thành phần giao diện

| Khu vực | Thành phần | Mô tả hoạt động |
|---|---|---|
| Tiêu đề | `PageTitle` | `Lịch hẹn của cơ sở`. |
| Bộ lọc (`.card.filters`) | `Ngày` (`input[type="date"]`) | Mặc định là ngày hôm nay (`today()`). |
| | `Cơ sở` (`select`) | Chỉ hiển thị khi chủ cơ sở sở hữu từ 2 cơ sở trở lên; mặc định `Tất cả cơ sở`. |
| | `Nhân viên` (`select`) | Mặc định `Tất cả nhân viên`; tự động lọc danh sách nhân viên theo cơ sở đang chọn (nếu có). |
| | `Trạng thái` (`select`) | `Tất cả`, `Đã xác nhận`, `Đã check-in`, `Đang thực hiện`, `Hoàn thành`, `Vắng mặt`, `Đã hủy`. |
| | Nút `Tất cả các ngày` / `Hôm nay` | Bật/tắt nhanh bộ lọc ngày. |
| Danh sách lịch hẹn | Thẻ `.booking` (`data-testid="facility-booking-row"`) | Hiển thị: `<Giờ bắt đầu> – <Giờ kết thúc> · <Tên dịch vụ>`, chip trạng thái (`StatusChip`), `<Tên cơ sở> · <dd/mm/yyyy> · Nhân viên: <Tên>`, `Thú cưng: <Tên> · Dị ứng: <danh sách hoặc "không có"> · <Giá> ₫`, và `Lý do hủy` (nếu có). |
| Thao tác trạng thái | Nút chuyển trạng thái | - Khi `CONFIRMED`: `Check-in`, `Vắng mặt`.<br>- Khi `CHECKED_IN`: `Bắt đầu`.<br>- Khi `IN_PROGRESS`: `Hoàn thành`. |
| | `Đổi nhân viên` (UC11 A1) | Hiện với `CONFIRMED` / `CHECKED_IN` khi cơ sở có nhiều hơn 1 nhân viên: mở `select` chọn nhân viên khác + `Lưu nhân viên` (`POST /api/facility-bookings/:id/reassign`) + `Hủy`. |
| | `Hủy lịch` (UC11 A2) | Hiện với `CONFIRMED` / `CHECKED_IN`: mở ô nhập `Lý do hủy` (bắt buộc) + `Xác nhận hủy` + `Không`. |

### 3.2. Trạng thái đặc biệt & xử lý lỗi
- **Không có lịch hẹn khớp bộ lọc (UC11 A3):** Hiển thị `"Không có lịch hẹn nào phù hợp với bộ lọc."`.
- **Chuyển trạng thái không hợp lệ / nhân viên bận:** Hiển thị `ErrorBox` với thông báo lỗi cụ thể từ máy chủ; mọi cập nhật trạng thái hoặc đổi nhân viên hợp lệ đều gửi thông báo cho chủ thú cưng.
