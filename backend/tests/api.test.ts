import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db/database';
import { DEMO_PASSWORD, seedDemoData } from '../src/db/seed';

/** Fixed clock: Monday 16/11/2026, 06:00 (UTC+7). */
let nowMs = new Date('2026-11-16T06:00:00+07:00').getTime();
const clock = { now: () => new Date(nowMs) };

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
    if (set) this.cookie = set.split(';')[0]!.includes('sid=') && !set.includes('Expires=Thu, 01 Jan 1970') ? set.split(';')[0]! : '';
    const json = (await res.json()) as any;
    return { status: res.status, body: json };
  }
  async login(email: string, password = DEMO_PASSWORD) {
    return this.call('POST', '/api/auth/login', { email, password });
  }
}

before(async () => {
  const db = openDatabase(':memory:');
  seedDemoData(db, new Date(nowMs));
  const app = createApp(db, clock);
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

describe('UC01 Register account', () => {
  test('creates an account and rejects a second one with the same e-mail', async () => {
    const c = new Client();
    const body = { accountType: 'PET_OWNER', fullName: 'Nguyễn Test', email: 'new.user@example.com', phone: '0911222333', password: 'Matkhau123', passwordConfirmation: 'Matkhau123' };
    const r1 = await c.call('POST', '/api/auth/register', body);
    assert.equal(r1.status, 201);
    assert.equal(r1.body.data.role, 'PET_OWNER');
    assert.equal(r1.body.data.passwordHash, undefined);
    const r2 = await c.call('POST', '/api/auth/register', body);
    assert.equal(r2.status, 409);
    assert.equal(r2.body.error.code, 'EMAIL_TAKEN');
  });
  test('validates the fields', async () => {
    const r = await new Client().call('POST', '/api/auth/register', { accountType: 'PET_OWNER', fullName: '', email: 'x', phone: '1', password: 'short', passwordConfirmation: 'other' });
    assert.equal(r.status, 400);
    assert.ok(r.body.error.fields.email && r.body.error.fields.password && r.body.error.fields.fullName);
  });
});

describe('UC02 Log in', () => {
  test('logs in, shows the profile and logs out', async () => {
    const c = new Client();
    const r = await c.login('an.owner@example.com');
    assert.equal(r.status, 200);
    assert.equal(r.body.data.role, 'PET_OWNER');
    assert.equal((await c.call('GET', '/api/auth/me')).status, 200);
    await c.call('POST', '/api/auth/logout');
    assert.equal((await c.call('GET', '/api/auth/me')).status, 401);
  });
  test('wrong password and unknown e-mail give the same general message', async () => {
    const a = await new Client().login('an.owner@example.com', 'wrong-password');
    const b = await new Client().login('nobody@example.com', 'wrong-password');
    assert.equal(a.status, 401);
    assert.equal(a.body.error.message, b.body.error.message);
  });
  test('blocks the account after 5 failed attempts for 15 minutes', async () => {
    const c = new Client();
    for (let i = 0; i < 4; i++) assert.equal((await c.login('binh.owner@example.com', 'bad')).status, 401);
    assert.equal((await c.login('binh.owner@example.com', 'bad')).status, 423);
    assert.equal((await c.login('binh.owner@example.com')).status, 423); // correct password, still blocked
    nowMs += 16 * 60_000;
    assert.equal((await c.login('binh.owner@example.com')).status, 200);
    nowMs -= 16 * 60_000;
  });
  test('protected routes need a session and the right role', async () => {
    assert.equal((await new Client().call('GET', '/api/pets')).status, 401);
    const fo = new Client();
    await fo.login('lan.fo@example.com');
    assert.equal((await fo.call('GET', '/api/pets')).status, 403);
  });
});

describe('UC03 Manage pet profile', () => {
  test('creates, edits, adds records and archives a pet; other owners cannot see it', async () => {
    const c = new Client();
    await c.login('binh.owner@example.com');
    const created = await c.call('POST', '/api/pets', { name: 'Bông', species: 'Chó', breed: 'Corgi', sex: 'Cái', birthDate: '2024-05-01', microchipNumber: '900000000000777', allergies: ['Hải sản'] });
    assert.equal(created.status, 201);
    assert.ok(created.body.data.qrCode);
    const petId = created.body.data.id;
    assert.equal((await c.call('PUT', `/api/pets/${petId}`, { name: 'Bông Bông', species: 'Chó' })).body.data.name, 'Bông Bông');
    assert.equal((await c.call('POST', `/api/pets/${petId}/weights`, { weightKg: 7.5, recordedAt: '2026-11-01' })).status, 201);
    assert.equal((await c.call('POST', `/api/pets/${petId}/vaccinations`, { vaccineName: 'Dại', injectionDate: '2026-10-01', revaccinationDate: '2027-10-01' })).status, 201);
    const detail = await c.call('GET', `/api/pets/${petId}`);
    assert.equal(detail.body.data.weights.length, 1);
    assert.equal(detail.body.data.vaccinations.length, 1);
    const qr = await c.call('GET', `/api/pets/${petId}/qr`);
    assert.match(qr.body.data.dataUrl, /^data:image\/png;base64,/);
    const other = new Client();
    await other.login('an.owner@example.com');
    assert.equal((await other.call('GET', `/api/pets/${petId}`)).status, 404);
    assert.equal((await c.call('POST', `/api/pets/${petId}/archive`)).body.data.status, 'ARCHIVED');
    assert.equal((await c.call('GET', '/api/pets')).body.data.some((p: any) => p.id === petId), false);
  });
  test('rejects a missing name, a future birth date and a duplicate microchip', async () => {
    const c = new Client();
    await c.login('an.owner@example.com');
    const a = await c.call('POST', '/api/pets', { name: '', species: 'Chó' });
    assert.equal(a.status, 400);
    assert.ok(a.body.error.fields.name);
    const b = await c.call('POST', '/api/pets', { name: 'X', species: 'Chó', birthDate: '2030-01-01' });
    assert.ok(b.body.error.fields.birthDate);
    const d = await c.call('POST', '/api/pets', { name: 'Y', species: 'Chó', microchipNumber: '900000000000001' });
    assert.ok(d.body.error.fields.microchipNumber);
  });
});

describe('UC06 Search facilities and UC08 Check availability', () => {
  test('searches approved facilities only, by area and type', async () => {
    const c = new Client();
    const all = await c.call('GET', '/api/facilities');
    assert.equal(all.body.data.length, 4); // the facility that is not approved is not listed
    const q1 = await c.call('GET', '/api/facilities?area=quan%201&type=GROOMING');
    assert.deepEqual(q1.body.data.map((f: any) => f.name), ['Happy Paws Pet Spa']);
    const none = await c.call('GET', '/api/facilities?area=Cần Thơ');
    assert.equal(none.body.data.length, 0);
    const partial = await c.call('GET', '/api/facilities?area=Quận');
    assert.equal(partial.body.data.length, 0); // area must match a full area/address segment, not a substring
    const sorted = await c.call('GET', '/api/facilities?sort=priceAsc');
    assert.ok(sorted.body.data[0].startingPrice <= sorted.body.data[1].startingPrice);
    const byKeyword = await c.call('GET', '/api/facilities?q=tam%20say');
    assert.deepEqual(byKeyword.body.data.map((f: any) => f.name), ['Bubble Pet Grooming']);
    const byPriceRange = await c.call('GET', '/api/facilities?minPrice=180000&maxPrice=220000');
    assert.ok(byPriceRange.body.data.some((f: any) => f.name === 'Pet Hotel Sài Gòn'));
  });
  test('computes free slots from shifts and bookings', async () => {
    const c = new Client();
    const spa = (await c.call('GET', '/api/facilities?area=Quận 1&type=GROOMING')).body.data[0];
    const detail = (await c.call('GET', `/api/facilities/${spa.id}`)).body.data;
    const svc = detail.services.find((s: any) => s.name === 'Tắm vệ sinh');
    const day = await c.call('GET', `/api/facilities/${spa.id}/availability?serviceId=${svc.id}&date=2026-11-16`);
    assert.equal(day.status, 200);
    assert.equal(day.body.data.slots[0].start, '08:00');
    assert.equal(day.body.data.slots[0].staff.length, 2);
    const sunday = await c.call('GET', `/api/facilities/${spa.id}/availability?serviceId=${svc.id}&date=2026-11-22`);
    assert.equal(sunday.body.data.slots.length, 0);
    assert.equal(sunday.body.data.nearestDates[0], '2026-11-23');
  });
});

describe('UC07 Book appointment and UC09 Manage my bookings', () => {
  async function setup() {
    const owner = new Client();
    await owner.login('an.owner@example.com');
    const spa = (await owner.call('GET', '/api/facilities?area=Quận 1')).body.data[0];
    const detail = (await owner.call('GET', `/api/facilities/${spa.id}`)).body.data;
    const svc = detail.services.find((s: any) => s.name === 'Tắm vệ sinh');
    const pets = (await owner.call('GET', '/api/pets')).body.data;
    return { owner, spa, svc, pet: pets[0] };
  }

  test('books a slot; a slot with the same staff cannot be booked twice', async () => {
    const { owner, svc, pet } = await setup();
    const input = { petId: pet.id, serviceId: svc.id, date: '2026-11-17', time: '09:00' };
    const b1 = await owner.call('POST', '/api/bookings', input);
    assert.equal(b1.status, 201);
    assert.equal(b1.body.data.status, 'CONFIRMED');
    const b2 = await owner.call('POST', '/api/bookings', input); // the second staff member is still free
    assert.equal(b2.status, 201);
    assert.notEqual(b1.body.data.staff.id, b2.body.data.staff.id);
    const b3 = await owner.call('POST', '/api/bookings', input); // both staff members are busy now
    assert.equal(b3.status, 409);
    assert.equal(b3.body.error.code, 'SLOT_TAKEN');
    const n = await owner.call('GET', '/api/notifications');
    assert.ok(n.body.data.unread >= 2);
  });

  test('two simultaneous requests cannot take the same slot', async () => {
    const { owner, svc, pet } = await setup();
    const input = { petId: pet.id, serviceId: svc.id, date: '2026-11-18', time: '14:00' };
    const staffIds = [] as string[];
    const results = await Promise.all(
      [1, 2, 3, 4].map(async () => {
        const c = new Client();
        await c.login('an.owner@example.com');
        return c.call('POST', '/api/bookings', input);
      }),
    );
    results.forEach((r) => r.status === 201 && staffIds.push(r.body.data.staff.id));
    assert.equal(results.filter((r) => r.status === 201).length, 2); // two staff members, four requests
    assert.equal(new Set(staffIds).size, 2);
    void owner;
  });

  test('refuses a pet of another owner and a past time', async () => {
    const { owner, svc } = await setup();
    const binh = new Client();
    await binh.login('binh.owner@example.com');
    const created = await binh.call('POST', '/api/pets', { name: 'Kem', species: 'Mèo' });
    const r = await owner.call('POST', '/api/bookings', { petId: created.body.data.id, serviceId: svc.id, date: '2026-11-17', time: '10:00' });
    assert.equal(r.status, 404);
    const past = await owner.call('POST', '/api/bookings', { petId: (await owner.call('GET', '/api/pets')).body.data[0].id, serviceId: svc.id, date: '2026-11-16', time: '05:00' });
    assert.equal(past.status, 400);
  });

  test('cancels a booking that starts in at least 2 hours and refuses a later cancellation', async () => {
    const { owner, svc, pet } = await setup();
    const b = (await owner.call('POST', '/api/bookings', { petId: pet.id, serviceId: svc.id, date: '2026-11-19', time: '10:00' })).body.data;
    nowMs = new Date('2026-11-19T09:00:00+07:00').getTime(); // 1 hour before the start
    await owner.login('an.owner@example.com'); // the old session has expired (30 minutes idle rule)
    const late = await owner.call('POST', `/api/bookings/${b.id}/cancel`);
    assert.equal(late.status, 409);
    assert.equal(late.body.error.code, 'CANCEL_NOT_ALLOWED');
    nowMs = new Date('2026-11-16T06:00:00+07:00').getTime();
    await owner.login('an.owner@example.com');
    const ok = await owner.call('POST', `/api/bookings/${b.id}/cancel`);
    assert.equal(ok.body.data.status, 'CANCELLED');
    const free = await owner.call('GET', `/api/facilities/${b.facility.id}/availability?serviceId=${svc.id}&date=2026-11-19`);
    assert.equal(free.body.data.slots.find((s: any) => s.start === '10:00').staff.length >= 1, true);
  });

  test('the facility owner sees the bookings and changes the status', async () => {
    const { owner, svc, pet } = await setup();
    const b = (await owner.call('POST', '/api/bookings', { petId: pet.id, serviceId: svc.id, date: '2026-11-20', time: '08:00' })).body.data;
    const fo = new Client();
    await fo.login('lan.fo@example.com');
    const list = await fo.call('GET', '/api/facility-bookings?date=2026-11-20');
    assert.ok(list.body.data.some((x: any) => x.id === b.id && x.pet.name === pet.name));
    const bad = await fo.call('POST', `/api/facility-bookings/${b.id}/status`, { status: 'COMPLETED' });
    assert.equal(bad.status, 409);
    assert.equal((await fo.call('POST', `/api/facility-bookings/${b.id}/status`, { status: 'CHECKED_IN' })).body.data.status, 'CHECKED_IN');
    const other = new Client();
    await other.login('hung.fo@example.com');
    assert.equal((await other.call('POST', `/api/facility-bookings/${b.id}/status`, { status: 'IN_PROGRESS' })).status, 403);

    // UC11 filters & reassign staff
    const meta = await fo.call('GET', '/api/facility-bookings/filters');
    assert.equal(meta.status, 200);
    assert.ok(meta.body.data.facilities.length >= 2);
    const otherStaff = meta.body.data.staff.find((s: any) => s.facilityId === b.facility.id && s.id !== b.staff.id);
    assert.ok(otherStaff);
    const reassigned = await fo.call('POST', `/api/facility-bookings/${b.id}/reassign`, { staffId: otherStaff.id });
    assert.equal(reassigned.status, 200);
    assert.equal(reassigned.body.data.staff.id, otherStaff.id);
    const byStaff = await fo.call('GET', `/api/facility-bookings?date=2026-11-20&staffId=${otherStaff.id}`);
    assert.ok(byStaff.body.data.some((x: any) => x.id === b.id));
  });
});
