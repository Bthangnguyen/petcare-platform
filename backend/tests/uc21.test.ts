import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { beforeEach, afterEach, test, mock } from 'node:test';
import { createApp } from '../src/app';
import { openDatabase, type Db } from '../src/db/database';
import { seedDemoData, DEMO_PASSWORD } from '../src/db/seed';

const applications = '/api/facility-owner/applications';
const adminPath = '/api/admin/facilities';
const valid = { name: 'Cơ sở UC21', address: '99 Đường kiểm thử, Quận 1', area: 'Quận 1', phone: '0901234567',
  openingHours: '08:00–17:00', description: 'Hồ sơ để kiểm chứng quyết định.', supportingDocumentRef: 'giay-phep-uc21.pdf' };
let db: Db;
let now: number;
let base: string;
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
  async login(email = 'admin@example.com') {
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
async function submit(owner: Client, fields: Record<string, unknown> = {}) {
  const response = await owner.call('POST', applications, { ...valid, ...fields });
  assert.equal(response.status, 201);
  return response.body.data;
}
const audits = (id: string) => db.prepare('SELECT * FROM admin_actions WHERE target_id=? ORDER BY rowid').all(id) as any[];
const notices = (id: string) => db.prepare("SELECT * FROM notifications WHERE reference_id=? AND type='FACILITY_DECISION' ORDER BY rowid").all(id) as any[];
const decision = (client: Client, id: string, value: unknown) => client.call('POST', `${adminPath}/${id}/decision`, value);

test('UC21 lists pending facilities by default, filters statuses and returns only public owner data', async () => {
  const admin = await new Client().login();
  const pending = await admin.call('GET', adminPath);
  assert.equal(pending.status, 200);
  assert.ok(pending.body.data.length >= 2);
  assert.ok(pending.body.data.every((item: any) => item.status === 'PENDING_APPROVAL'));
  for (const status of ['APPROVED', 'REJECTED', 'NEEDS_INFORMATION']) {
    const response = await admin.call('GET', `${adminPath}?status=${status}`);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.length);
    assert.ok(response.body.data.every((item: any) => item.status === status));
  }
  const all = (await admin.call('GET', `${adminPath}?status=ALL`)).body.data;
  assert.ok(all.every((item: any) => item.status !== 'DRAFT'));
  for (const status of ['INVALID', 'DRAFT']) assert.equal((await admin.call('GET', `${adminPath}?status=${status}`)).status, 400);
  const detail = await admin.call('GET', `${adminPath}/${pending.body.data[0].id}`);
  assert.equal(detail.status, 200);
  assert.deepEqual(Object.keys(detail.body.data.owner).sort(), ['email', 'fullName', 'id', 'phone', 'role']);
  assert.equal(detail.body.data.owner.role, 'FACILITY_OWNER');
  assert.ok(detail.body.data.supportingDocumentRef);
});

test('UC21 approves atomically, records the authenticated actor, notifies the owner and enables public search when services exist', async () => {
  const owner = await new Client().login('lan.fo@example.com');
  const admin = await new Client().login();
  const item = await submit(owner);
  // Stand-in for UC13: an active service already exists, so approval is the remaining search condition.
  db.prepare(`INSERT INTO services (id, facility_id, name, type, duration_minutes, price, active) VALUES ('uc21-service', ?, 'Tắm', 'GROOMING', 60, 100000, 1)`).run(item.id);
  assert.ok(!(await owner.call('GET', '/api/facilities')).body.data.some((entry: any) => entry.id === item.id));
  now += 60_000;
  const approved = await decision(admin, item.id, { decision: 'APPROVE', actorId: 'spoofed-actor', note: '  Đủ thông tin.  ' });
  assert.equal(approved.status, 200);
  const detail = approved.body.data;
  const actor = (await admin.call('GET', '/api/auth/me')).body.data;
  assert.equal(detail.status, 'APPROVED');
  assert.equal(detail.decisionNote, 'Đủ thông tin.');
  assert.equal(detail.decidedBy, actor.id);
  assert.equal(detail.decidedAt, new Date(now).toISOString());
  assert.equal(detail.submittedAt, item.submittedAt);
  assert.equal(detail.supportingDocumentRef, item.supportingDocumentRef);
  assert.equal(audits(item.id).length, 1);
  assert.equal(audits(item.id)[0].actor_id, actor.id);
  assert.equal(audits(item.id)[0].target_type, 'FACILITY');
  assert.equal(audits(item.id)[0].action_type, 'APPROVE');
  assert.equal(notices(item.id).length, 1);
  assert.equal(notices(item.id)[0].user_id, detail.ownerId);
  assert.match(notices(item.id)[0].title, /được duyệt/);
  assert.ok((await owner.call('GET', '/api/notifications')).body.data.items.some((entry: any) => entry.referenceId === item.id));
  assert.ok((await owner.call('GET', '/api/facilities')).body.data.some((entry: any) => entry.id === item.id));
  assert.equal((await owner.call('GET', `/api/facilities/${item.id}`)).status, 200);
  assert.equal((await owner.call('PUT', `${applications}/${item.id}`, { ...valid, saveDraft: true })).status, 409);
  assert.ok(!(await admin.call('GET', adminPath)).body.data.some((entry: any) => entry.id === item.id));
});

