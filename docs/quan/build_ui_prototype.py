"""Build the offline UI document using screenshots from the Playwright screens project."""
from html import escape
from pathlib import Path
import os
import shutil

ROOT = Path(__file__).resolve().parent
QUYNH_UI = ROOT.parent / 'pa4' / 'quynh' / 'UI'
# Keep Quỳnh's original files unchanged and bundle copies with the offline document.
HANDOFF_IMAGES = {
    '02_login': '01-login.png',
    '04_register': '02-register.png',
    '05_home_owner': '03-owner-home.png',
    '08_pet_detail': '04-pet-profile.png',
}
SCREENS = [
    ('01_home_visitor', 'Trang chính cho khách', '/', 'Khách chưa đăng nhập', 'Các luồng UC01, UC02, UC06',
     'Giới thiệu nền tảng và đưa người dùng tới các thao tác chính.',
     'Thông điệp chăm sóc thú cưng, thanh điều hướng, nút tìm cơ sở, đăng ký và đăng nhập.',
     'Chọn Tìm cơ sở để tra cứu công khai; chọn Đăng ký miễn phí hoặc Đăng nhập để dùng chức năng theo vai trò.'),
    ('02_login', 'Đăng nhập', '/login', 'Khách', 'UC02',
     'Cho người dùng đã đăng ký bắt đầu phiên và truy cập khu vực phù hợp với vai trò.',
     'Trường e-mail và mật khẩu, nút đăng nhập, liên kết đăng ký; phản hồi kiểm tra dữ liệu hoặc đăng nhập khi có.',
     'Nhập e-mail và mật khẩu rồi chọn Đăng nhập. Chủ thú cưng đến trang chủ; chủ cơ sở đến trang lịch hẹn cơ sở. Nếu đến từ đặt lịch, sau đăng nhập hệ thống trở lại cơ sở và lựa chọn đã lưu trên URL.'),
    ('03_login_errors', 'Đăng nhập với dữ liệu thiếu', '/login', 'Khách', 'UC02 luồng lỗi',
     'Hướng dẫn sửa dữ liệu trước khi gửi yêu cầu đăng nhập.',
     'Lỗi tại các trường và dữ liệu đang nhập.',
     'Bổ sung các trường được báo lỗi rồi thử lại. Sai thông tin xác thực, khóa tài khoản và hết phiên có thông báo riêng.'),
    ('04_register', 'Đăng ký tài khoản', '/register', 'Khách', 'UC01',
     'Tạo tài khoản chủ thú cưng hoặc chủ cơ sở.',
     'Loại tài khoản, họ tên, e-mail, điện thoại, mật khẩu và xác nhận mật khẩu.',
     'Chọn loại tài khoản, điền thông tin rồi gửi biểu mẫu. Sửa các trường được đánh dấu nếu dữ liệu không hợp lệ. Đăng ký thành công chuyển tới trang đăng nhập với thông báo xác nhận; e-mail trùng được báo để xử lý.'),
    ('05_home_owner', 'Trang chính của chủ thú cưng', '/', 'Chủ thú cưng', 'Điểm vào UC03, UC06, UC07, UC09',
     'Tập trung các thao tác thường dùng và lịch hẹn sắp tới.',
     'Lời chào, các lối tắt, lịch hẹn sắp tới và danh sách thú cưng của chủ sở hữu; bản hiện tại hiển thị tối đa ba lịch sắp tới.',
     'Chọn lối tắt để tìm cơ sở, thêm thú cưng hoặc mở lịch hẹn. Chọn một thú cưng trong danh sách để xem hồ sơ.'),
    ('06_pets', 'Danh sách thú cưng', '/pets', 'Chủ thú cưng', 'UC03',
     'Quản lý danh sách hồ sơ thú cưng đang hoạt động.',
     'Tên, loài, giống, giới tính, ngày sinh và các thao tác thêm, sửa, lưu trữ.',
     'Chọn tên để xem chi tiết, Thêm thú cưng để tạo hồ sơ, hoặc Lưu trữ rồi xác nhận. Hồ sơ lưu trữ không còn hiện trong biểu mẫu đặt lịch.'),
    ('07_pet_form', 'Tạo hồ sơ thú cưng', '/pets/new', 'Chủ thú cưng', 'UC03',
     'Ghi thông tin nhận diện và dị ứng của thú cưng trước khi đặt dịch vụ.',
     'Tên, loài, giống, giới tính, ngày sinh, mã microchip và dị ứng.',
     'Điền thông tin rồi lưu. Các trường thiếu, ngày không hợp lệ hoặc microchip trùng được báo để sửa.'),
    ('08_pet_detail', 'Chi tiết hồ sơ thú cưng', '/pets/:id', 'Chủ sở hữu hồ sơ', 'UC03',
     'Cho chủ sở hữu xem và cập nhật hồ sơ, bản ghi sức khỏe của thú cưng.',
     'Thông tin cơ bản, dị ứng, ảnh QR, lịch sử cân nặng và tiêm phòng. Biểu đồ xuất hiện khi có nhiều bản ghi cân nặng.',
     'Mở thú cưng từ Thú cưng của tôi. Chọn Sửa hồ sơ để thay đổi thông tin, hoặc dùng biểu mẫu cân nặng/tiêm phòng để thêm bản ghi. Thao tác lưu trữ nằm ở danh sách và cần xác nhận. Ảnh QR hiển thị được; chưa coi luồng nhân viên quét QR UC05 là đã hoàn thành.'),
    ('09_facility_search', 'Tìm cơ sở', '/facilities', 'Khách hoặc người đã đăng nhập', 'UC06',
     'Tìm địa điểm chăm sóc phù hợp trước khi đặt lịch.',
     'Bộ lọc khu vực, loại dịch vụ, giá tối đa; sắp xếp theo tên hoặc giá; thẻ cơ sở với địa chỉ, dịch vụ và giá từ.',
     'Chọn bộ lọc rồi bấm Tìm kiếm; chọn tên cơ sở để xem chi tiết. Nếu không có kết quả, bỏ bớt bộ lọc hoặc mở rộng khu vực.'),
    ('10_facility_search_filtered', 'Kết quả tìm cơ sở có lọc', '/facilities', 'Khách hoặc người đã đăng nhập', 'UC06',
     'Cho thấy kết quả ứng với lựa chọn khu vực.',
     'Khu vực Quận 1, số lượng kết quả và cơ sở phù hợp trong dữ liệu mẫu.',
     'Đổi tiêu chí và tìm lại, hoặc chọn cơ sở trong danh sách để xem dịch vụ và giờ trống.'),
    ('11_booking_summary', 'Chi tiết cơ sở và xác nhận đặt lịch', '/facilities/:id', 'Khách xem công khai; chủ thú cưng xác nhận', 'UC06, UC07, UC08',
     'Chọn dịch vụ, thú cưng, ngày, nhân viên và khung giờ; kiểm tra tóm tắt trước khi tạo lịch.',
     'Mô tả, địa chỉ, giờ mở cửa, điện thoại, bảng giá; giờ trống; tóm tắt cơ sở, dịch vụ, thú cưng, giờ, nhân viên và giá.',
     'Chọn dịch vụ, thú cưng, ngày và nhân viên nếu cần; chọn một giờ trống rồi Xác nhận đặt lịch. Đổi ngày/dịch vụ/nhân viên phải chọn giờ lại. Hủy ở bước tóm tắt chưa tạo booking. Nếu chỗ vừa bị lấy, chọn lại từ giờ cập nhật; hết chỗ có gợi ý ngày khác. Chưa có thú cưng thì tạo hồ sơ trước.'),
    ('12_booking_success', 'Đặt lịch thành công', '/facilities/:id', 'Chủ thú cưng', 'UC07',
     'Thông báo booking đã được tạo và dẫn tới danh sách lịch.',
     'Thông báo thành công với thú cưng, dịch vụ, giờ, ngày, nhân viên; liên kết Lịch hẹn của tôi.',
     'Chọn Xem lịch hẹn của tôi để kiểm tra trạng thái. Hệ thống kiểm tra lại chỗ trong giao dịch trước khi lưu và tạo thông báo trong ứng dụng cho hai bên.'),
    ('13_my_bookings', 'Lịch hẹn của tôi', '/bookings', 'Chủ thú cưng', 'UC09',
     'Theo dõi lịch sắp tới, lịch đã qua và hủy lịch đủ điều kiện.',
     'Thú cưng, dịch vụ, cơ sở, giờ, ngày, nhân viên, trạng thái và hành động hủy hoặc thông tin liên hệ.',
     'Xem nhóm lịch sắp tới/đã qua. Chọn hủy rồi xác nhận khi lịch còn ít nhất hai giờ và đang ở trạng thái xác nhận; nếu không đủ điều kiện, liên hệ cơ sở.'),
    ('14_notifications', 'Thông báo trong ứng dụng', '/notifications', 'Người đã đăng nhập', 'UC25 theo bản PA04',
     'Theo dõi thông báo tạo, hủy và đổi trạng thái lịch hẹn.',
     'Tiêu đề, nội dung, thời điểm và trạng thái chưa đọc; nút đánh dấu đã đọc.',
     'Chọn Đánh dấu đã đọc cho từng mục hoặc đánh dấu tất cả. Bản hiện tại không gửi email và chưa có đầy đủ nhắc lịch nền.'),
    ('15_facility_owner_bookings', 'Lịch hẹn của cơ sở', '/facility/bookings', 'Chủ cơ sở', 'UC11',
     'Xem lịch tại các cơ sở được quản lý và cập nhật tiến trình phục vụ.',
     'Bộ lọc ngày/trạng thái; dịch vụ, thú cưng, dị ứng, nhân viên; nút check-in, bắt đầu, hoàn thành, vắng mặt hoặc hủy theo trạng thái.',
     'Lọc lịch, chọn hành động hợp lệ. Khi cơ sở hủy phải nhập lý do. Chủ thú cưng nhận thông báo; bản hiện tại chỉ mở route này cho chủ cơ sở.'),
    ('m3_booking', 'Đặt lịch trên điện thoại 360 px', '/facilities/:id', 'Chủ thú cưng', 'UC07, UC08',
     'Thể hiện luồng chọn và xác nhận trên màn hình nhỏ.',
     'Cùng thông tin đặt lịch như desktop, bố trí theo chiều dọc.',
     'Cuộn tới các bước, chọn dịch vụ/ngày/giờ rồi kiểm tra tóm tắt. Ảnh chụp ở viewport 360 × 740 CSS px; bộ chụp kiểm tra không tràn ngang.'),
]

