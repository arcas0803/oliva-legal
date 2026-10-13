import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4377', headless: true, channel: 'chrome' },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4377',
    reuseExistingServer: true,
  },
  reporter: 'list',
});
