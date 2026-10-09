import { test, expect } from '@playwright/test';

test('three real sprite candidates share the taxi seat and respond to Ink', async ({ page }, testInfo) => {
  // SwiftShader/software-rendered CI needs longer for real 3D redraws; gameplay
  // frame-time and production startup budgets are not modified by this test.
  test.setTimeout(120_000);
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
  await page.screenshot({ path: testInfo.outputPath('spritesheet.png') });
  await mode.selectOption('layered');
  await expect(memory).toContainText('5 transparent planes');
  await page.screenshot({ path: testInfo.outputPath('layered.png') });
  await mode.selectOption('hybrid');
  await expect(memory).toContainText('3 transparent planes');
  await page.screenshot({ path: testInfo.outputPath('hybrid.png') });

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


test('source-derived mint elf images load and switch between honest cutout modes', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(process.env.SPRITE_LAB_DEV !== '1' || testInfo.project.name !== 'chromium-desktop',
    'Source art evaluation requires the Vite development server.');

  const pageErrors: string[] = [];
  page.on('pageerror', error => { pageErrors.push(error.message); });
  const response = await page.goto('/?spriteViewer=1', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBe(true);

  // These files have now actually been uploaded to the PR branch; do not
  // mistake an HTTP 404 SPA fallback or stale generated vector art for them.
  for (const name of ['portrait', 'head', 'torso', 'antenna-right']) {
    const asset = await page.request.get('/passengers/mint-elf/' + name + '.webp');
    expect(asset.status()).toBe(200);
    expect(asset.headers()['content-type']).toContain('image/webp');
  }

  const panel = page.getByRole('complementary', { name: 'Passenger sprite animation comparison' });
  await expect(panel).toBeVisible({ timeout: 30_000 });
  await panel.getByLabel('Passenger art').selectOption('mint-elf');
  const loaded = panel.locator('.sprite-viewer-asset-status');
  await expect(loaded).toHaveText('Mint elf artwork loaded', { timeout: 45_000 });

  const spriteShader = panel.getByLabel('Sprite shader');
  const brightness = panel.getByLabel('Sprite brightness');
  await expect(spriteShader).toHaveValue('lit');
  await expect(brightness).toHaveValue('1');
  await spriteShader.selectOption('unlit');
  await brightness.fill('1.75');
  await expect(spriteShader).toHaveValue('unlit');
  await expect(brightness).toHaveValue('1.75');
  await panel.getByLabel('Taxi lighting').selectOption('dim');
  // Cabin lighting and sprite exposure are independent controls.
  await expect(brightness).toHaveValue('1.75');

  // The face is not independently rigged: disabled controls must be honest.
  await expect(panel.getByLabel('Expression')).toBeDisabled();
  await expect(panel.getByLabel('Talk intensity')).toBeDisabled();
  await expect(panel.getByLabel('Look left / right')).toBeDisabled();
  await expect(panel.getByRole('button', { name: 'Trigger blink' })).toBeDisabled();
  await expect(panel.getByText(/Only gentle body\/head\/antenna motion works/)).toBeVisible();

  const mode = panel.getByLabel('Animation renderer');
  const metrics = panel.locator('.sprite-viewer-metrics');
  await mode.selectOption('spritesheet');
  await expect(metrics).toContainText('1 transparent planes');
  await page.screenshot({ path: testInfo.outputPath('mint-elf-spritesheet.png') });
  await mode.selectOption('layered');
  await expect(metrics).toContainText('3 transparent planes');
  await panel.getByLabel('Head direction').fill('0.35');
  await page.screenshot({ path: testInfo.outputPath('mint-elf-layered.png') });
  await mode.selectOption('hybrid');
  await expect(metrics).toContainText('2 transparent planes');
  await page.screenshot({ path: testInfo.outputPath('mint-elf-hybrid.png') });
  await spriteShader.selectOption('lit');
  await brightness.fill('1');
  await expect(spriteShader).toHaveValue('lit');

  // The same Ink hooks continue driving the shared performance contract.
  await expect(panel.getByText('Passenger: Customs lights sweep every cab after midnight.')).toBeVisible();
  await panel.getByRole('button', { name: 'Ask why.' }).click();
  await expect(panel.getByText('Driver: Why the sweep?')).toBeVisible();
  await expect(panel.getByText('Passenger: Keep moving.')).toBeVisible();
  expect(pageErrors).toEqual([]);
});


test('Painterly/Cel world preset compiles and restores while sprite tint stays independent', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(process.env.SPRITE_LAB_DEV !== '1' || testInfo.project.name !== 'chromium-desktop',
    'Experimental Babylon shader only runs in the dedicated dev-server lab.');

  const pageErrors: string[] = [];
  page.on('pageerror', error => { pageErrors.push(error.message); });
  page.on('console', message => {
    if (message.type() === 'error' &&
        /shader|effect compilation|unable to compile/i.test(message.text())) {
      pageErrors.push(message.text());
    }
  });

  await page.goto('/?spriteViewer=1', { waitUntil: 'domcontentloaded' });
  const panel = page.getByRole('complementary', { name: 'Passenger sprite animation comparison' });
  await expect(panel).toBeVisible({ timeout: 30_000 });

  const style = panel.getByLabel('World style');
  const worldStatus = panel.locator('.sprite-viewer-world-status');
  await expect(style).toHaveValue('default');
  await expect(worldStatus).toHaveText('Original taxi lighting');
  await page.screenshot({ path: testInfo.outputPath('taxi-world-default.png') });

  await style.selectOption('hybrid');
  await expect(worldStatus).toContainText(/Hybrid lighting on [1-9][0-9]* taxi materials/);
  await panel.getByLabel('Toon steps').selectOption('2');
  await panel.getByLabel('World ambient floor').fill('0.35');
  await panel.getByLabel('Band softness').fill('0.1');
  await panel.getByLabel('World rim light').fill('0.2');

  await panel.getByLabel('Passenger art').selectOption('mint-elf');
  await expect(panel.locator('.sprite-viewer-asset-status'))
    .toHaveText('Mint elf artwork loaded', { timeout: 45_000 });
  await panel.getByLabel('Sprite shader').selectOption('unlit');
  await panel.getByLabel('Sprite brightness').fill('1.4');
  await panel.getByLabel('Sprite light tint').fill('0.7');
  await panel.getByLabel('Taxi lighting').selectOption('neon');
  await expect(panel.getByLabel('Sprite light tint')).toHaveValue('0.7');
  await page.screenshot({ path: testInfo.outputPath('taxi-world-hybrid.png') });

  // Reversible grounding and hand-painted cabin materials, including the
  // source-derived (not per-layer) alpha-ink edge.
  for (const name of ['paint', 'upholstery']) {
    const url = '/taxi/lab-painterly-' + name + '.svg';
    const asset = await page.request.get(url);
    expect(asset.status()).toBe(200);
    expect(asset.headers()['content-type']).toContain('image/svg+xml');
  }
  await panel.getByLabel('Taxi surfaces').selectOption('painted');
  await panel.getByLabel('Contact shadow').fill('0.55');
  await panel.getByLabel('Silhouette ink width').selectOption('2');
  await panel.getByLabel('Ink opacity').fill('0.5');
  await expect(panel.getByLabel('Taxi surfaces')).toHaveValue('painted');
  await expect(panel.getByLabel('Contact shadow')).toHaveValue('0.55');
  await expect(panel.getByLabel('Silhouette ink width')).toHaveValue('2');
  // Let the source portrait decode and its outline atlas rasterize once.
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath('taxi-painterly-grounded-mint-elf.png') });

  await panel.getByLabel('Silhouette ink width').selectOption('0');
  await panel.getByLabel('Contact shadow').fill('0');
  await panel.getByLabel('Taxi surfaces').selectOption('original');
  await style.selectOption('default');
  await expect(panel.getByLabel('Taxi surfaces')).toHaveValue('original');
  await expect(panel.getByLabel('Contact shadow')).toHaveValue('0');
  await expect(panel.getByLabel('Silhouette ink width')).toHaveValue('0');
  await page.screenshot({ path: testInfo.outputPath('taxi-original-mint-elf.png') });

  await style.selectOption('default');
  await expect(worldStatus).toHaveText('Original taxi lighting');
  await panel.getByRole('button', { name: '✕ Close' }).click();
  await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: 'Open sprite passenger comparison' }).click();
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel('World style')).toHaveValue('default');
  expect(pageErrors).toEqual([]);
});
