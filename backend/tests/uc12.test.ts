import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, test, mock } from 'node:test';
import { createApp } from '../src/app';
import { openDatabase, type Db } from '../src/db/database';
import { DEMO_PASSWORD, seedDemoData } from '../src/db/seed';

const endpoint = '/api/facility-owner/applications';
const valid = { name: 'Cơ sở thử nghiệm', address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', area: 'Quận 1',
  phone: '0901234567', openingHours: '08:00–17:00, thứ Hai đến thứ Bảy', description: 'Chăm sóc thú cưng.', supportingDocumentRef: 'giay-phep.pdf' };
let db: Db;
let base: string;
let now: number;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

class Client {
  cookie = '';
  async call(method: string, path: string, body?: unknown) {
    const response = await fetch(base + path, { method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const cookie = response.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0]!;
    return { status: response.status, body: await response.json() as any };
  }
  async login(email = 'lan.fo@example.com') {
    assert.equal((await this.call('POST', '/api/auth/login', { email, password: DEMO_PASSWORD })).status, 200);
    return this;
  }
}

beforeEach(async () => {
  now = Date.parse('2026-11-27T08:00:00+07:00');
  db = openDatabase(':memory:');
  seedDemoData(db, new Date(now));
  server = createApp(db, { now: () => new Date(now) }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  db.close();
  mock.restoreAll();
});

const count = (table: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
const notices = (id: string) => db.prepare('SELECT * FROM notifications WHERE reference_id=? AND type=?').all(id, 'FACILITY_APPLICATION') as any[];
function addAdmin(id: string, status: 'ACTIVE' | 'SUSPENDED') {
  db.prepare(`INSERT INTO users (id, full_name, email, phone, password_hash, role, status, created_at)
    SELECT ?, 'Quản trị bổ sung', ?, phone, password_hash, 'SYSTEM_ADMINISTRATOR', ?, ? FROM users WHERE email='admin@example.com'`)
    .run(id, `${id}@example.com`, status, new Date(now + 1).toISOString());
}

test('UC12 submits an application and notifies every active admin, never a suspended admin', async () => {
  addAdmin('second-admin', 'ACTIVE');
  addAdmin('suspended-admin', 'SUSPENDED');
  const owner = await new Client().login();
  const result = await owner.call('POST', endpoint, { ...valid, name: `  ${valid.name}  `, status: 'APPROVED', ownerId: 'other-owner' });
  assert.equal(result.status, 201);
  const item = result.body.data;
  assert.equal(item.name, valid.name);
  assert.equal(item.status, 'PENDING_APPROVAL');
  assert.equal(item.submittedAt, new Date(now).toISOString());
  assert.equal(item.supportingDocumentRef, valid.supportingDocumentRef);
  assert.equal(item.decisionNote, null);
  const activeAdmin = db.prepare("SELECT id FROM users WHERE email='admin@example.com'").get() as { id: string };
  assert.deepEqual(notices(item.id).map(n => n.user_id).sort(), [activeAdmin.id, 'second-admin'].sort());
  for (const notice of notices(item.id)) {
    assert.equal(notice.reference_type, 'FACILITY');
    assert.match(notice.message, /Cơ sở thử nghiệm/);
  }
  const admin = await new Client().login('admin@example.com');
  const inbox = await admin.call('GET', '/api/notifications');
  assert.ok(inbox.body.data.items.some((n: any) => n.referenceId === item.id));
  assert.equal((await owner.call('GET', `${endpoint}/${item.id}`)).body.data.status, 'PENDING_APPROVAL');
});

test('UC12 saves incomplete drafts without notices, edits and submits the same application', async () => {
  const owner = await new Client().login();
  const draft = await owner.call('POST', endpoint, { name: 'Hồ sơ chưa đầy đủ', saveDraft: true });
  assert.equal(draft.status, 201);
  const id = draft.body.data.id;
  assert.equal(draft.body.data.status, 'DRAFT');
  assert.equal(draft.body.data.submittedAt, null);
  assert.equal(notices(id).length, 0);
  assert.equal((await owner.call('PUT', `${endpoint}/${id}`, { name: 'Bản nháp mới', saveDraft: true })).status, 200);
  const before = count('facilities');
  const invalid = await owner.call('PUT', `${endpoint}/${id}`, { name: 'Bản nháp mới' });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.body.error.fields.address);
  assert.equal((await owner.call('GET', `${endpoint}/${id}`)).body.data.status, 'DRAFT');
  now += 60_000;
  const submitted = await owner.call('PUT', `${endpoint}/${id}`, valid);
  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.data.id, id);
  assert.equal(submitted.body.data.status, 'PENDING_APPROVAL');
  assert.equal(submitted.body.data.submittedAt, new Date(now).toISOString());
  assert.equal(count('facilities'), before);
  assert.equal(notices(id).length, 1);
});

test('UC12 rejects missing required fields and invalid phone or lengths without saving data', async () => {
  const owner = await new Client().login();
  const previous = count('facilities');
  const empty = await owner.call('POST', endpoint, {});
  assert.equal(empty.status, 400);
  for (const field of ['name', 'address', 'area', 'phone', 'openingHours']) assert.ok(empty.body.error.fields[field], field);
  for (const [field, value] of [['name', 'x'.repeat(101)], ['address', 'x'.repeat(251)], ['area', 'x'.repeat(101)],
    ['phone', 'abc'], ['description', 'x'.repeat(2001)], ['openingHours', 'x'.repeat(201)], ['supportingDocumentRef', 'x'.repeat(256)]]) {
    const response = await owner.call('POST', endpoint, { ...valid, [field!]: value });
    assert.equal(response.status, 400, field);
    assert.ok(response.body.error.fields[field!], field);
  }
  assert.equal((await owner.call('POST', endpoint, { name: 'Draft', phone: 'abc', saveDraft: true })).status, 400);
  assert.equal((await owner.call('POST', endpoint, { ...valid, saveDraft: 'false' })).status, 400);
  assert.equal(count('facilities'), previous);
});

test('UC12 protects every endpoint against visitors and users of other roles', async () => {
  for (const email of [undefined, 'an.owner@example.com', 'hang.staff@example.com', 'admin@example.com']) {
    const client = new Client();
    if (email) await client.login(email);
    for (const [method, route, body] of [['GET', endpoint, undefined], ['GET', `${endpoint}/unknown`, undefined],
      ['POST', endpoint, valid], ['PUT', `${endpoint}/unknown`, valid]] as const) {
      assert.equal((await client.call(method, route, body)).status, email ? 403 : 401, `${email} ${method} ${route}`);
    }
  }
});

test('UC12 lists only owned facilities, including legacy facilities with no application row', async () => {
  const owner = await new Client().login();
  const other = await new Client().login('hung.fo@example.com');
  const ownList = (await owner.call('GET', endpoint)).body.data;
  assert.ok(ownList.some((item: any) => item.name === 'Happy Paws Pet Spa' && item.status === 'APPROVED' && item.submittedAt === null));
  assert.ok(ownList.some((item: any) => item.status === 'NEEDS_INFORMATION' && item.decisionNote));
  const others = (await other.call('GET', endpoint)).body.data;
  assert.ok(others.every((item: any) => !ownList.some((own: any) => own.id === item.id)));
  const created = (await owner.call('POST', endpoint, { saveDraft: true })).body.data;
  assert.equal((await other.call('GET', `${endpoint}/${created.id}`)).status, 404);
  assert.equal((await other.call('PUT', `${endpoint}/${created.id}`, valid)).status, 404);
  assert.equal((await owner.call('GET', `${endpoint}/unknown`)).status, 404);
  assert.equal((await owner.call('PUT', `${endpoint}/unknown`, valid)).status, 404);
  assert.equal((await owner.call('GET', `${endpoint}/${created.id}`)).body.data.status, 'DRAFT');
});

test('UC12 resubmits rejected or needs-information applications and clears the previous decision', async () => {
  for (const email of ['lan.fo@example.com', 'hung.fo@example.com']) {
    const owner = await new Client().login(email);
    const items = (await owner.call('GET', endpoint)).body.data;
    const item = items.find((entry: any) => ['REJECTED', 'NEEDS_INFORMATION'].includes(entry.status));
    assert.ok(item?.decisionNote);
    const draft = await owner.call('PUT', `${endpoint}/${item.id}`, { ...valid, saveDraft: true });
    assert.equal(draft.body.data.status, 'DRAFT');
    assert.equal(draft.body.data.decisionNote, item.decisionNote);
    assert.equal(notices(item.id).length, 0);
    now += 60_000;
    const submitted = await owner.call('PUT', `${endpoint}/${item.id}`, valid);
    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.data.status, 'PENDING_APPROVAL');
    assert.equal(submitted.body.data.decisionNote, null);
    assert.equal(submitted.body.data.decidedAt, null);
    assert.equal(submitted.body.data.submittedAt, new Date(now).toISOString());
    assert.equal(notices(item.id).length, 1);
  }
});

