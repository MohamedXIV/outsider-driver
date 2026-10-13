import { expect, test } from '@playwright/test';

test('new shift navigates through home, garage and taxi using real persisted state', async ({
  page,
}, testInfo) => {
  // An actual complete shift with multiple full GPU scene transitions, three
  // reloads, dialogue, checkpoint, settlement and dozens of real UI actions.
  // Canonical compact Chromium run 37876465623 exhausted the 30s whole-test
  // deadline in the middle of the ride. Keep all per-action assertions and
  // never raise the independent 5s production startup budget.
  test.setTimeout(120_000);

  test.skip(
    testInfo.project.name === 'firefox-desktop',
    'Firefox may show the existing supported-browser fallback rather than a Babylon scene.',
  );

  await page.goto('/', { waitUntil: 'networkidle' });

  const controls = page.getByRole('region', {
    name: 'Shift navigation and dispatch',
  });
  await expect(controls).toBeVisible();
  await expect(controls.locator('.shift-controls-status')).toContainText('HOME');

  await controls.getByRole('button', { name: 'Go to garage' }).click();
  await expect(controls.locator('.shift-controls-status')).toContainText('GARAGE');

  await controls.getByRole('button', { name: 'Turn inspection light on' }).click();
  await expect(
    controls.getByRole('button', { name: 'Turn inspection light off' }),
  ).toBeVisible();

  // The ordinary player route must persist place/flags without ?spaceProbe.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(controls.locator('.shift-controls-status')).toContainText('GARAGE');
  await expect(
    controls.getByRole('button', { name: 'Turn inspection light off' }),
  ).toBeVisible();

  await controls.getByRole('button', { name: 'Enter taxi' }).click();
  await expect(controls.locator('.shift-controls-status')).toContainText('TAXI');

  await controls.locator('.shift-work-board summary').click();
  await expect(controls.getByText('Backchannel Rider')).toBeVisible();
  await expect(controls.getByText('Clinic Dispatcher')).toBeVisible();
  await expect(controls.getByText(/missing credential: work-permit/)).toBeVisible();

  const eligibleJob = controls.locator('.shift-work-item[data-eligibility="eligible"]');
  await expect(eligibleJob).toHaveCount(1);
  await eligibleJob.getByRole('button', { name: 'Inspect offer' }).click();
  await expect(eligibleJob.getByText(/Route:/)).toBeVisible();
  await eligibleJob.getByRole('button', { name: 'Accept job' }).click();
  await expect(controls.getByText(/ASSIGNED \/ job:docks-underground-clinic/))
    .toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(controls.getByText(/ASSIGNED \/ job:docks-underground-clinic/))
    .toBeVisible();

  await controls.getByRole('button', { name: 'Pick up passenger' }).click();
  await expect(controls.getByRole('alert'))
    .toContainText(/Register your driver identity/);

  await controls.getByLabel('DRIVER ALIAS / COVER').fill('Night Driver');
  await controls.getByRole('button', { name: 'Register driver' }).click();
  await controls.getByRole('button', { name: 'Pick up passenger' }).click();
  await expect(controls.getByText(/Customs lights sweep every cab/)).toBeVisible();
  await controls.getByRole('button', { name: 'Ask why.' }).click();
  await expect(controls.getByText(/Keep moving/)).toBeVisible();

  await controls.getByRole('button', { name: 'Advance autopilot' }).click();
  await expect(controls.getByText('Checkpoint: customs-light')).toBeVisible();
  await expect(controls.locator('.shift-controls-status')).toContainText('18:05');

  // A paused checkpoint and its world time survive reload.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(controls.getByText('Checkpoint: customs-light')).toBeVisible();
  await controls.getByRole('button', { name: 'Return to garage' }).click();
  await expect(controls.getByRole('alert')).toContainText(/Finish the active ride/);

  await controls.getByRole('button', { name: 'Continue checkpoint' }).click();
  await controls.getByRole('button', { name: 'Advance autopilot' }).click();
  await expect(controls.getByRole('button', { name: 'Drop off passenger' }))
    .toBeVisible();
  await controls.getByRole('button', { name: 'Drop off passenger' }).click();
  await expect(controls.getByText(/RIDE COMPLETED/)).toBeVisible();
  await expect(controls.locator('.shift-controls-status')).toContainText('82 CR');
  await expect(controls.locator('.shift-controls-status')).toContainText('18:08');

  await controls.getByRole('button', { name: 'Return to garage' }).click();
  await expect(controls.locator('.shift-controls-status')).toContainText('GARAGE');
  await controls.getByRole('button', { name: 'Return home' }).click();
  await expect(controls.locator('.shift-controls-status')).toContainText('HOME');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(controls.locator('.shift-controls-status')).toContainText('HOME');
  await expect(controls.locator('.shift-controls-status')).toContainText('82 CR');
});

