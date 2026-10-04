import { expect, test } from '@playwright/test';

test('production build boots a Babylon game surface without browser errors', async ({ page }) => {
  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(`console: ${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    browserErrors.push(`page: ${error.message}`);
  });

  const response = await page.goto('/', { waitUntil: 'networkidle' });

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle('Outsider Driver');

  const gameCanvas = page.getByRole('application', {
    name: 'Outsider Driver game view',
  });

  await expect(gameCanvas).toBeVisible();

  await expect
    .poll(async () =>
      gameCanvas.evaluate((element) => {
        if (!(element instanceof HTMLCanvasElement)) {
          return false;
        }

        return element.width > 0 && element.height > 0;
      }),
    )
    .toBe(true);

  expect(browserErrors).toEqual([]);
});
