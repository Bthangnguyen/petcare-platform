import { test, expect, type Page } from '@playwright/test';
import { apiLogin, registerOwner, uniqueEmail } from './helpers';

const endpoint = '/api/facility-owner/applications';
const listPath = '/facility/applications';
const valid = { name: 'Cơ sở UC12', address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', area: 'Quận 1',
  phone: '0901234567', openingHours: '08:00–17:00, thứ Hai đến thứ Bảy', description: 'Chăm sóc thú cưng.', supportingDocumentRef: 'giay-phep.pdf' };

async function owner(page: Page) {
  const account = { email: uniqueEmail('facility.uc12'), password: 'ReviewTest123' };
  const response = await page.request.post('/api/auth/register', { data: { ...account, passwordConfirmation: account.password,
    accountType: 'FACILITY_OWNER', fullName: 'Chủ cơ sở kiểm thử', phone: '0901234567' } });
  expect(response.status()).toBe(201);
  await apiLogin(page, account);
  return account;
}

async function fill(page: Page, name = valid.name) {
  await page.getByLabel('Tên cơ sở *', { exact: true }).fill(name);
  await page.getByLabel('Địa chỉ *', { exact: true }).fill(valid.address);
  await page.getByLabel('Khu vực *', { exact: true }).fill(valid.area);
  await page.getByLabel('Số điện thoại *', { exact: true }).fill(valid.phone);
  await page.getByLabel('Giờ mở cửa *', { exact: true }).fill(valid.openingHours);
  await page.getByLabel('Mô tả cơ sở', { exact: true }).fill(valid.description);
  await page.getByLabel('Tên tệp giấy phép / tài liệu hỗ trợ', { exact: true }).fill(valid.supportingDocumentRef);
}

