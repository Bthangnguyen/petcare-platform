import { Page, expect, test } from '@playwright/test';
import { PASSWORD, actual, apiLogin, bookingDate, createPetApi, ddmmyyyy, facilityId, nextSunday, registerOwner, uiLogin } from './helpers';

const SPA = 'Happy Paws Pet Spa';
const BUBBLE = 'Bubble Pet Grooming';

/** Opens the facility page and chooses the service and the date (UC07 basic flow steps 1 and 3). */
async function openBooking(page: Page, facility: string, service: RegExp, date: string) {
  await page.goto(`/facilities/${await facilityId(page, facility)}`);
  await page.getByLabel(service).check();
  await page.getByLabel('3. Chọn ngày').fill(date);
}

/** UC07 Book appointment (with UC08 Check availability) – test cases TC-UC07-01 to TC-UC07-08. */
test.describe('UC07 Book appointment', () => {
  test('TC-UC07-01 Book a free slot (basic flow)', async ({ page, request }, info) => {
    const date = bookingDate(info);
    const acc = await registerOwner(request);
    await apiLogin(page, acc);
    const pet = await createPetApi(page, 'Bống');
    await openBooking(page, SPA, /Tắm vệ sinh/, date);
    await page.getByTestId('slot-09:00').click();
    await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
    const ok = page.getByTestId('booking-success');
    await expect(ok).toContainText('Đặt lịch thành công');
    const message = await ok.innerText();
    await page.goto('/bookings');
    const row = page.getByTestId('booking-row').first();
    await expect(row).toContainText('Tắm vệ sinh');
    await expect(row).toContainText('09:00');
    await expect(row).toContainText('Đã xác nhận');
    await expect(row).toContainText(pet.name);
    actual(`${message.replace(/\s+/g, ' ')} In "Lịch hẹn của tôi": Tắm vệ sinh – Bống, 09:00, status "Đã xác nhận".`);
  });

  test('TC-UC07-02 The summary shows all data before the confirmation', async ({ page, request }, info) => {
    const date = bookingDate(info);
    const acc = await registerOwner(request);
    await apiLogin(page, acc);
    await createPetApi(page, 'Mực');
    await openBooking(page, SPA, /Tắm vệ sinh/, date);
    await page.getByTestId('slot-10:00').click();
    const s = page.getByTestId('booking-summary');
    await expect(s).toBeVisible();
    await expect(s).toContainText(SPA);
    await expect(s).toContainText('Tắm vệ sinh');
    await expect(s).toContainText('Mực');
    await expect(s).toContainText(`10:00 – 11:00, ${ddmmyyyy(date)}`);
    await expect(s).toContainText('150.000');
    const bookings = await (await page.request.get('/api/bookings/mine')).json();
    expect(bookings.data.upcoming).toHaveLength(0);
    actual(`The summary shows: ${(await s.innerText()).replace(/\s+/g, ' ')} No booking has been created yet.`);
  });

  test('TC-UC07-03 The slot is taken by another owner in the meantime', async ({ page, request, browser }, info) => {
    const date = bookingDate(info);
    const options = { baseURL: 'http://localhost:3100', locale: 'vi-VN', viewport: page.viewportSize() ?? undefined };
    const ctxB = await browser.newContext(options);
    const pageB = await ctxB.newPage();
    try {
      for (const [p, label] of [[page, 'A'], [pageB, 'B']] as const) {
        const acc = await registerOwner(p.request);
        await apiLogin(p, acc);
        await createPetApi(p, `Thú ${label}`);
        await openBooking(p, BUBBLE, /Tắm sấy/, date);
        await p.getByTestId('slot-10:00').click();
        await expect(p.getByTestId('booking-summary')).toBeVisible();
      }
      void request;
      await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
      await expect(page.getByTestId('booking-success')).toBeVisible();
      await pageB.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
      const warning = pageB.getByRole('status').filter({ hasText: 'vừa có người đặt' });
      await expect(warning).toBeVisible();
      await expect(pageB.getByTestId('slot-10:00')).toHaveCount(0);
      await expect(pageB.getByTestId('booking-summary')).toHaveCount(0);
      const mine = await (await pageB.request.get('/api/bookings/mine')).json();
      expect(mine.data.upcoming).toHaveLength(0);
      actual(`Owner A booked successfully. Owner B got the message "${(await warning.innerText()).replace(/\s+/g, ' ')}"; the slot 10:00 disappeared from the list; owner B has no booking (no double booking).`);
    } finally {
      await ctxB.close();
    }
  });

  test('TC-UC07-04 No free slot on the chosen date: the nearest dates are proposed', async ({ page, request }) => {
    const acc = await registerOwner(request);
    await apiLogin(page, acc);
    await createPetApi(page, 'Chủ Nhật');
    await openBooking(page, SPA, /Tắm vệ sinh/, nextSunday());
    await expect(page.getByTestId('no-slots')).toBeVisible();
    const nearest = page.getByRole('button', { name: /Thứ/ }).first();
    await expect(nearest).toBeVisible();
    const label = await nearest.innerText();
    await nearest.click();
    await expect(page.getByTestId('slot-08:00')).toBeVisible();
    actual(`The spa is closed on Sunday: "Không còn khung giờ trống trong ngày này." with the nearest date that has free slots ("${label}"); after choosing that date the slots are shown.`);
  });

  test('TC-UC07-05 The owner has no pet profile yet', async ({ page, request }, info) => {
    const acc = await registerOwner(request);
    await apiLogin(page, acc);
    await openBooking(page, SPA, /Tắm vệ sinh/, bookingDate(info));
    await expect(page.getByText('Bạn chưa có hồ sơ thú cưng.')).toBeVisible();
    await page.getByRole('link', { name: 'Tạo hồ sơ thú cưng' }).click();
    await expect(page).toHaveURL(/\/pets\/new/);
    actual('"Bạn chưa có hồ sơ thú cưng." with the link "Tạo hồ sơ thú cưng"; the link opens the pet form (UC03).');
  });

  test('TC-UC07-06 A visitor must log in and then continues with the booking', async ({ page, playwright }, info) => {
    const date = bookingDate(info);
    // An owner with a pet is prepared in a separate session, so that the browser starts as a visitor.
    const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:3100' });
    const acc = await registerOwner(ctx);
    expect((await ctx.post('/api/auth/login', { data: { email: acc.email, password: acc.password } })).status()).toBe(200);
    expect((await ctx.post('/api/pets', { data: { name: 'Khách', species: 'Mèo' } })).status()).toBe(201);
    await ctx.dispose();

    await openBooking(page, SPA, /Tắm vệ sinh/, date);
    await page.getByTestId('slot-11:00').click();
    await expect(page.getByText('Bạn cần đăng nhập để đặt lịch.')).toBeVisible();
    await page.getByRole('link', { name: 'Đăng nhập', exact: true }).last().click();
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByLabel('E-mail').fill(acc.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByTestId('booking-summary')).toBeVisible();
    await expect(page.getByTestId('booking-summary')).toContainText('11:00');
    await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
    await expect(page.getByTestId('booking-success')).toContainText('Đặt lịch thành công');
    actual('The visitor is asked to log in; after the login the browser returns to the same facility, service, date and the slot 11:00; the confirmation creates the booking.');
  });

  test('TC-UC07-07 The owner leaves the booking before the confirmation', async ({ page, request }, info) => {
    const date = bookingDate(info);
    const acc = await registerOwner(request);
    await apiLogin(page, acc);
    await createPetApi(page, 'Huỷ');
    await openBooking(page, SPA, /Tắm vệ sinh/, date);
    await page.getByTestId('slot-14:00').click();
    await expect(page.getByTestId('booking-summary')).toBeVisible();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(page.getByTestId('booking-summary')).toHaveCount(0);
    const mine = await (await page.request.get('/api/bookings/mine')).json();
    expect(mine.data.upcoming).toHaveLength(0);
    await expect(page.getByTestId('slot-14:00')).toBeVisible();
    actual('The summary closes; no booking is created; the slot 14:00 is still free.');
  });

  test('TC-UC07-08 Book with a chosen staff member', async ({ page, request }, info) => {
    const date = bookingDate(info);
    const acc = await registerOwner(request);
    await apiLogin(page, acc);
    await createPetApi(page, 'Chọn Người');
    await openBooking(page, SPA, /Tắm vệ sinh/, date);
    await page.getByLabel('Nhân viên (không bắt buộc)').selectOption({ label: 'Võ Quốc Bảo' });
    await page.getByTestId('slot-15:00').click();
    await expect(page.getByTestId('booking-summary')).toContainText('Võ Quốc Bảo');
    await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
    await expect(page.getByTestId('booking-success')).toContainText('Võ Quốc Bảo');
    const mine = await (await page.request.get('/api/bookings/mine')).json();
    expect(mine.data.upcoming[0].staff.name).toBe('Võ Quốc Bảo');
    actual('The booking is created with the chosen staff member "Võ Quốc Bảo" (summary, success message and booking list show this name).');
  });
});

// uiLogin is used by other suites; keep the import referenced.
void uiLogin;
