import { expect, test } from '@playwright/test';
import { uiLogin } from './helpers';

/**
 * Foundation of Sprint 5: the roles STAFF and SYSTEM_ADMINISTRATOR have a home page, the menus of the roles show the new
 * entries and the routes of the new use cases exist (the pages are placeholders until the use cases are built).
 * The titles do not start with "TC-" because these are not cases of the test-case workbook.
 */
const DEMO_PASSWORD = 'Password123';

test('Sprint 5: the administrator lands on the administrator page', async ({ page }) => {
  await uiLogin(page, 'admin@example.com', DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('link', { name: 'Duyệt cơ sở' })).toBeVisible();
});

test('Sprint 5: a staff member lands on the page of the staff', async ({ page }) => {
  await uiLogin(page, 'hang.staff@example.com', DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByRole('heading', { name: 'Công việc của nhân viên' })).toBeVisible();
});

test('Sprint 5: the menu of a facility owner has the entries of the new use cases', async ({ page }) => {
  await uiLogin(page, 'lan.fo@example.com', DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/facility\/bookings$/);
  for (const name of ['Đăng ký cơ sở', 'Dịch vụ', 'Nhân viên']) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  }
});

test('Sprint 5: the login page links to the password reset page', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Quên mật khẩu?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('heading', { name: 'Quên mật khẩu' })).toBeVisible();
});

test('Sprint 5: a pet owner cannot open the pages of the administrator', async ({ page }) => {
  await uiLogin(page, 'an.owner@example.com', DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/admin/facilities');
  await expect(page).toHaveURL(/\/$/);
});