test('legitimate clinic dispatch reaches the Patchworks roadside facade and saves location', async ({
  page,
}, testInfo) => {
  test.setTimeout(150_000);
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'The authored 3D arrival proof runs on the canonical desktop Chromium renderer.',
  );
  await page.goto('/', { waitUntil: 'networkidle' });
  const controls = page.getByRole('region', { name: 'Shift navigation and dispatch' });
  await controls.getByRole('button', { name: 'Go to garage' }).click();
  await controls.getByRole('button', { name: 'Enter taxi' }).click();
  await controls.locator('.shift-work-board summary').click();

  // First valid route: Docks Taxi Rank → Night Clinic.
  const first = controls.locator('.shift-work-item[data-eligibility="eligible"]');
  await expect(first).toHaveCount(1);
  await first.getByRole('button', { name: 'Inspect offer' }).click();
  await first.getByRole('button', { name: 'Accept job' }).click();
  await controls.getByLabel('DRIVER ALIAS / COVER').fill('Copper Driver');
  await controls.getByRole('button', { name: 'Register driver' }).click();
  await controls.getByRole('button', { name: 'Pick up passenger' }).click();
  await controls.getByRole('button', { name: 'Ask why.' }).click();
  await controls.getByRole('button', { name: 'Advance autopilot' }).click();
  await controls.getByRole('button', { name: 'Continue checkpoint' }).click();
  await controls.getByRole('button', { name: 'Advance autopilot' }).click();
  await controls.getByRole('button', { name: 'Drop off passenger' }).click();
  await expect(controls.locator('.shift-controls-status')).toContainText('STOP Night Clinic');
  await expect(controls.locator('.shift-controls-status')).toContainText('82 CR');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(controls.locator('.shift-controls-status')).toContainText('STOP Night Clinic');

  // Location-qualified follow-up from the real stop, not a map teleport.
  const next = controls.locator('.shift-work-item[data-eligibility="eligible"]');
  await expect(next).toHaveCount(1);
  await next.getByRole('button', { name: 'Inspect offer' }).click();
  await expect(next).toContainText('location:docks-clinic → location:outer-margin-patchworks');
  await next.getByRole('button', { name: 'Accept job' }).click();
  await expect(controls.locator('.shift-controls-status')).not.toContainText('STOP Night Clinic');
  await controls.getByRole('button', { name: 'Pick up passenger' }).click();
  await controls.getByRole('button', { name: 'Act like this is routine.' }).click();

  // Both district segments must advance through canonical ride commands.
  // No user-facing Patchworks entry action is invented in this slice.
  for (let i = 0; i < 12; i += 1) {
    const dropoff = controls.getByRole('button', { name: 'Drop off passenger' });
    if (await dropoff.count() > 0) break;
    await controls.getByRole('button', { name: 'Advance autopilot' }).click();
  }
  await expect(controls.getByRole('button', { name: 'Drop off passenger' })).toBeVisible();
  await controls.getByRole('button', { name: 'Drop off passenger' }).click();
  await expect(controls.locator('.shift-controls-status'))
    .toContainText('STOP Patchworks Parts Shop');
  await expect(controls.getByText(/RIDE COMPLETED \/ job:clinic-to-patchworks/))
    .toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('patchworks-roadside-arrival.png') });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(controls.locator('.shift-controls-status'))
    .toContainText('STOP Patchworks Parts Shop');
  await controls.getByRole('button', { name: 'Return to garage' }).click();
  await expect(controls.locator('.shift-controls-status'))
    .not.toContainText('STOP Patchworks Parts Shop');
});
