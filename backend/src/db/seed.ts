import crypto from 'node:crypto';
import { addDays, fromLocal, localDate } from '../common/time';
import { config } from '../config';
import { PasswordHasher } from '../modules/identity/passwordHasher';
import { openDatabase, type Db } from './database';
import { seedSprint5 } from './seed-uc';

/** Password of all demo accounts. All data below are fictitious (NFR-10). */
export const DEMO_PASSWORD = 'Password123';

export const DEMO_ACCOUNTS = [
  { email: 'an.owner@example.com', role: 'PET_OWNER', name: 'Nguyễn Văn An', note: 'chủ thú cưng, đã có 2 thú cưng' },
  { email: 'binh.owner@example.com', role: 'PET_OWNER', name: 'Trần Thị Bình', note: 'chủ thú cưng, chưa có thú cưng' },
  { email: 'lan.fo@example.com', role: 'FACILITY_OWNER', name: 'Lê Thị Lan', note: 'chủ cơ sở Happy Paws Pet Spa và Bubble Pet Grooming' },
  { email: 'hung.fo@example.com', role: 'FACILITY_OWNER', name: 'Trần Văn Hùng', note: 'chủ cơ sở Pet Care 24 và Pet Hotel Sài Gòn' },
  // Sprint 5: administrator and staff accounts (staff accounts are linked to the staff members of the facilities)
  { email: 'admin@example.com', role: 'SYSTEM_ADMINISTRATOR', name: 'Quản trị viên', note: 'quản trị viên hệ thống (duyệt cơ sở)' },
  { email: 'hang.staff@example.com', role: 'STAFF', name: 'Phạm Thanh Hằng', note: 'nhân viên Happy Paws Pet Spa' },
  { email: 'hung.vet@example.com', role: 'STAFF', name: 'BS. Trần Văn Hùng', note: 'bác sĩ thú y Pet Care 24' },
  { email: 'linh.staff@example.com', role: 'STAFF', name: 'Đỗ Khánh Linh', note: 'nhân viên Bubble Pet Grooming' },
];

const id = () => crypto.randomUUID();

