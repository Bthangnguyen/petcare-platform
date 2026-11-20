import { expect, test } from '@playwright/test';
import { PASSWORD, actual, apiLogin, registerOwner, uiLogin, uniqueEmail } from './helpers';

/** UC02 Log in – test cases TC-UC02-01 to TC-UC02-08. */
test.describe('UC02 Log in', () => {
  test('TC-UC02-01 Log in with a correct e-mail and password', async ({ page, request }) => {
    const acc = await registerOwner(request);
    await uiLogin(page, acc.email, acc.password);
    await expect(page.getByRole('heading', { name: `Xin chào, ${acc.fullName}` })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
    actual(`The home page of the pet owner shows "Xin chào, ${acc.fullName}"; the menu shows the user name and the button "Đăng xuất".`);
  });

  test('TC-UC02-02 Log in with a wrong password', async ({ page, request }) => {
    const acc = await registerOwner(request);
    await uiLogin(page, acc.email, 'SaiMatKhau99');
    const alert = page.getByRole('alert');
    await expect(alert).toHaveText('E-mail hoặc mật khẩu không đúng.');
    await expect(page).toHaveURL(/\/login/);
    actual(`Stays on the login page with the general message "${await alert.innerText()}" (it does not say whether the e-mail or the password is wrong).`);
  });

  test('TC-UC02-03 Log in with an e-mail that is not registered', async ({ page }) => {
    await uiLogin(page, uniqueEmail('nobody'), PASSWORD);
    const alert = page.getByRole('alert');
    await expect(alert).toHaveText('E-mail hoặc mật khẩu không đúng.');
    actual(`Same general message as for a wrong password: "${await alert.innerText()}"; the system does not reveal whether the e-mail exists.`);
  });

  test('TC-UC02-04 Log in with blank e-mail and password', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByText('Vui lòng nhập e-mail.')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập mật khẩu.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    actual('No login; both fields are marked: "Vui lòng nhập e-mail." and "Vui lòng nhập mật khẩu."');
  });

  test('TC-UC02-05 The account is blocked after 5 wrong passwords', async ({ page, request }) => {
    const acc = await registerOwner(request);
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(acc.email);
    for (let i = 1; i <= 5; i++) {
      await page.getByLabel('Mật khẩu', { exact: true }).fill(`Sai${i}Matkhau`);
      await page.getByRole('button', { name: 'Đăng nhập' }).click();
      if (i < 5) await expect(page.getByRole('alert')).toHaveText('E-mail hoặc mật khẩu không đúng.');
    }
    await expect(page.getByRole('alert')).toContainText('khóa 15 phút');
    const blocked = await page.getByRole('alert').innerText();
    // Even the correct password is refused while the account is blocked.
    await page.getByLabel('Mật khẩu', { exact: true }).fill(acc.password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByRole('alert')).toContainText('tạm thời bị khóa');
    await expect(page).toHaveURL(/\/login/);
    actual(`After the 5th failure: "${blocked}". The correct password is also refused while the account is blocked: "${await page.getByRole('alert').innerText()}"`);
  });

  test('TC-UC02-06 Log out; protected pages are closed afterwards', async ({ page, request }) => {
    const acc = await registerOwner(request);
    await apiLogin(page, acc);
    await page.goto('/');
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/pets');
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    actual('After "Đăng xuất" the login page is shown; opening /pets redirects to the login page (with the message that a login is needed).');
  });

  test('TC-UC02-07 The session ends after 30 minutes without activity', async ({ page, request }) => {
    // The second test server uses an idle time of 3 seconds instead of 30 minutes (same code, configuration SESSION_IDLE_SECONDS).
    const base = 'http://localhost:3101';
    const email = uniqueEmail('idle');
    const reg = await request.post(`${base}/api/auth/register`, {
      data: { accountType: 'PET_OWNER', fullName: 'Chủ Hết Hạn', email, phone: '0912345678', password: PASSWORD, passwordConfirmation: PASSWORD },
    });
    expect(reg.status()).toBe(201);
    await page.goto(`${base}/login`);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByRole('heading', { name: /Xin chào/ })).toBeVisible();
    await page.waitForTimeout(4500);
    await page.goto(`${base}/pets`);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByText('Phiên đăng nhập đã hết hạn')).toBeVisible();
    actual('After the idle time (3 seconds on the test server, 30 minutes by default) /pets redirects to the login page with the message "Phiên đăng nhập đã hết hạn."');
  });

  test('TC-UC02-08 A facility owner gets the home page of the role', async ({ page }) => {
    await uiLogin(page, 'lan.fo@example.com', 'Password123'); // password of the demo accounts
    await expect(page).toHaveURL(/\/facility\/bookings/);
    await expect(page.getByRole('heading', { name: 'Lịch hẹn của cơ sở' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Thú cưng', exact: true })).toHaveCount(0);
    actual('The facility owner is redirected to "Lịch hẹn của cơ sở"; the menu has no "Thú cưng" item of the pet owner.');
  });
});
