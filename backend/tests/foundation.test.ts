import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app';
import { AppError } from '../src/common/errors';
import { OutboxMailer } from '../src/common/mailer';
import { openDatabase, type Db } from '../src/db/database';
import { DEMO_PASSWORD, seedDemoData } from '../src/db/seed';
import { IdentityAccessService } from '../src/modules/identity/identity.service';
import { LoginAttemptPolicy } from '../src/modules/identity/loginAttemptPolicy';
import { PasswordHasher } from '../src/modules/identity/passwordHasher';
import { SessionRepository } from '../src/modules/identity/session.repository';
import { UserRepository } from '../src/modules/identity/user.repository';
import { NotificationRepository, NotificationService } from '../src/modules/notification/notification.service';

/** Foundation of Sprint 5: roles, accounts, shared services and the guards of the routes of the new use cases. */
const nowMs = new Date('2026-11-30T06:00:00+07:00').getTime();
const clock = { now: () => new Date(nowMs) };

let db: Db;
let baseUrl = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

class Client {
  cookie = '';
  async call(method: string, path: string, body?: unknown) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set && set.includes('sid=')) this.cookie = set.split(';')[0]!;
    return { status: res.status, body: (await res.json()) as any };
  }
  login(email: string) {
    return this.call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD });
  }
}

