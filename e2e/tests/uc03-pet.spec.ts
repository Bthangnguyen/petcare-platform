import { expect, test } from '@playwright/test';
import { actual, apiLogin, createPetApi, registerOwner } from './helpers';

let n = 0;
/** A 15-digit microchip number that is unique in the test run. */
const microchip = () => `90${String(Date.now()).slice(-9)}${String(++n).padStart(4, '0')}`;

/** UC03 Manage pet profile – test cases TC-UC03-01 to TC-UC03-08. */
test.describe('UC03 Manage pet profile', () => {
  test.beforeEach(async ({ page, request }) => {
    const acc = await registerOwner(request);
    await apiLogin(page, acc);
  });

  test('TC-UC03-01 Add a pet with valid data; the profile gets a QR code', async ({ page }) => {
    await page.goto('/pets/new');
    await page.getByLabel('Tên thú cưng').fill('Bông');
    await page.getByLabel('Giống').fill('Corgi');
    await page.getByLabel('Giới tính').selectOption('Cái');
    await page.getByLabel('Ngày sinh').fill('2024-05-01');
    await page.getByLabel('Số microchip').fill(microchip());
    await page.getByLabel('Dị ứng').fill('hải sản, thịt gà');
    await page.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByRole('heading', { name: 'Bông' })).toBeVisible();
    const qr = page.getByRole('img', { name: 'Mã QR của Bông' });
    await expect(qr).toBeVisible();
    await expect.poll(async () => qr.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByText('hải sản, thịt gà')).toBeVisible();
    actual('The profile "Bông" is created and shown: breed Corgi, birth date 01/05/2024, allergies "hải sản, thịt gà"; the QR code image is displayed.');
  });

  test('TC-UC03-02 Add a pet without a name', async ({ page }) => {
    await page.goto('/pets/new');
    await page.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByText('Vui lòng nhập tên thú cưng.')).toBeVisible();
    await expect(page).toHaveURL(/\/pets\/new/);
    const list = await (await page.request.get('/api/pets')).json();
    expect(list.data).toHaveLength(0);
    actual('No profile is created; the name field shows "Vui lòng nhập tên thú cưng."; the pet list stays empty.');
  });

  test('TC-UC03-03 Add a pet with a birth date in the future', async ({ page }) => {
    await page.goto('/pets/new');
    await page.getByLabel('Tên thú cưng').fill('Tương Lai');
    await page.getByLabel('Ngày sinh').fill('2030-01-01');
    await page.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByText('Ngày sinh không được ở tương lai.')).toBeVisible();
    await expect(page).toHaveURL(/\/pets\/new/);
    actual('Not saved; message "Ngày sinh không được ở tương lai." and the form stays open for correction.');
  });

  test('TC-UC03-04 Add a pet with a microchip number that is already used', async ({ page }) => {
    const chip = microchip();
    await createPetApi(page, 'Chó Một', { microchipNumber: chip });
    await page.goto('/pets/new');
    await page.getByLabel('Tên thú cưng').fill('Chó Hai');
    await page.getByLabel('Số microchip').fill(chip);
    await page.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByText('Số microchip này đã được dùng cho một thú cưng khác.')).toBeVisible();
    const list = await (await page.request.get('/api/pets')).json();
    expect(list.data).toHaveLength(1);
    actual('The second profile is not created; message "Số microchip này đã được dùng cho một thú cưng khác."');
  });

  test('TC-UC03-05 Edit a pet profile', async ({ page }) => {
    const pet = await createPetApi(page, 'Mực', { breed: 'Poodle' });
    await page.goto(`/pets/${pet.id}/edit`);
    await expect(page.getByLabel('Tên thú cưng')).toHaveValue('Mực');
    await page.getByLabel('Tên thú cưng').fill('Mực Mực');
    await page.getByLabel('Giống').fill('Husky');
    await page.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByRole('heading', { name: 'Mực Mực' })).toBeVisible();
    await expect(page.getByText('Husky')).toBeVisible();
    actual('The form shows the old data; after saving, the profile shows the name "Mực Mực" and the breed "Husky".');
  });

  test('TC-UC03-06 Add a weight record', async ({ page }) => {
    const pet = await createPetApi(page, 'Nặng');
    await page.goto(`/pets/${pet.id}`);
    await page.getByLabel('Cân nặng (kg)').fill('7.5');
    await page.getByRole('button', { name: 'Thêm cân nặng' }).click();
    await expect(page.getByRole('cell', { name: '7.5 kg' })).toBeVisible();
    actual('The weight history has a new row "7.5 kg" with today\'s date.');
  });

  test('TC-UC03-07 Add a vaccination record manually', async ({ page }) => {
    const pet = await createPetApi(page, 'Tiêm');
    await page.goto(`/pets/${pet.id}`);
    await page.getByLabel('Tên vắc-xin').fill('Vắc-xin dại');
    await page.getByLabel('Ngày tiêm nhắc').fill('2027-11-14');
    await page.getByRole('button', { name: 'Thêm tiêm phòng' }).click();
    await expect(page.getByRole('cell', { name: 'Vắc-xin dại' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '14/11/2027' })).toBeVisible();
    actual('The vaccination table has a row "Vắc-xin dại" with the revaccination date 14/11/2027.');
  });

  test('TC-UC03-08 Archive a pet', async ({ page }) => {
    await createPetApi(page, 'Lưu Trữ');
    await page.goto('/pets');
    await expect(page.getByRole('heading', { name: 'Lưu Trữ' })).toBeVisible();
    await page.getByRole('button', { name: 'Lưu trữ' }).click();
    await expect(page.getByText('Lưu trữ hồ sơ này?')).toBeVisible();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByRole('heading', { name: 'Lưu Trữ' })).toHaveCount(0);
    await expect(page.getByText('Bạn chưa có hồ sơ thú cưng nào')).toBeVisible();
    actual('The system asks for confirmation; after the confirmation the profile disappears from the list (it is archived, the data are kept).');
  });
});
