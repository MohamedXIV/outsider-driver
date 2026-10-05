import { expect, test } from '@playwright/test';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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

test('real tiny Inochi2D puppet loads through verified WASM and reaches TaxiScene rendering', async ({ page }) => {
  let lastStage = 'not-started';

  page.on('console', (message) => {
    const text = message.text();
    const prefix = 'INOCHI_STAGE:';

    if (text.startsWith(prefix)) {
      lastStage = text.slice(prefix.length);
      console.log(`Inochi probe stage: ${lastStage}`);
    }
  });

  page.on('crash', () => {
    console.log(`Inochi probe page crashed after: ${lastStage}`);
  });

  const response = await page.goto('/?inochiProbe=1', {
    waitUntil: 'networkidle',
  });

  expect(response?.ok()).toBe(true);

  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => {
          const state: unknown = Reflect.get(
            window,
            '__outsiderDriverInochiProbe',
          );

          if (typeof state !== 'object' || state === null) {
            return 'pending';
          }

          const status: unknown = Reflect.get(state, 'status');
          return status === 'success' || status === 'failure'
            ? status
            : 'pending';
        });
      } catch {
        return `crashed-after:${lastStage}`;
      }
    })
    .toMatch(/^(success|failure)$/);

  const rawState: unknown = await page.evaluate(() => {
    const value: unknown = Reflect.get(
      window,
      '__outsiderDriverInochiProbe',
    );
    return value;
  });

  if (!isRecord(rawState)) {
    throw new Error('Inochi browser probe did not publish an object state.');
  }

  if (rawState.status === 'failure') {
    const probeError =
      typeof rawState.error === 'string'
        ? rawState.error
        : 'unknown error';

    throw new Error(
      `Inochi browser probe failed after ${lastStage}: ${probeError}`,
    );
  }

  expect(rawState.status).toBe('success');
  expect(rawState.error).toBeUndefined();

  const summary = rawState.summary;

  if (!isRecord(summary)) {
    throw new Error('Inochi browser probe completed without a summary.');
  }

  console.log(
    `Inochi real-puppet probe: ${JSON.stringify(summary)}`,
  );

  expect(typeof summary.puppetName).toBe('string');
  expect(Number(summary.vertexCount)).toBeGreaterThan(0);
  expect(Number(summary.indexCount)).toBeGreaterThan(0);
  expect(Number(summary.textureCount)).toBeGreaterThan(0);
  expect(Number(summary.commandCount)).toBeGreaterThan(0);
  expect(Number(summary.parameterCount)).toBeGreaterThanOrEqual(6);
  expect(summary.performanceCueApplied).toBe('guarded');

  if (!isRecord(summary.performanceValues)) {
    throw new Error(
      'Inochi browser probe did not publish semantic performance values.',
    );
  }

  const mouth = summary.performanceValues.Mouth;
  const mood = summary.performanceValues.Mood;
  const gaze = summary.performanceValues.Gaze;

  if (
    !Array.isArray(mouth) ||
    !Array.isArray(mood) ||
    !Array.isArray(gaze)
  ) {
    throw new Error(
      'Inochi browser probe performance values have invalid shapes.',
    );
  }

  expect(Number(mouth[0])).toBeCloseTo(0.2, 5);
  expect(Number(mood[0])).toBeCloseTo(-0.4, 5);
  expect(Number(gaze[0])).toBeCloseTo(-0.25, 5);
  expect(Number(gaze[1])).toBeCloseTo(0.05, 5);
  expect(summary.lightingApplied).toBe(true);
  expect(typeof summary.taxiPassengerSeatAnchor).toBe('string');
  expect(summary.taxiRenderAttempted).toBe(true);
});
