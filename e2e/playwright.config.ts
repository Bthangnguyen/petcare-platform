import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Functional tests of Pet Care Platform (UC02 Log in, UC03 Manage pet profile, UC07 Book appointment).
 * The configuration starts two application servers with fresh databases: port 3100 (normal) and port 3101
 * (session idle time of 3 seconds, for the test of the session expiry of UC02, A4).
 * Browsers: Chromium, Google Chrome, Microsoft Edge and a mobile viewport of 360 px (NFR-01).
 */
const stamp = Date.now();
const backend = path.resolve(__dirname, '../backend');
const tmp = path.resolve(__dirname, '.tmp');

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'results/results.json' }], ['html', { open: 'never', outputFolder: 'results/html' }]],
  outputDir: 'results/artifacts',
  use: { baseURL: 'http://localhost:3100', screenshot: 'only-on-failure', trace: 'off', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' },
  webServer: [
    {
      command: 'npm start',
      cwd: backend,
      port: 3100,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { PORT: '3100', DB_FILE: path.join(tmp, `e2e-${stamp}.db`) },
    },
    {
      command: 'npm start',
      cwd: backend,
      port: 3101,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { PORT: '3101', DB_FILE: path.join(tmp, `e2e-short-${stamp}.db`), SESSION_IDLE_SECONDS: '3' },
    },
  ],
  projects: [
    { name: 'chromium', testIgnore: /screens\.spec/, use: { ...devices['Desktop Chrome'] } },
    { name: 'chrome', testIgnore: /screens\.spec/, use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', testIgnore: /screens\.spec/, use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'mobile-360', testIgnore: /screens\.spec/, use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
    { name: 'screens', testMatch: /screens\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
});
