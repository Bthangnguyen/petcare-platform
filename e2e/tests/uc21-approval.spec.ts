import { test, expect, type Page } from '@playwright/test';
import { apiLogin, registerOwner, uniqueEmail } from './helpers';

const applications = '/api/facility-owner/applications';
const adminApi = '/api/admin/facilities';
const adminPath = '/admin/facilities';
const admin = { email: 'admin@example.com', password: 'Password123' };
const valid = { area: 'Quận 1', phone: '0901234567', openingHours: '08:00–17:00',
  description: 'Hồ sơ kiểm thử duyệt cơ sở.', supportingDocumentRef: 'giay-phep-uc21.pdf' };

async function newOwner(page: Page) {
  const account = { email: uniqueEmail('owner.uc21'), password: 'ReviewTest123' };
  expect((await page.request.post('/api/auth/register', { data: { ...account, passwordConfirmation: account.password,
    accountType: 'FACILITY_OWNER', fullName: 'Chủ cơ sở UC21', phone: '0901234567' } })).status()).toBe(201);
  await apiLogin(page, account);
  return account;
}
async function pending(page: Page, extra: Record<string, unknown> = {}) {
  const account = await newOwner(page);
  const name = uniqueEmail('UC21').split('@')[0]!;
  const response = await page.request.post(applications, { data: { ...valid, name, address: `99 ${name}, Quận 1`, ...extra } });
  expect(response.status()).toBe(201);
  return { account, item: (await response.json()).data };
}
async function openAdmin(page: Page, id: string) {
  await apiLogin(page, admin);
  await page.goto(`${adminPath}/${id}`);
  await expect(page.getByRole('heading', { name: 'Quyết định hồ sơ', exact: true })).toBeVisible();
}

test('UC21: UC12 submit → admin home/list/detail → approve → owner sees approval and notification', async ({ page }, info) => {
  const account = await newOwner(page);
  const name = uniqueEmail('CoSoUC21').split('@')[0]!;
  await page.goto('/facility/applications/new');
  await page.getByLabel('Tên cơ sở *', { exact: true }).fill(name);
  await page.getByLabel('Địa chỉ *', { exact: true }).fill(`99 ${name}, Quận 1`);
  await page.getByLabel('Khu vực *', { exact: true }).fill(valid.area);
  await page.getByLabel('Số điện thoại *', { exact: true }).fill(valid.phone);
  await page.getByLabel('Giờ mở cửa *', { exact: true }).fill(valid.openingHours);
  await page.getByLabel('Tên tệp giấy phép / tài liệu hỗ trợ', { exact: true }).fill(valid.supportingDocumentRef);
  await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
  await expect(page.getByText(/Đã gửi hồ sơ chờ duyệt/)).toBeVisible();
  const item = (await (await page.request.get(applications)).json()).data[0];
  await apiLogin(page, admin);
  await page.goto('/admin');
  await expect(page.getByText(/hồ sơ đang chờ xem xét/)).toBeVisible();
  await page.getByRole('link', { name: 'Xem hồ sơ chờ duyệt', exact: true }).click();
  await page.getByRole('article').filter({ hasText: name }).getByRole('link', { name: 'Xem hồ sơ', exact: true }).click();
  await expect(page.getByText(account.email, { exact: false })).toBeVisible();
  await expect(page.getByText(valid.supportingDocumentRef, { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();
  expect((await (await page.request.get(`${adminApi}/${item.id}`)).json()).data.status).toBe('PENDING_APPROVAL');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('uc21-detail.png'), fullPage: true });
  await page.getByRole('button', { name: 'Xác nhận duyệt', exact: true }).click();
  await expect(page.getByText('Đã duyệt cơ sở và thông báo cho chủ cơ sở.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Về danh sách hồ sơ', exact: true }).click();
  await expect(page.getByRole('heading', { name: name, exact: true })).toHaveCount(0);
  await page.getByLabel('Trạng thái hồ sơ', { exact: true }).selectOption('APPROVED');
  await expect(page.getByRole('article').filter({ hasText: name }).getByText('Đã duyệt', { exact: true })).toBeVisible();
  await apiLogin(page, account);
  await page.goto('/facility/applications');
  await expect(page.getByRole('article').filter({ hasText: name }).getByText('Đã duyệt', { exact: true })).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByText('Cơ sở đã được duyệt', { exact: true })).toBeVisible();
});