test('UC12: save an incomplete draft, reopen, validate and submit; administrator receives a notice', async ({ page, browser }, info) => {
  await owner(page);
  await page.goto(listPath);
  await expect(page.getByText('Bạn chưa đăng ký cơ sở nào. Tạo hồ sơ mới hoặc lưu nháp để hoàn thiện sau.')).toBeVisible();
  await page.getByRole('link', { name: 'Đăng ký cơ sở mới' }).click();
  const name = `Cơ sở nháp ${info.project.name}`;
  await page.getByLabel('Tên cơ sở *', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await expect(page.getByText('Đã lưu bản nháp. Bạn có thể tiếp tục chỉnh sửa sau.')).toBeVisible();
  let card = page.getByRole('article').filter({ hasText: name });
  await expect(card.getByText('Bản nháp', { exact: true })).toBeVisible();
  await card.getByRole('link', { name: 'Sửa hồ sơ' }).click();
  await expect(page.getByLabel('Tên cơ sở *', { exact: true })).toHaveValue(name);
  await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
  await expect(page.getByText('Vui lòng nhập địa chỉ.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Tên cơ sở *', { exact: true })).toHaveValue(name);
  await fill(page, name);
  await expect(page.getByText('Vui lòng nhập địa chỉ.', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('uc12-form.png'), fullPage: true });
  await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
  await expect(page.getByText(/Đã gửi hồ sơ chờ duyệt/)).toBeVisible();
  card = page.getByRole('article').filter({ hasText: name });
  await expect(card.getByText('Chờ duyệt', { exact: true })).toBeVisible();
  const items = (await (await page.request.get(endpoint)).json()).data;
  expect(items).toHaveLength(1);
  const item = items[0];
  const admin = await browser.newContext();
  try {
    expect((await admin.request.post('http://localhost:3100/api/auth/login', {
      data: { email: 'admin@example.com', password: 'Password123' },
    })).status()).toBe(200);
    const inbox = (await (await admin.request.get('http://localhost:3100/api/notifications')).json()).data;
    expect(inbox.items.some((notice: { referenceId: string }) => notice.referenceId === item.id)).toBe(true);
  } finally { await admin.close(); }
  await card.getByRole('link', { name: 'Xem hồ sơ' }).click();
  await expect(page.getByLabel('Tên cơ sở *', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Gửi duyệt', exact: true })).toHaveCount(0);
});

test('UC12: submit a new application directly and prevent a second click while saving', async ({ page }) => {
  await owner(page);
  await page.goto(`${listPath}/new`);
  await fill(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/facility-owner/applications', async route => {
    if (route.request().method() === 'POST') await gate;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Lưu nháp', exact: true })).toBeDisabled();
  release();
  await expect(page).toHaveURL(new RegExp(`${listPath}$`));
  await expect(page.getByRole('article').getByText('Chờ duyệt', { exact: true })).toBeVisible();
  expect((await (await page.request.get(endpoint)).json()).data).toHaveLength(1);
});

test('UC12: owners see decision feedback and editable forms for rejected or needs-information demo applications', async ({ page }, info) => {
  for (const [email, status, label] of [
    ['lan.fo@example.com', 'NEEDS_INFORMATION', 'Cần bổ sung thông tin'],
    ['hung.fo@example.com', 'REJECTED', 'Bị từ chối'],
  ]) {
    await apiLogin(page, { email: email!, password: 'Password123' });
    const items = (await (await page.request.get(endpoint)).json()).data;
    const item = items.find((entry: { status: string }) => entry.status === status);
    expect(item).toBeTruthy();
    await page.goto(listPath);
    const card = page.getByRole('article').filter({ hasText: item.name });
    await expect(card.getByText(label!, { exact: true })).toBeVisible();
    await expect(card.getByText(item.decisionNote, { exact: false })).toBeVisible();
    await card.getByRole('link', { name: 'Sửa hồ sơ' }).click();
    await expect(page.getByText(item.decisionNote, { exact: false })).toBeVisible();
    await expect(page.getByLabel('Tên cơ sở *', { exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Gửi duyệt', exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`uc12-${status}.png`), fullPage: true });
  }
});

test('UC12: visitors and pet owners cannot open registration; another facility owner cannot load a private application', async ({ page }) => {
  await page.goto(`${listPath}/new`);
  await expect(page).toHaveURL(/\/login\?next=/);
  const petOwner = await registerOwner(page.request);
  await apiLogin(page, petOwner);
  await page.goto(`${listPath}/new`);
  await expect(page).toHaveURL(/\/$/);
  await owner(page);
  const item = (await (await page.request.post(endpoint, { data: { name: 'Riêng tư', saveDraft: true } })).json()).data;
  await owner(page);
  await page.goto(`${listPath}/${item.id}/edit`);
  await expect(page.getByText('Không tìm thấy hồ sơ cơ sở.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gửi duyệt', exact: true })).toHaveCount(0);
});

test('UC12: network failure preserves entered data; retry can submit successfully', async ({ page }) => {
  await owner(page);
  await page.goto(`${listPath}/new`);
  await fill(page);
  await page.route('**/api/facility-owner/applications', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
  await expect(page.getByText('Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng và thử lại.')).toBeVisible();
  await expect(page.getByLabel('Tên cơ sở *', { exact: true })).toHaveValue(valid.name);
  await page.unroute('**/api/facility-owner/applications');
  await page.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
  await expect(page.getByText(/Đã gửi hồ sơ chờ duyệt/)).toBeVisible();
});

test('UC12: submitting a stale edit form does not overwrite an application already sent from another tab', async ({ page }) => {
  await owner(page);
  const item = (await (await page.request.post(endpoint, { data: { name: 'Bản nháp', saveDraft: true } })).json()).data;
  await page.goto(`${listPath}/${item.id}/edit`);
  await expect(page.getByLabel('Tên cơ sở *', { exact: true })).toHaveValue('Bản nháp');
  await fill(page, 'Chỉnh sửa chưa lưu');
  expect((await page.request.put(`${endpoint}/${item.id}`, { data: valid })).status()).toBe(200);
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await expect(page.getByText('Hồ sơ đang chờ duyệt hoặc đã được duyệt, không thể chỉnh sửa.', { exact: true })).toBeVisible();
  const stored = (await (await page.request.get(`${endpoint}/${item.id}`)).json()).data;
  expect(stored.status).toBe('PENDING_APPROVAL');
  expect(stored.name).toBe(valid.name);
});
