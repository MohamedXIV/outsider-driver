import { test, expect } from '@playwright/test';

test('three real sprite candidates share the taxi seat and respond to Ink', async ({ page }, testInfo) => {
  test.skip(process.env.SPRITE_LAB_DEV !== '1' || testInfo.project.name !== 'chromium-desktop',
    'This is a dev-server-only comparison; production browser smoke excludes it.');

  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  const response = await page.goto('/?spriteViewer=1', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBe(true);
  const panel = page.getByRole('complementary', { name: 'Passenger sprite animation comparison' });
  await expect(panel).toBeVisible({ timeout: 30_000 });

  const mode = panel.getByLabel('Animation renderer');
  const memory = panel.locator('.sprite-viewer-metrics');
  await expect(memory).toContainText('transparent planes');
  await expect(memory).toContainText('MiB');

  await mode.selectOption('spritesheet');
  await expect(memory).toContainText('1 transparent planes');
  await mode.selectOption('layered');
  await expect(memory).toContainText('5 transparent planes');
  await mode.selectOption('hybrid');
  await expect(memory).toContainText('3 transparent planes');

  await panel.getByLabel('Expression').selectOption('guarded');
  await panel.getByLabel('Talk intensity').fill('0.8');
  await panel.getByLabel('Look left / right').fill('-0.5');
  await panel.getByLabel('Head direction').fill('0.35');
  await panel.getByLabel('Taxi lighting').selectOption('neon');
  await panel.getByLabel('Camera framing').selectOption('close');
  await panel.getByRole('button', { name: 'Trigger blink' }).click();

  // These are actual authored Ink turns and choices, not a scripted mock conversation.
  await expect(panel.getByText('Customs lights sweep every cab after midnight.')).toBeVisible();
  await panel.getByRole('button', { name: 'Act like this is routine.' }).click();
  await expect(panel.getByText('Keep moving.')).toBeVisible();
  await panel.getByRole('button', { name: 'Restart Ink dialogue' }).click();
  await expect(panel.getByRole('button', { name: 'Ask why.' })).toBeVisible();

  await panel.getByRole('button', { name: '✕ Close' }).click();
  await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: 'Open sprite passenger comparison' }).click();
  await expect(panel).toBeVisible();
  expect(errors).toEqual([]);
});