test('UC21: reject requires a reason; owner corrects and resubmits; admin approves the new submission', async ({ page }) => {
  const { account, item } = await pending(page);
  await openAdmin(page, item.id);
  await page.getByRole('button', { name: 'Từ chối', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
  await expect(page.getByText('Vui lòng nhập lý do từ chối.', { exact: true })).toBeVisible();
  const note = 'Vui lòng kiểm tra lại địa chỉ cơ sở.';
  await page.getByLabel('Lý do từ chối *', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
  await expect(page.getByText('Đã từ chối hồ sơ và gửi lý do cho chủ cơ sở.', { exact: true })).toBeVisible();
  await apiLogin(page, account);
  await page.goto('/facility/applications');
  const card = page.getByRole('article').filter({ hasText: item.name });
  await expect(card.getByText('Bị từ chối', { exact: true })).toBeVisible();
  await expect(card.getByText(note, { exact: false })).toBeVisible();
  await card.getByRole('link', { name: 'Sửa hồ sơ', exact: true }).click();
  const correctedAddress = `101 ${item.name}, Quận 1`;
  await page.getByLabel('Địa chỉ *', { exact: true }).fill(correctedAddress);
  await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
  await expect(page.getByText(/Đã gửi hồ sơ chờ duyệt/)).toBeVisible();
  await openAdmin(page, item.id);
  await expect(page.getByText(note, { exact: false })).toHaveCount(0);
  await expect(page.getByText(`Địa chỉ: ${correctedAddress}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận duyệt', exact: true }).click();
  await expect(page.getByText('Đã duyệt cơ sở và thông báo cho chủ cơ sở.', { exact: true })).toBeVisible();
});

test('UC21: request information requires a question and the owner sees it and can resubmit', async ({ page }) => {
  const { account, item } = await pending(page);
  await openAdmin(page, item.id);
  await page.getByRole('button', { name: 'Yêu cầu bổ sung', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận yêu cầu bổ sung', exact: true }).click();
  await expect(page.getByText('Vui lòng nhập thông tin cần bổ sung.', { exact: true })).toBeVisible();
  const note = 'Bổ sung tên tệp giấy phép kinh doanh mới.';
  await page.getByLabel('Thông tin cần bổ sung *', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Xác nhận yêu cầu bổ sung', exact: true }).click();
  await expect(page.getByText('Đã gửi yêu cầu bổ sung cho chủ cơ sở.', { exact: true })).toBeVisible();
  await apiLogin(page, account);
  await page.goto('/facility/applications');
  const card = page.getByRole('article').filter({ hasText: item.name });
  await expect(card.getByText('Cần bổ sung thông tin', { exact: true })).toBeVisible();
  await card.getByRole('link', { name: 'Sửa hồ sơ', exact: true }).click();
  await expect(page.getByText(note, { exact: false })).toBeVisible();
  await page.getByLabel('Tên tệp giấy phép / tài liệu hỗ trợ', { exact: true }).fill('giay-phep-bo-sung.pdf');
  await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: item.name }).getByText('Chờ duyệt', { exact: true })).toBeVisible();
});

test('UC21: duplicate-address warning is visible and an explicit approval is still possible', async ({ page }, info) => {
  const catalog = (await (await page.request.get('/api/facilities')).json()).data;
  const spa = catalog.find((item: { name: string }) => item.name === 'Happy Paws Pet Spa');
  const { item } = await pending(page, { address: spa.address.toLocaleUpperCase('vi-VN').replace(/ /g, '  ') });
  await openAdmin(page, item.id);
  await expect(page.getByText('Cảnh báo trùng địa chỉ', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Happy Paws Pet Spa', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('uc21-duplicate.png'), fullPage: true });
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận duyệt', exact: true }).click();
  await expect(page.getByText('Đã duyệt cơ sở và thông báo cho chủ cơ sở.', { exact: true })).toBeVisible();
});

test('UC21: visitors and non-admin users cannot open the pages; draft and unknown applications show no decision form', async ({ page }) => {
  await page.goto(adminPath);
  await expect(page).toHaveURL(/\/login\?next=/);
  const pet = await registerOwner(page.request);
  await apiLogin(page, pet);
  await page.goto(adminPath);
  await expect(page).toHaveURL(/\/$/);
  await newOwner(page);
  const draft = (await (await page.request.post(applications, { data: { name: 'Draft UC21', saveDraft: true } })).json()).data;
  await page.goto(adminPath);
  await expect(page).toHaveURL(/\/facility\/bookings$/);
  await apiLogin(page, admin);
  for (const id of ['unknown', draft.id]) {
    await page.goto(`${adminPath}/${id}`);
    await expect(page.getByText('Không tìm thấy hồ sơ cơ sở đã gửi duyệt.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
  }
});

test('UC21: a stale decision form gets a conflict, blocks retry and reloads the winning decision', async ({ page }) => {
  const { item } = await pending(page);
  await openAdmin(page, item.id);
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();
  expect((await page.request.post(`${adminApi}/${item.id}/decision`, { data: { decision: 'REJECT', note: 'Quyết định từ cửa sổ khác.' } })).status()).toBe(200);
  await page.getByRole('button', { name: 'Xác nhận duyệt', exact: true }).click();
  await expect(page.getByText('Hồ sơ không còn ở trạng thái chờ duyệt. Vui lòng tải lại trước khi quyết định.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận duyệt', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Tải lại hồ sơ', exact: true }).click();
  await expect(page.getByText('Bị từ chối', { exact: true })).toBeVisible();
  await expect(page.getByText('Quyết định từ cửa sổ khác.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
});

test('UC21: a failed network request preserves the reason and can be retried safely', async ({ page }) => {
  const { item } = await pending(page);
  await openAdmin(page, item.id);
  await page.getByRole('button', { name: 'Từ chối', exact: true }).click();
  await page.getByLabel('Lý do từ chối *', { exact: true }).fill('Lý do cần được giữ lại.');
  await page.route('**/api/admin/facilities/*/decision', route => route.abort());
  await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
  await expect(page.getByText('Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng và thử lại.')).toBeVisible();
  await expect(page.getByLabel('Lý do từ chối *', { exact: true })).toHaveValue('Lý do cần được giữ lại.');
  await page.unroute('**/api/admin/facilities/*/decision');
  await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
  await expect(page.getByText('Đã từ chối hồ sơ và gửi lý do cho chủ cơ sở.', { exact: true })).toBeVisible();
});

test('UC21: changing status filters ignores a delayed response from the previous filter', async ({ page }) => {
  await apiLogin(page, admin);
  let release!: () => void;
  let arrived!: () => void;
  let delivered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requested = new Promise<void>(resolve => { arrived = resolve; });
  const drained = new Promise<void>(resolve => { delivered = resolve; });
  await page.route('**/api/admin/facilities?status=PENDING_APPROVAL', async route => {
    const response = await route.fetch();
    arrived();
    await gate;
    await route.fulfill({ response });
    delivered();
  });
  await page.goto(adminPath);
  await requested;
  await page.getByLabel('Trạng thái hồ sơ', { exact: true }).selectOption('APPROVED');
  await expect(page.getByRole('heading', { name: 'Happy Paws Pet Spa', exact: true })).toBeVisible();
  release();
  await drained;
  await expect(page.getByRole('heading', { name: 'Happy Paws Pet Spa', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pet Mới Mở (chờ duyệt)', exact: true })).toHaveCount(0);
});

test('UC21: submitted and decided instants use the Vietnamese date across UTC midnight', async ({ page }) => {
  const { item } = await pending(page);
  await apiLogin(page, admin);
  expect((await page.request.post(`${adminApi}/${item.id}/decision`, { data: { decision: 'APPROVE' } })).status()).toBe(200);
  await page.route(`**/api/admin/facilities/${item.id}`, async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.submittedAt = '2026-11-26T18:30:00.000Z';
    body.data.decidedAt = '2026-11-26T19:00:00.000Z';
    await route.fulfill({ response, json: body });
  });
  await page.goto(`${adminPath}/${item.id}`);
  await expect(page.getByText('Gửi gần nhất: 27/11/2026', { exact: true })).toBeVisible();
  await expect(page.getByText('Ngày quyết định: 27/11/2026', { exact: true })).toBeVisible();
});
