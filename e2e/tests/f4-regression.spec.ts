import { expect, test } from '@playwright/test';
import { apiLogin, bookingDate, createPetApi, facilityId, registerOwner } from './helpers';

test.beforeEach(async ({ page, request }, info) => {
  await apiLogin(page, await registerOwner(request));
  await createPetApi(page, 'F4 regression');
  await page.goto(`/facilities/${await facilityId(page, 'Happy Paws Pet Spa')}`);
  await page.getByLabel(/Tắm vệ sinh/).check();
  await page.getByLabel('3. Chọn ngày').fill(bookingDate(info));
  await page.getByTestId('slot-16:00').click();
  await expect(page.getByTestId('booking-summary')).toBeVisible();
});

test('F4 changing staff requires choosing a slot again', async ({ page }) => {
  await page.getByLabel('Nhân viên (không bắt buộc)').selectOption({ label: 'Võ Quốc Bảo' });
  await expect(page.getByTestId('booking-summary')).toHaveCount(0);
  await page.getByTestId('slot-16:00').click();
  await expect(page.getByTestId('booking-summary')).toContainText('Võ Quốc Bảo');
});

test('F4 changing date hides stale slots while availability is loading', async ({ page }, info) => {
  const date = bookingDate(info);
  const next = new Date(`${date}T12:00:00+07:00`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDate = next.toISOString().slice(0, 10);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/availability?*date=${nextDate}`, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.getByLabel('3. Chọn ngày').fill(nextDate);
    await expect(page.getByTestId('booking-summary')).toHaveCount(0);
    await expect(page.getByTestId('slot-16:00')).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
