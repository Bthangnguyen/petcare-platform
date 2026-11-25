/**
 * Database schema of the Sprint 4 / Sprint 5 build (SQLite).
 * Every table belongs to exactly one module (see SAD, section 4.9 "Data"). Times are ISO instants in UTC,
 * dates are local dates (UTC+7) in the form YYYY-MM-DD.
 */
export const SCHEMA = `
-- Identity & Access
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PET_OWNER','STAFF','FACILITY_OWNER','SYSTEM_ADMINISTRATOR')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  ended_at TEXT
);

-- Pet Profile & Health Record
CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL DEFAULT '',
  birth_date TEXT,
  microchip_number TEXT UNIQUE,
  allergies TEXT NOT NULL DEFAULT '[]',
  qr_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS weight_records (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL REFERENCES pets(id),
  weight_kg REAL NOT NULL CHECK (weight_kg > 0),
  recorded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vaccination_records (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL REFERENCES pets(id),
  vaccine_name TEXT NOT NULL,
  injection_date TEXT NOT NULL,
  revaccination_date TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL'
);

-- Facility & Catalog
CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  area TEXT NOT NULL,
  phone TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  opening_hours TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_APPROVAL','NEEDS_INFORMATION','APPROVED','REJECTED')),
  owner_suspended INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facilities(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('GROOMING','VETERINARY','BOARDING')),
  duration_minutes INTEGER,
  price INTEGER NOT NULL CHECK (price >= 0),
  capacity INTEGER,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS staff_members (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facilities(id),
  user_id TEXT,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('GROOMER','VETERINARIAN'))
);
CREATE TABLE IF NOT EXISTS staff_services (
  staff_id TEXT NOT NULL REFERENCES staff_members(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  PRIMARY KEY (staff_id, service_id)
);
-- Recurring weekly shifts (Shift.repeatWeekly = true); weekday 0 = Sunday ... 6 = Saturday, local time UTC+7
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff_members(id),
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- Booking & Availability
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','NO_SHOW','CANCELLED')),
  price INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  cancellation_reason TEXT
);
-- A staff member can never be booked twice for the same start time (NFR-11); overlaps are checked in the transaction.
CREATE UNIQUE INDEX IF NOT EXISTS ux_booking_staff_start ON bookings(staff_id, start_at)
  WHERE status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS');
CREATE INDEX IF NOT EXISTS ix_booking_owner ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS ix_booking_facility ON bookings(facility_id, start_at);

-- Reminder & Notification (in-app notices only in this build)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_notification_user ON notifications(user_id, created_at);

-- ===== Sprint 5 (PA5): tables for the new use cases. The tables above are not changed, so an old database file keeps working. =====

-- Facility & Catalog: data of the application of a facility (UC12) and the decision of the administrator (UC21).
CREATE TABLE IF NOT EXISTS facility_applications (
  facility_id TEXT PRIMARY KEY REFERENCES facilities(id),
  supporting_document_ref TEXT,
  submitted_at TEXT,
  decision_note TEXT,
  decided_by TEXT,
  decided_at TEXT
);

-- Review & Administration: audit trail of the decisions of the administrator (UC21).
CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);

-- Review & Administration: one review per completed booking (UC20).
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  author_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED','HIDDEN')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_review_facility ON reviews(facility_id, created_at);

-- Pet Profile & Health Record: result of a service written by the staff member (UC16); shown to the owner (UC04).
CREATE TABLE IF NOT EXISTS health_records (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL REFERENCES pets(id),
  booking_id TEXT NOT NULL UNIQUE,
  facility_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_date TEXT NOT NULL,
  findings TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  recommendations TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_health_pet ON health_records(pet_id, service_date);

-- Reminder & Notification: care reminders of a pet (UC17).
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL REFERENCES pets(id),
  owner_id TEXT NOT NULL,
  care_type TEXT NOT NULL CHECK (care_type IN ('VACCINATION','DEWORMING','CHECKUP','GROOMING')),
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','NOTIFIED','OVERDUE','COMPLETED','DISMISSED')),
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL','SERVICE_RESULT','AI_EXTRACTION')),
  created_at TEXT NOT NULL,
  notified_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_reminder_owner ON reminders(owner_id, due_date);

-- Identity & Access: single-use token of the password reset (UC24); only the hash of the token is stored.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

-- Development e-mail outbox: no real e-mail provider is used in the course build (UC24, UC17); the mails can be read at /api/dev/outbox.
CREATE TABLE IF NOT EXISTS mail_outbox (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
