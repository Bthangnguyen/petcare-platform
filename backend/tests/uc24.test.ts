import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, test } from 'node:test';
import { createApp } from '../src/app';
import { openDatabase, type Db } from '../src/db/database';
import { DEMO_PASSWORD, seedDemoData } from '../src/db/seed';

const email = 'an.owner@example.com';
const nextPassword = 'MatKhauMoi123';
const reset = '/api/auth/password-reset';
const start = Date.parse('2026-11-27T08:00:00+07:00');
let now = start;
let db: Db;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let base: string;

beforeEach(async () => {
  now = start;
  db = openDatabase(':memory:');
  seedDemoData(db, new Date(now));
  const app = createApp(db, { now: () => new Date(now) });
  await new Promise<void>((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  if (server?.listening) await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  db?.close();
});

async function call(path: string, body?: unknown, cookie?: string) {
  const res = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

async function requestToken() {
  const result = await call(`${reset}/request`, { email });
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body.data), ['message']);
  const outbox = await call('/api/dev/outbox');
  assert.equal(outbox.status, 200);
  const mail = outbox.body.data[0];
  assert.equal(mail.to, email);
  const link = new URL(mail.body.slice(mail.body.indexOf('http')));
  assert.equal(link.pathname, '/reset-password');
  const token = link.searchParams.get('token');
  assert.match(token ?? '', /^[0-9a-f]{64}$/);
  return token!;
}

const login = (password = DEMO_PASSWORD, address = email) => call('/api/auth/login', { email: address, password });
const validateToken = (token: string) => call(`${reset}/validate?${new URLSearchParams({ token })}`);
const confirm = (token: string, password = nextPassword, passwordConfirmation = password) =>
  call(`${reset}/confirm`, { token, password, passwordConfirmation });

test('UC24 resets credentials, stores only the token hash, revokes both old sessions and invalidates outstanding links', async () => {
  const first = await login();
  const second = await login();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.ok(first.cookie && second.cookie && first.cookie !== second.cookie);
  const other = await login(DEMO_PASSWORD, 'binh.owner@example.com');
  assert.ok(other.cookie);
  const olderToken = await requestToken();
  const token = await requestToken();
  assert.equal((await validateToken(token)).status, 200);
  assert.equal((await validateToken(token)).status, 200);

  const hash = createHash('sha256').update(token).digest('hex');
  const rows = db.prepare('SELECT token_hash FROM password_reset_tokens').all() as { token_hash: string }[];
  assert.equal(rows.length, 2);
  assert.ok(rows.some((row) => row.token_hash === hash));
  assert.ok(rows.every((row) => row.token_hash !== token));

  await login('wrong-password');
  assert.equal((await confirm(token)).status, 200);
  assert.deepEqual(db.prepare('SELECT failed_login_count, locked_until FROM users WHERE email = ?').get(email),
    { failed_login_count: 0, locked_until: null });
  assert.equal((await call('/api/auth/me', undefined, first.cookie)).status, 401);
  assert.equal((await call('/api/auth/me', undefined, second.cookie)).status, 401);
  assert.equal((await call('/api/auth/me', undefined, other.cookie)).status, 200);
  assert.equal((await validateToken(olderToken)).status, 400);
  assert.equal((await confirm(token)).body.error.code, 'RESET_TOKEN_INVALID');
  assert.equal((await login()).status, 401);
  assert.equal((await login(nextPassword)).status, 200);
});

test('UC24 returns the same public result for active, unknown, suspended and temporarily locked accounts', async () => {
  const standard = await call(`${reset}/request`, { email: ` ${email.toUpperCase()} ` });
  assert.equal(standard.status, 200);
  const unknown = await call(`${reset}/request`, { email: 'unknown@example.com' });
  db.prepare("UPDATE users SET status = 'SUSPENDED' WHERE email = ?").run(email);
  const suspended = await call(`${reset}/request`, { email });
  db.prepare("UPDATE users SET status = 'ACTIVE', locked_until = ? WHERE email = ?")
    .run(new Date(now + 60_000).toISOString(), email);
  const locked = await call(`${reset}/request`, { email });
  for (const result of [unknown, suspended, locked]) {
    assert.equal(result.status, standard.status);
    assert.deepEqual(result.body.data, standard.body.data);
  }
  assert.equal((await call('/api/dev/outbox')).body.data.length, 1);
  assert.ok((await call(`${reset}/request`, { email: 'not-an-email' })).body.error.fields.email);
});

test('UC24 rejects a missing, invalid or expired link without changing the password', async () => {
  const token = await requestToken();
  assert.equal((await validateToken('f'.repeat(64))).body.error.code, 'RESET_TOKEN_INVALID');
  assert.equal((await call(`${reset}/validate`)).body.error.code, 'RESET_TOKEN_INVALID');
  now += 16 * 60_000;
  assert.equal((await validateToken(token)).status, 400);
  assert.equal((await confirm(token)).body.error.code, 'RESET_TOKEN_INVALID');
  assert.equal((await login()).status, 200);
});

test('UC24 returns field errors without consuming a valid link', async () => {
  const token = await requestToken();
  assert.ok((await confirm(token, '1234567')).body.error.fields.password);
  assert.ok((await confirm(token, nextPassword, 'KhacMatKhau123')).body.error.fields.passwordConfirmation);
  assert.equal((await validateToken(token)).status, 200);
  assert.equal((await confirm(token)).status, 200);
});

test('UC24 accepts at most one of two concurrent confirmations', async () => {
  const token = await requestToken();
  const results = await Promise.all([confirm(token), confirm(token, 'MatKhauThuHai123')]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 400]);
  const winner = results[0]?.status === 200 ? nextPassword : 'MatKhauThuHai123';
  const loser = winner === nextPassword ? 'MatKhauThuHai123' : nextPassword;
  assert.equal((await login(winner)).status, 200);
  assert.equal((await login(loser)).status, 401);
});