test('UC21 rejection requires a reason, preserves the audit when the owner resubmits and can then be approved', async () => {
  const owner = await new Client().login('lan.fo@example.com');
  const admin = await new Client().login();
  const item = await submit(owner);
  for (const input of [{ decision: 'REJECT' }, { decision: 'REJECT', note: '   ' }]) {
    const result = await decision(admin, item.id, input);
    assert.equal(result.status, 400);
    assert.ok(result.body.error.fields.note);
  }
  assert.equal(audits(item.id).length, 0);
  const rejected = await decision(admin, item.id, { decision: 'REJECT', note: '  Địa chỉ chưa chính xác.  ' });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.data.status, 'REJECTED');
  const ownerView = (await owner.call('GET', `${applications}/${item.id}`)).body.data;
  assert.equal(ownerView.decisionNote, 'Địa chỉ chưa chính xác.');
  assert.match(notices(item.id)[0].message, /Địa chỉ chưa chính xác/);
  now += 60_000;
  const resubmitted = await owner.call('PUT', `${applications}/${item.id}`, { ...valid, address: '101 Địa chỉ đã sửa, Quận 1' });
  assert.equal(resubmitted.body.data.status, 'PENDING_APPROVAL');
  assert.equal(resubmitted.body.data.decisionNote, null);
  assert.equal(resubmitted.body.data.decidedAt, null);
  assert.equal(audits(item.id)[0].message, 'Địa chỉ chưa chính xác.');
  const approved = await decision(admin, item.id, { decision: 'APPROVE' });
  assert.equal(approved.status, 200);
  assert.deepEqual(audits(item.id).map(entry => entry.action_type), ['REJECT', 'APPROVE']);
  assert.equal(notices(item.id).length, 2);
});

test('UC21 requesting information requires a question and the UC12 owner can correct and resubmit', async () => {
  const owner = await new Client().login('hung.fo@example.com');
  const admin = await new Client().login();
  const item = await submit(owner);
  const missing = await decision(admin, item.id, { decision: 'REQUEST_INFORMATION' });
  assert.equal(missing.status, 400);
  assert.ok(missing.body.error.fields.note);
  const result = await decision(admin, item.id, { decision: 'REQUEST_INFORMATION', note: 'Bổ sung tài liệu giấy phép.' });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.status, 'NEEDS_INFORMATION');
  assert.equal(audits(item.id)[0].action_type, 'REQUEST_INFORMATION');
  assert.match(notices(item.id)[0].message, /Bổ sung tài liệu giấy phép/);
  assert.equal((await owner.call('GET', `${applications}/${item.id}`)).body.data.decisionNote, 'Bổ sung tài liệu giấy phép.');
  const submitted = await owner.call('PUT', `${applications}/${item.id}`, { ...valid, supportingDocumentRef: 'giay-phep-moi.pdf' });
  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.data.status, 'PENDING_APPROVAL');
  assert.equal((await decision(admin, item.id, { decision: 'APPROVE' })).status, 200);
  assert.deepEqual(audits(item.id).map(entry => entry.action_type), ['REQUEST_INFORMATION', 'APPROVE']);
});

test('UC21 warns for a normalized matching address, excludes self/drafts and still allows an explicit approval', async () => {
  const owner = await new Client().login('lan.fo@example.com');
  const admin = await new Client().login();
  const spa = db.prepare("SELECT id, address FROM facilities WHERE name='Happy Paws Pet Spa'").get() as { id: string; address: string };
  const item = await submit(owner, { address: spa.address.toLocaleUpperCase('vi-VN').replace(/ /g, '  ') });
  const draft = await submit(owner, { address: spa.address, saveDraft: true });
  const detail = (await admin.call('GET', `${adminPath}/${item.id}`)).body.data;
  assert.ok(detail.duplicates.some((entry: any) => entry.id === spa.id));
  assert.ok(detail.duplicates.every((entry: any) => entry.id !== item.id && entry.id !== draft.id));
  assert.equal((await decision(admin, item.id, { decision: 'APPROVE' })).status, 200);
});

test('UC21 visitors and all non-admin roles are denied list, detail and decision endpoints', async () => {
  for (const email of [undefined, 'an.owner@example.com', 'hang.staff@example.com', 'lan.fo@example.com']) {
    const client = new Client();
    if (email) await client.login(email);
    for (const [method, path, body] of [['GET', adminPath, undefined], ['GET', `${adminPath}/unknown`, undefined],
      ['POST', `${adminPath}/unknown/decision`, { decision: 'APPROVE' }]] as const) {
      assert.equal((await client.call(method, path, body)).status, email ? 403 : 401, `${email} ${method} ${path}`);
    }
  }
});