test('UC12 never edits or turns pending/approved applications back into drafts', async () => {
  const owner = await new Client().login();
  const list = (await owner.call('GET', endpoint)).body.data;
  for (const item of list.filter((entry: any) => ['PENDING_APPROVAL', 'APPROVED'].includes(entry.status))) {
    for (const saveDraft of [true, false]) {
      const response = await owner.call('PUT', `${endpoint}/${item.id}`, { ...valid, saveDraft });
      assert.equal(response.status, 409);
      assert.equal(response.body.error.code, 'APPLICATION_NOT_EDITABLE');
    }
    assert.deepEqual((await owner.call('GET', `${endpoint}/${item.id}`)).body.data, item);
  }
});

test('UC12 accepts only one of two simultaneous submissions of the same draft', async () => {
  const owner = await new Client().login();
  const item = (await owner.call('POST', endpoint, { saveDraft: true })).body.data;
  const responses = await Promise.all([owner.call('PUT', `${endpoint}/${item.id}`, valid), owner.call('PUT', `${endpoint}/${item.id}`, valid)]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(notices(item.id).length, 1);
});

test('UC12 keeps all unapproved states out of public search, detail and booking even with an active service', async () => {
  const owner = await new Client().login();
  const petOwner = await new Client().login('an.owner@example.com');
  const pet = (await petOwner.call('GET', '/api/pets')).body.data[0];
  const list = (await owner.call('GET', endpoint)).body.data;
  for (const item of list.filter((entry: any) => entry.status !== 'APPROVED')) {
    const serviceId = `service-${item.id}`;
    db.prepare(`INSERT INTO services (id, facility_id, name, type, duration_minutes, price, active) VALUES (?, ?, 'Tắm', 'GROOMING', 60, 100000, 1)`)
      .run(serviceId, item.id);
    const publicList = (await owner.call('GET', '/api/facilities')).body.data;
    assert.ok(!publicList.some((entry: any) => entry.id === item.id));
    assert.equal((await owner.call('GET', `/api/facilities/${item.id}`)).status, 404);
    const booking = await petOwner.call('POST', '/api/bookings', { petId: pet.id, serviceId, date: '2026-12-01', time: '09:00' });
    assert.equal(booking.status, 404);
  }
});

test('UC12 rolls back the application and earlier admin notices if another notice fails', async () => {
  mock.method(console, 'error', () => undefined);
  addAdmin('second-admin', 'ACTIVE');
  db.exec(`CREATE TRIGGER fail_uc12_notice BEFORE INSERT ON notifications WHEN NEW.user_id='second-admin'
    BEGIN SELECT RAISE(ABORT, 'injected notification failure'); END;`);
  const owner = await new Client().login();
  const before = [count('facilities'), count('facility_applications'), count('notifications')];
  assert.equal((await owner.call('POST', endpoint, valid)).status, 500);
  assert.deepEqual([count('facilities'), count('facility_applications'), count('notifications')], before);
  const draft = (await owner.call('POST', endpoint, { saveDraft: true })).body.data;
  assert.equal((await owner.call('PUT', `${endpoint}/${draft.id}`, valid)).status, 500);
  assert.deepEqual((await owner.call('GET', `${endpoint}/${draft.id}`)).body.data, draft);
  assert.equal(notices(draft.id).length, 0);
});
