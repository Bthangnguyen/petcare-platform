import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { apiLogin, bookingDate, facilityId, PASSWORD } from './helpers';

/**
 * Takes the screenshots of the user interface for the UI prototype document (project "screens"):
 *   npx playwright test --project=screens
 * The screenshots are written to the folder given by the environment variable SCREENSHOT_DIR.
 */
const dir = process.env.SCREENSHOT_DIR ?? path.resolve(__dirname, '../results/screens');
fs.mkdirSync(dir, { recursive: true });

test('screenshots of the main screens', async ({ page, browser }, info) => {
  // The sticky header would appear in the middle of full-page screenshots; it is made static for the screenshots.
  const staticHeader = () => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = '.topbar{position:static !important}';
      document.head.appendChild(st);
    });
  };
  await page.addInitScript(staticHeader);
  const shot = async (name: string, full = true) => {
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full });
  };

  // 1. Login and register (visitor)
  await page.goto('/');
  await shot('01_home_visitor');
  await page.goto('/login');
  await shot('02_login');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await shot('03_login_errors');
  await page.goto('/register');
  await shot('04_register');

  // 2. Pet owner: an.owner@example.com (seeded: 2 pets)
  await apiLogin(page, { email: 'an.owner@example.com', password: 'Password123' });
  const date = bookingDate(info);
  const spa = await facilityId(page, 'Happy Paws Pet Spa');
  const pets = (await (await page.request.get('/api/pets')).json()).data as { id: string; name: string }[];
  const milo = pets.find((p) => p.name === 'Milo')!;
  const service = ((await (await page.request.get(`/api/facilities/${spa}`)).json()).data.services as { id: string; name: string }[]).find((s) => s.name === 'Tắm vệ sinh')!;
  for (const time of ['09:00', '14:00']) {
    const r = await page.request.post('/api/bookings', { data: { petId: milo.id, serviceId: service.id, date, time } });
    expect(r.status()).toBe(201);
  }
  await page.goto('/');
  await shot('05_home_owner');
  await page.goto('/pets');
  await shot('06_pets');
  await page.goto('/pets/new');
  await page.getByLabel('Tên thú cưng').fill('Bông');
  await page.getByLabel('Giống').fill('Corgi');
  await page.getByLabel('Giới tính').selectOption('Cái');
  await page.getByLabel('Ngày sinh').fill('2024-05-01');
  await page.getByLabel('Dị ứng').fill('hải sản');
  await shot('07_pet_form');
  await page.goto(`/pets/${milo.id}`);
  await expect(page.getByRole('img', { name: 'Mã QR của Milo' })).toBeVisible();
  await shot('08_pet_detail');

  await page.goto('/facilities');
  await expect(page.getByTestId('result-count')).toBeVisible();
  await shot('09_facility_search');
  await page.getByLabel('Khu vực').selectOption('Quận 1');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.getByTestId('result-count')).toContainText('1 cơ sở');
  await shot('10_facility_search_filtered');

  await page.goto(`/facilities/${spa}`);
  await page.getByLabel(/Tắm vệ sinh/).check();
  await page.getByLabel('3. Chọn ngày').fill(date);
  await page.getByTestId('slot-10:00').click();
  await expect(page.getByTestId('booking-summary')).toBeVisible();
  await shot('11_booking_summary');
  await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
  await expect(page.getByTestId('booking-success')).toBeVisible();
  await shot('12_booking_success');

  await page.goto('/bookings');
  await expect(page.getByTestId('booking-row').first()).toBeVisible();
  await shot('13_my_bookings');
  await page.goto('/notifications');
  await shot('14_notifications');

  // 3. Facility owner: lan.fo@example.com (owner of Happy Paws Pet Spa)
  const fo = await browser.newContext({ baseURL: 'http://localhost:3100', viewport: { width: 1280, height: 800 }, locale: 'vi-VN' });
  await fo.addInitScript(staticHeader);
  const p2 = await fo.newPage();
  await p2.request.post('/api/auth/login', { data: { email: 'lan.fo@example.com', password: PASSWORD === '' ? '' : 'Password123' } });
  await p2.goto(`/facility/bookings?`);
  await p2.getByLabel('Ngày').fill(date);
  await expect(p2.getByTestId('facility-booking-row').first()).toBeVisible();
  await p2.waitForLoadState('networkidle');
  await p2.screenshot({ path: path.join(dir, '15_facility_owner_bookings.png'), fullPage: true });
  await fo.close();

  // 4. Mobile screens (360 px)
  const mobile = await browser.newContext({ baseURL: 'http://localhost:3100', viewport: { width: 360, height: 740 }, locale: 'vi-VN', deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobile.addInitScript(staticHeader);
  const m = await mobile.newPage();
  const mshot = async (name: string) => {
    await m.waitForLoadState('networkidle');
    await m.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  };
  await m.goto('/login');
  await mshot('m1_login');
  await m.request.post('/api/auth/login', { data: { email: 'an.owner@example.com', password: 'Password123' } });
  await m.goto('/');
  await mshot('m2_home');
  await m.goto(`/facilities/${spa}`);
  await m.getByLabel(/Tắm vệ sinh/).check();
  await m.getByLabel('3. Chọn ngày').fill(date);
  await m.getByTestId('slot-11:00').click();
  await mshot('m3_booking');
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow, 'no horizontal scrolling at 360 px').toBe(false);
  await mobile.close();
});