test('UC21 rejects draft/missing applications, invalid decisions, oversized notes and every repeat decision', async () => {
  const owner = await new Client().login('lan.fo@example.com');
  const admin = await new Client().login();
  const draft = await submit(owner, { saveDraft: true });
  for (const id of ['unknown', draft.id]) {
    assert.equal((await admin.call('GET', `${adminPath}/${id}`)).status, 404);
    assert.equal((await decision(admin, id, { decision: 'APPROVE' })).status, 404);
  }
  for (const value of ['APPROVE', 'REJECT', 'REQUEST_INFORMATION']) {
    const item = await submit(owner);
    for (const bad of [{ decision: 'INVALID' }, { decision: 'APPROVE', note: 'x'.repeat(1001) }, { decision: 'REJECT', note: 42 }]) {
      assert.equal((await decision(admin, item.id, bad)).status, 400);
    }
    assert.equal((await decision(admin, item.id, { decision: value, note: 'Phản hồi hợp lệ.' })).status, 200);
    for (const retry of ['APPROVE', 'REJECT', 'REQUEST_INFORMATION']) {
      const result = await decision(admin, item.id, { decision: retry, note: 'Quyết định lần hai.' });
      assert.equal(result.status, 409);
      assert.equal(result.body.error.code, 'APPLICATION_ALREADY_DECIDED');
    }
    assert.equal(audits(item.id).length, 1);
    assert.equal(notices(item.id).length, 1);
  }
});

test('UC21 two administrators deciding concurrently produce one decision, one audit and one owner notice', async () => {
  const owner = await new Client().login('lan.fo@example.com');
  const admin = await new Client().login();
  db.prepare(`INSERT INTO users (id, full_name, email, phone, password_hash, role, status, created_at)
    SELECT 'other-admin', 'Quản trị thứ hai', 'other.admin@example.com', phone, password_hash, role, status, created_at
    FROM users WHERE email='admin@example.com'`).run();
  const other = await new Client().login('other.admin@example.com');
  const item = await submit(owner);
  const results = await Promise.all([decision(admin, item.id, { decision: 'APPROVE' }),
    decision(other, item.id, { decision: 'REJECT', note: 'Thông tin chưa chính xác.' })]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const winner = results.find(result => result.status === 200)!.body.data;
  assert.equal(audits(item.id).length, 1);
  assert.equal(notices(item.id).length, 1);
  assert.equal(audits(item.id)[0].actor_id, winner.decidedBy);
  assert.equal((await admin.call('GET', `${adminPath}/${item.id}`)).body.data.status, winner.status);
});

test('UC21 audit or notification failure rolls back status, metadata and all decision side effects', async () => {
  mock.method(console, 'error', () => undefined);
  const owner = await new Client().login('lan.fo@example.com');
  const admin = await new Client().login();
  const item = await submit(owner);
  const before = (await admin.call('GET', `${adminPath}/${item.id}`)).body.data;
  for (const [name, trigger] of [
    ['fail_audit', "CREATE TRIGGER fail_audit BEFORE INSERT ON admin_actions BEGIN SELECT RAISE(ABORT, 'injected audit failure'); END;"],
    ['fail_notice', "CREATE TRIGGER fail_notice BEFORE INSERT ON notifications WHEN NEW.type='FACILITY_DECISION' BEGIN SELECT RAISE(ABORT, 'injected notification failure'); END;"],
  ]) {
    db.exec(trigger!);
    assert.equal((await decision(admin, item.id, { decision: 'APPROVE' })).status, 500);
    assert.deepEqual((await admin.call('GET', `${adminPath}/${item.id}`)).body.data, before);
    assert.equal(audits(item.id).length, 0);
    assert.equal(notices(item.id).length, 0);
    db.exec(`DROP TRIGGER ${name}`);
  }
  assert.equal((await decision(admin, item.id, { decision: 'APPROVE' })).status, 200);
});

test('UC21 can review a legacy pending facility without an application metadata row', async () => {
  const owner = await new Client().login('lan.fo@example.com');
  const admin = await new Client().login();
  const item = await submit(owner);
  db.prepare('DELETE FROM facility_applications WHERE facility_id=?').run(item.id);
  const detail = (await admin.call('GET', `${adminPath}/${item.id}`)).body.data;
  assert.equal(detail.supportingDocumentRef, null);
  assert.equal((await decision(admin, item.id, { decision: 'APPROVE' })).status, 200);
  const row = db.prepare('SELECT decided_by, decided_at FROM facility_applications WHERE facility_id=?').get(item.id);
  assert.ok(row);
  assert.equal(audits(item.id).length, 1);
});
