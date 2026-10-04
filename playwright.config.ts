import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  ...(isCi ? { workers: 1 } : {}),
  reporter: isCi ? 'line' : 'html',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: baseURL,
    reuseExistingServer: !isCi,
    timeout: 30_000,
  },
});