/** Fills an empty database with demo accounts, pets, facilities, services, staff and shifts. */
export function seedDemoData(db: Db, now = new Date()): void {
  const hasher = new PasswordHasher();
  const hash = hasher.hash(DEMO_PASSWORD);
  const createdAt = now.toISOString();
  const insertUser = db.prepare(
    `INSERT INTO users (id, full_name, email, phone, password_hash, role, status, failed_login_count, locked_until, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0, NULL, ?)`,
  );
  const users: Record<string, string> = {};
  const phones = ['0901000001', '0901000002', '0902000003', '0902000004', '0903000005', '0904000006', '0904000007', '0904000008'];
  DEMO_ACCOUNTS.forEach((a, i) => {
    users[a.email] = id();
    insertUser.run(users[a.email], a.name, a.email, phones[i], hash, a.role, createdAt);
  });

  const insertPet = db.prepare(
    `INSERT INTO pets (id, owner_id, name, species, breed, sex, birth_date, microchip_number, allergies, qr_code, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
  );
  const milo = id();
  const muop = id();
  insertPet.run(milo, users['an.owner@example.com'], 'Milo', 'Chó', 'Poodle', 'Đực', '2022-03-12', '900000000000001', '["Thịt gà"]', crypto.randomBytes(9).toString('base64url'), createdAt);
  insertPet.run(muop, users['an.owner@example.com'], 'Mướp', 'Mèo', 'Mèo ta', 'Cái', '2023-07-01', null, '[]', crypto.randomBytes(9).toString('base64url'), createdAt);
  db.prepare('INSERT INTO weight_records (id, pet_id, weight_kg, recorded_at) VALUES (?, ?, ?, ?)').run(id(), milo, 5.8, '2026-08-15');
  db.prepare('INSERT INTO weight_records (id, pet_id, weight_kg, recorded_at) VALUES (?, ?, ?, ?)').run(id(), milo, 6.2, '2026-10-20');
  db.prepare('INSERT INTO weight_records (id, pet_id, weight_kg, recorded_at) VALUES (?, ?, ?, ?)').run(id(), muop, 3.4, '2026-09-10');
  db.prepare('INSERT INTO vaccination_records (id, pet_id, vaccine_name, injection_date, revaccination_date, source) VALUES (?, ?, ?, ?, ?, ?)').run(
    id(), milo, 'Vắc-xin dại', '2026-03-10', '2027-03-10', 'MANUAL',
  );

  const insertFacility = db.prepare(
    `INSERT INTO facilities (id, owner_id, name, address, area, phone, description, opening_hours, status, owner_suspended)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  );
  const insertService = db.prepare(
    `INSERT INTO services (id, facility_id, name, type, duration_minutes, price, capacity, description, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  const insertStaff = db.prepare('INSERT INTO staff_members (id, facility_id, user_id, name, position) VALUES (?, ?, NULL, ?, ?)');
  const link = db.prepare('INSERT INTO staff_services (staff_id, service_id) VALUES (?, ?)');
  const insertShift = db.prepare('INSERT INTO shifts (id, staff_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?, ?)');

  const facility = (owner: string, name: string, address: string, area: string, phone: string, description: string, hours: string, status = 'APPROVED') => {
    const f = id();
    insertFacility.run(f, users[owner], name, address, area, phone, description, hours, status);
    return f;
  };
  const service = (f: string, name: string, type: string, minutes: number | null, price: number, capacity: number | null, description: string) => {
    const s = id();
    insertService.run(s, f, name, type, minutes, price, capacity, description);
    return s;
  };
  const staff = (f: string, name: string, position: string, services: string[], shifts: [number[], string, string][]) => {
    const st = id();
    insertStaff.run(st, f, name, position);
    services.forEach((s) => link.run(st, s));
    shifts.forEach(([days, from, to]) => days.forEach((d) => insertShift.run(id(), st, d, from, to)));
    return st;
  };
  const monSat = [1, 2, 3, 4, 5, 6];

  // 1. Grooming spa
  const spa = facility('lan.fo@example.com', 'Happy Paws Pet Spa', '25 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'Quận 1', '0281234567', 'Spa và tắm cắt tỉa lông cho chó mèo, nhân viên có chứng chỉ.', '08:00 – 17:00, thứ Hai đến thứ Bảy');
  const spa1 = service(spa, 'Tắm và cắt tỉa lông', 'GROOMING', 90, 250000, null, 'Tắm, sấy, cắt tỉa tạo kiểu.');
  const spa2 = service(spa, 'Tắm vệ sinh', 'GROOMING', 60, 150000, null, 'Tắm, sấy khô, vệ sinh tai.');
  const spa3 = service(spa, 'Cắt móng và vệ sinh tai', 'GROOMING', 30, 80000, null, 'Dịch vụ nhanh.');
  const hang = staff(spa, 'Phạm Thanh Hằng', 'GROOMER', [spa1, spa2, spa3], [[monSat, '08:00', '12:00'], [monSat, '13:00', '17:00']]);
  const bao = staff(spa, 'Võ Quốc Bảo', 'GROOMER', [spa1, spa2, spa3], [[monSat, '08:00', '12:00'], [monSat, '13:00', '17:00']]);

  // 2. Veterinary clinic
  const clinic = facility('hung.fo@example.com', 'Phòng khám thú y Pet Care 24', '112 Nam Kỳ Khởi Nghĩa, Phường 7, Quận 3, TP. Hồ Chí Minh', 'Quận 3', '0289876543', 'Khám, tiêm phòng và điều trị cho thú cưng.', '08:00 – 17:00, thứ Hai đến thứ Bảy');
  const vet1 = service(clinic, 'Khám tổng quát', 'VETERINARY', 30, 150000, null, 'Khám sức khỏe định kỳ.');
  const vet2 = service(clinic, 'Tiêm phòng', 'VETERINARY', 30, 200000, null, 'Tiêm vắc-xin theo lịch.');
  const vet3 = service(clinic, 'Siêu âm', 'VETERINARY', 45, 300000, null, 'Siêu âm bụng.');
  const hungVet = staff(clinic, 'BS. Trần Văn Hùng', 'VETERINARIAN', [vet1, vet2, vet3], [[monSat, '08:00', '17:00']]);
  staff(clinic, 'BS. Ngô Thị Mai', 'VETERINARIAN', [vet1, vet2], [[[2, 4, 6], '13:00', '19:00']]);

  // 3. Small grooming shop (few slots)
  const bubble = facility('lan.fo@example.com', 'Bubble Pet Grooming', '8 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh', 'Thủ Đức', '0283344556', 'Tiệm grooming nhỏ, nhận số lượng ít mỗi ngày.', '09:00 – 18:00, thứ Ba đến Chủ nhật');
  const b1 = service(bubble, 'Tắm sấy', 'GROOMING', 60, 120000, null, 'Tắm và sấy khô.');
  const b2 = service(bubble, 'Cắt tỉa tạo kiểu', 'GROOMING', 120, 350000, null, 'Tạo kiểu theo yêu cầu.');
  const linh = staff(bubble, 'Đỗ Khánh Linh', 'GROOMER', [b1, b2], [[[2, 3, 4, 5, 6, 0], '09:00', '18:00']]);

  // 4. Pet hotel (boarding is planned for Sprint 5)
  const hotel = facility('hung.fo@example.com', 'Pet Hotel Sài Gòn', '55 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh', 'Bình Thạnh', '0287766554', 'Khách sạn lưu trú cho chó mèo, có camera theo dõi.', 'Mở cửa hằng ngày');
  service(hotel, 'Lưu trú chó nhỏ (mỗi đêm)', 'BOARDING', null, 200000, 10, 'Phòng riêng, có điều hòa.');

  // 5. A facility that is not approved yet: it must not appear in the search (UC06 precondition)
  const pending = facility('lan.fo@example.com', 'Pet Mới Mở (chờ duyệt)', '1 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', 'Quận 1', '0280000000', 'Cơ sở đang chờ quản trị viên duyệt.', '08:00 – 17:00', 'PENDING_APPROVAL');
  db.prepare('INSERT INTO facility_applications (facility_id, supporting_document_ref, submitted_at) VALUES (?, ?, ?)').run(pending, 'giay-phep-kinh-doanh.pdf', createdAt);

  // Staff accounts (Sprint 5): the staff member and the account of the same person are linked by staff_members.user_id
  const linkStaff = db.prepare('UPDATE staff_members SET user_id = ? WHERE id = ?');
  linkStaff.run(users['hang.staff@example.com'], hang);
  linkStaff.run(users['hung.vet@example.com'], hungVet);
  linkStaff.run(users['linh.staff@example.com'], linh);

  // Sample bookings (UC09 / UC11) placed outside test slots so automated tests remain deterministic
  const insertBooking = db.prepare(
    `INSERT INTO bookings (id, owner_id, pet_id, facility_id, service_id, staff_id, start_at, end_at, status, price, created_at, cancellation_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const booking = (petId: string, fId: string, sId: string, stId: string, date: string, start: string, duration: number, status: string, price: number, reason: string | null = null) => {
    const bid = id();
    const startAt = fromLocal(date, start);
    const endAt = new Date(startAt.getTime() + duration * 60_000);
    insertBooking.run(bid, users['an.owner@example.com'], petId, fId, sId, stId, startAt.toISOString(), endAt.toISOString(), status, price, createdAt, reason);
    return bid;
  };
  const todayStr = localDate(now);
  const tomorrowStr = addDays(todayStr, 1);
  const yesterdayStr = addDays(todayStr, -1);
  const threeDaysAgoStr = addDays(todayStr, -3);

  const bToday1 = booking(milo, bubble, b1, linh, todayStr, '13:00', 60, 'CONFIRMED', 120000);
  booking(muop, bubble, b2, linh, todayStr, '15:00', 120, 'CHECKED_IN', 350000);
  const bSpaToday = booking(milo, spa, spa2, hang, todayStr, '16:00', 60, 'CONFIRMED', 150000);
  booking(milo, clinic, vet1, hungVet, tomorrowStr, '16:00', 30, 'CONFIRMED', 150000);
  booking(muop, clinic, vet2, hungVet, tomorrowStr, '16:30', 30, 'CONFIRMED', 200000);
  const bSpaCompleted = booking(milo, spa, spa1, bao, threeDaysAgoStr, '10:00', 90, 'COMPLETED', 250000);
  booking(muop, clinic, vet1, hungVet, threeDaysAgoStr, '09:00', 30, 'NO_SHOW', 150000);
  booking(muop, spa, spa3, hang, yesterdayStr, '14:00', 30, 'CANCELLED', 80000, 'Chủ thú cưng đổi lịch sang tuần sau');

  const insertNotice = db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, reference_type, reference_id, is_read, created_at)
     VALUES (?, ?, 'BOOKING', ?, ?, 'BOOKING', ?, ?, ?)`,
  );
  insertNotice.run(id(), users['an.owner@example.com'], 'Đặt lịch thành công', `Milo – Tắm sấy tại Bubble Pet Grooming, lúc 13:00 ngày ${todayStr.split('-').reverse().join('/')}.`, bToday1, 0, createdAt);
  insertNotice.run(id(), users['lan.fo@example.com'], 'Có lịch hẹn mới', `Milo – Tắm sấy, lúc 13:00 ngày ${todayStr.split('-').reverse().join('/')}.`, bToday1, 0, createdAt);
  insertNotice.run(id(), users['hung.fo@example.com'], 'Có lịch hẹn mới', `Milo – Khám tổng quát, lúc 16:00 ngày ${tomorrowStr.split('-').reverse().join('/')}.`, null, 0, createdAt);

  // Sprint 5: every use case adds its own demo data in its own file (src/db/seed-uc/), so that nobody edits this file at the same time.
  seedSprint5(db, {
    now,
    createdAt,
    users,
    ids: { milo, muop, spa, clinic, bubble, hotel, pending, spa1, spa2, spa3, vet1, vet2, vet3, b1, b2, hang, bao, hungVet, linh, bToday1, bSpaToday, bSpaCompleted },
  });
}

/** Command "npm run seed": recreates the demo data in the configured database file. */
if (require.main === module) {
  const db = openDatabase(config.dbFile);
  const count = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
  if (count > 0) {
    console.log('Database already contains data; delete the file', config.dbFile, 'to create the demo data again.');
  } else {
    seedDemoData(db);
    console.log('Demo data created in', config.dbFile);
  }
}