def build():
    capture_dir = Path(os.environ.get('SCREENSHOT_DIR', ROOT.parents[1] / 'e2e' / 'results' / 'screens'))
    (ROOT / 'screens').mkdir(exist_ok=True)
    for name, source in HANDOFF_IMAGES.items():
        shutil.copyfile(QUYNH_UI / source, ROOT / 'screens' / ('quynh-' + source))
    # Copy only the screenshots used by this document, keeping raw captures under e2e/results.
    for name, *_ in SCREENS:
        source = capture_dir / (name + '.png')
        target = ROOT / 'screens' / (name + '.png')
        if name not in HANDOFF_IMAGES and source.is_file() and source.resolve() != target.resolve():
            shutil.copyfile(source, target)
    needed = ['quynh-' + HANDOFF_IMAGES[name] if name in HANDOFF_IMAGES else name + '.png' for name, *_ in SCREENS]
    missing = [name for name in needed if not (ROOT / 'screens' / name).is_file()]
    if missing:
        raise SystemExit('Missing screenshots: ' + ', '.join(missing))
    nav, body = [], []
    for index, (name, title, route, role, uc, purpose, information, usage) in enumerate(SCREENS, 1):
        image_path = 'screens/' + ('quynh-' + HANDOFF_IMAGES[name] if name in HANDOFF_IMAGES else name + '.png')
        if name in HANDOFF_IMAGES:
            source_note = 'Ảnh và mô tả gốc: bàn giao Quỳnh, build 0.4.0, commit 5777ca3; mô tả chuyển sang tiếng Việt và bổ sung hành vi hiện tại.'
            source_link = '<p class="meta"><a href="../pa4/quynh/UI/Screen_Descriptions.md">Mô tả gốc của Quỳnh</a> · <a href="../pa4/quynh/Verification_Notes.md">Ghi chú kiểm chứng và phạm vi</a></p>'
        else:
            source_note = 'Ảnh chụp bổ sung từ bộ screens của Quân ngày 22/11/2026.'
            source_link = ''
        nav.append(f'<a href="#{name}">{index:02}. {escape(title)}</a>')
        body.append(f'''<section id="{name}"><h2>{index:02}. {escape(title)}</h2>
<p class="meta">{escape(uc)} · {escape(role)} · <code>{escape(route)}</code></p>
<p><strong>Mục đích.</strong> {escape(purpose)}</p>
<p><strong>Thông tin hiển thị.</strong> {escape(information)}</p>
<p><strong>Cách dùng.</strong> {escape(usage)}</p>
<figure><a href="{image_path}"><img {'class="mobile"' if name.startswith('m') else ''} src="{image_path}" alt="{escape(title)}" loading="lazy"></a>
<figcaption>Ảnh {index:02} · {escape(title)} · {escape(source_note)} Chọn ảnh để xem kích thước đầy đủ.</figcaption></figure>{source_link}</section>''')
    html = '''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UI Prototype Pet Care Platform PA04</title><style>
*{box-sizing:border-box}body{margin:0;color:#18232c;background:#f5f6f7;font:17px/1.65 system-ui,Segoe UI,sans-serif}main{max-width:1080px;margin:auto;padding:40px 28px}header,section,nav{background:white;padding:30px;margin-bottom:24px}h1,h2{color:#111;line-height:1.25}h1{font-size:34px}h2{font-size:25px}p{max-width:88ch}a{color:#14634e}nav{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}img{display:block;width:100%;height:auto;border:1px solid #d9d9d9}img.mobile{max-width:360px;margin:auto}figure{margin:24px 0 0}figcaption,.meta{color:#53616a;font-size:14px}code{overflow-wrap:anywhere}section{scroll-margin-top:18px}@media(max-width:600px){main{padding:16px}header,section,nav{padding:18px}nav{grid-template-columns:1fr}h1{font-size:28px}}@media print{body{background:white}main{padding:0;max-width:none}nav{display:none}header,section{padding:0;margin:0 0 24px}h2{break-after:avoid}figure{break-inside:avoid}a{color:inherit;text-decoration:none}img{max-height:230mm;object-fit:contain}section{break-before:page}header{break-after:page}}
</style></head><body><main><header><p>PA04 · Pet Care Platform · Phần tổng hợp UI của Quân</p><h1>Giao diện các luồng chính của Pet Care Platform</h1>
<p>Tài liệu mô tả màn hình chính và các luồng đăng nhập, quản lý hồ sơ, tìm cơ sở và đặt lịch. Ảnh được chụp từ bản chạy của repo ngày 22/11/2026 với dữ liệu giả lập; nội dung mô tả đi cùng từng màn hình để hướng dẫn thao tác.</p>
<p>Chủ thú cưng đăng nhập, tạo hồ sơ, tìm cơ sở, xem giờ trống và xác nhận lịch. Chủ cơ sở theo dõi lịch và cập nhật trạng thái. Khách có thể tìm cơ sở trước khi đăng nhập.</p>
<p>Phạm vi ảnh gồm desktop 1280 × 800 và đặt lịch ở chiều rộng 360 CSS px. Bản hiện tại dùng thông báo trong ứng dụng; đặt lưu trú, email và AI thuộc phạm vi phát triển sau.</p></header><nav aria-label="Mục lục">'''
    html = html.replace('</header><nav', '<p>Bốn màn hình đăng nhập, đăng ký, trang chủ chủ thú cưng và chi tiết hồ sơ dùng ảnh cùng mô tả từ bàn giao Quỳnh. Các màn hình còn lại do Quân chụp và bổ sung; nguồn được ghi dưới từng ảnh.</p></header><nav')
    html += ''.join(nav) + '</nav>' + ''.join(body) + '</main></body></html>'
    (ROOT / 'UI_Prototype.html').write_text(html, encoding='utf-8')
    print(f'Built UI_Prototype.html: {len(SCREENS)} screens')

if __name__ == '__main__':
    build()