before(async () => {
  db = openDatabase(':memory:');
  seedDemoData(db, new Date(nowMs));
  const app = createApp(db, clock);
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

describe('Accounts of the roles STAFF and SYSTEM_ADMINISTRATOR', () => {
  test('the demo administrator and the staff accounts can log in with their role', async () => {
    for (const [email, role] of [
      ['admin@example.com', 'SYSTEM_ADMINISTRATOR'],
      ['hang.staff@example.com', 'STAFF'],
      ['hung.vet@example.com', 'STAFF'],
      ['linh.staff@example.com', 'STAFF'],
    ] as const) {
      const r = await new Client().login(email);
      assert.equal(r.status, 200, email);
      assert.equal(r.body.data.role, role);
    }
  });
  test('every staff account is linked to a staff member of a facility', () => {
    const rows = db.prepare(`SELECT COUNT(*) AS c FROM staff_members s JOIN users u ON u.id = s.user_id WHERE u.role = 'STAFF'`).get() as { c: number };
    assert.equal(rows.c, 3);
  });
  test('the pending facility has an application record (UC21)', () => {
    const r = db.prepare(`SELECT f.status AS status FROM facility_applications a JOIN facilities f ON f.id = a.facility_id`).get() as { status: string };
    assert.equal(r.status, 'PENDING_APPROVAL');
  });
});

describe('Guards of the routes of the new use cases (the stubs answer 501 until the use case is built)', () => {
  const routes: [string, string, string][] = [
    ['GET', '/api/facility-owner/applications', 'lan.fo@example.com'], // UC12
    ['GET', '/api/facility-owner/services', 'lan.fo@example.com'], // UC13
    ['GET', '/api/admin/facilities', 'admin@example.com'], // UC21
    ['GET', '/api/staff/bookings', 'hang.staff@example.com'], // UC16
    ['GET', '/api/reminders', 'an.owner@example.com'], // UC17
  ];
  test('a visitor gets 401 on the protected routes', async () => {
    for (const [method, path] of routes) {
      const r = await new Client().call(method, path);
      assert.equal(r.status, 401, path);
    }
  });
  test('the right role reaches the route (not 401, not 403)', async () => {
    for (const [method, path, email] of routes) {
      const c = new Client();
      await c.login(email);
      const r = await c.call(method, path);
      assert.ok(r.status !== 401 && r.status !== 403, `${path} -> ${r.status}`);
    }
  });
  test('another role gets 403', async () => {
    const owner = new Client();
    await owner.login('an.owner@example.com');
    for (const path of ['/api/admin/facilities', '/api/staff/bookings', '/api/facility-owner/services']) {
      assert.equal((await owner.call('GET', path)).status, 403, path);
    }
    const admin = new Client();
    await admin.login('admin@example.com');
    assert.equal((await admin.call('GET', '/api/reminders')).status, 403);
  });
  test('the review route is mounted without auth: the router of UC20 applies deps.auth to the routes that need a login', async () => {
    const r = await new Client().call('GET', '/api/reviews');
    assert.ok(r.status === 501 || r.status === 200 || r.status === 401, String(r.status));
  });
  test('the password reset route is public (UC24)', async () => {
    const r = await new Client().call('POST', '/api/auth/password-reset/request', { email: 'an.owner@example.com' });
    assert.notEqual(r.status, 401);
    assert.notEqual(r.status, 403);
  });
});

const newIdentity = () => new IdentityAccessService(new UserRepository(db), new SessionRepository(db), new PasswordHasher(), new LoginAttemptPolicy(), clock);

describe('Shared services for the use cases of Sprint 5', () => {
  test('createStaffAccount creates an account with the role STAFF and rejects a used e-mail (UC14)', () => {
    const identity = newIdentity();
    const user = identity.createStaffAccount({ fullName: 'Nhân viên mới', email: 'new.staff@example.com', phone: '0905000009', password: 'Matkhau123' });
    assert.equal(user.role, 'STAFF');
    assert.throws(() => identity.createStaffAccount({ fullName: 'Trùng', email: 'new.staff@example.com', phone: '0905000010', password: 'Matkhau123' }), /đã được đăng ký/);
  });
  test('listActiveAdminIds returns only the administrators with an active account (UC12)', () => {
    const identity = newIdentity();
    const idOf = (email: string) => (db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string }).id;
    assert.deepEqual(identity.listActiveAdminIds(), [idOf('admin@example.com')]);

    db.prepare(
      `INSERT INTO users (id, full_name, email, phone, password_hash, role, status, failed_login_count, locked_until, created_at)
       VALUES ('admin-suspended', 'Quản trị bị khóa', 'admin.suspended@example.com', '0906000001', 'x', 'SYSTEM_ADMINISTRATOR', 'SUSPENDED', 0, NULL, ?)`,
    ).run(clock.now().toISOString());
    assert.deepEqual(identity.listActiveAdminIds(), [idOf('admin@example.com')]);
  });
  test('getPublicUserById returns only public data and fails with NOT_FOUND for an unknown id (UC21)', () => {
    const identity = newIdentity();
    const owner = db.prepare(`SELECT id FROM users WHERE email = 'lan.fo@example.com'`).get() as { id: string };
    const user = identity.getPublicUserById(owner.id);
    assert.deepEqual(Object.keys(user).sort(), ['email', 'fullName', 'id', 'phone', 'role']);
    assert.equal(user.email, 'lan.fo@example.com');
    assert.equal(user.role, 'FACILITY_OWNER');
    assert.equal(identity.getPublicUserById('admin-suspended').email, 'admin.suspended@example.com');
    assert.throws(
      () => identity.getPublicUserById('does-not-exist'),
      (e: unknown) => e instanceof AppError && e.status === 404 && e.code === 'NOT_FOUND',
    );
  });
  test('NotificationService.notify writes a generic in-app notice', () => {
    const service = new NotificationService(new NotificationRepository(db), clock);
    const owner = db.prepare(`SELECT id FROM users WHERE email = 'lan.fo@example.com'`).get() as { id: string };
    const before = service.countUnread(owner.id);
    service.notify(owner.id, 'FACILITY_DECISION', 'Cơ sở đã được duyệt', 'Pet Mới Mở đã được duyệt.', { type: 'FACILITY', id: 'f1' });
    assert.equal(service.countUnread(owner.id), before + 1);
  });
  test('the outbox mailer keeps the newest mail first and the development route shows it', async () => {
    const mailer = new OutboxMailer(db, clock);
    mailer.send('a@example.com', 'Đặt lại mật khẩu', 'Liên kết: http://localhost:3000/reset-password?token=abc');
    mailer.send('b@example.com', 'Nhắc lịch', 'Milo đến hạn tiêm phòng.');
    const list = mailer.list();
    assert.equal(list[0]?.to, 'b@example.com');
    const r = await new Client().call('GET', '/api/dev/outbox');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.data));
  });
});
