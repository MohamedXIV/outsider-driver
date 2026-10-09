import { defineConfig, devices } from '@playwright/test';

// This test uses Vite's dev server so the experimental Ink compiler and
// portrait atlases never become part of the strict production bundle budgets.
process.env.SPRITE_LAB_DEV = '1';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'sprite-comparison.spec.ts',
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
