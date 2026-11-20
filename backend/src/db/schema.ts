/**
 * Database schema of the Sprint 4 build (SQLite).
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
`;
