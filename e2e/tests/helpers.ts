import { APIRequestContext, Page, TestInfo, expect, test } from '@playwright/test';

export const PASSWORD = 'Matkhau123';

let counter = 0;
export const uniqueEmail = (prefix: string) => `${prefix}.${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;

export interface Account {
  email: string;
  password: string;
  fullName: string;
}

/** Creates a pet owner through the API (the form of UC01 is tested separately in the unit tests of the backend). */
export async function registerOwner(request: APIRequestContext, base = ''): Promise<Account> {
  const acc = { email: uniqueEmail('owner'), password: PASSWORD, fullName: 'Chủ Thử Nghiệm' };
  const res = await request.post(`${base}/api/auth/register`, {
    data: { accountType: 'PET_OWNER', fullName: acc.fullName, email: acc.email, phone: '0912345678', password: acc.password, passwordConfirmation: acc.password },
  });
  expect(res.status()).toBe(201);
  return acc;
}

/** Logs in through the API; the session cookie is stored in the browser context of the page. */
export async function apiLogin(page: Page, acc: { email: string; password: string }) {
  const res = await page.request.post('/api/auth/login', { data: { email: acc.email, password: acc.password } });
  expect(res.status()).toBe(200);
}

export async function createPetApi(page: Page, name = 'Bống', extra: Record<string, unknown> = {}) {
  const res = await page.request.post('/api/pets', { data: { name, species: 'Chó', breed: 'Poodle', sex: 'Đực', ...extra } });
  expect(res.status()).toBe(201);
  return (await res.json()).data as { id: string; name: string };
}

/** Logs in through the login page (UC02 basic flow). */
export async function uiLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

export async function facilityId(page: Page, name: string): Promise<string> {
  const res = await page.request.get('/api/facilities');
  const list = (await res.json()).data as { id: string; name: string }[];
  const f = list.find((x) => x.name === name);
  if (!f) throw new Error(`Facility not found: ${name}`);
  return f.id;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * A date from tomorrow on that is a working day of the demo facilities (Tuesday to Saturday). Every browser project gets its
 * own date, so that the projects do not take the slots of each other.
 */
export function bookingDate(info: TestInfo): string {
  const index = Math.max(0, ['chromium', 'chrome', 'edge', 'mobile-360'].indexOf(info.project.name));
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  let found = -1;
  for (let i = 1; i < 40; i++) {
    const c = new Date(d.getTime() + i * 86400000);
    if (c.getDay() >= 2 && c.getDay() <= 6) {
      found++;
      if (found === index) return iso(c);
    }
  }
  throw new Error('no date');
}

/** The next Sunday (the spa is closed on Sunday). */
export function nextSunday(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() !== 0);
  return iso(d);
}

/** Records what the tester observed; it is written to the "Actual Result" column of the test report. */
export function actual(text: string) {
  test.info().annotations.push({ type: 'actual', description: text });
}

export const ddmmyyyy = (isoDate: string) => isoDate.split('-').reverse().join('/');
