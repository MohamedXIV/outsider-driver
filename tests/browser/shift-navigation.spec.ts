import { expect, test } from '@playwright/test';

test('new shift navigates through home, garage and taxi using real persisted state', async ({
  page,
}, testInfo) => {
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

  await controls.getByRole('button', { name: 'Return to garage' }).click();
  await expect(controls.getByRole('alert')).toContainText(/Finish the active ride/);
  await expect(controls.locator('.shift-controls-status')).toContainText('TAXI');
});
