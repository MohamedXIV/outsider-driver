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
  expect(Number(summary.parameterCount)).toBeGreaterThanOrEqual(9);
  expect(summary.performanceCueApplied).toBe('guarded');

  if (!isRecord(summary.performanceValues)) {
    throw new Error(
      'Inochi browser probe did not publish semantic performance values.',
    );
  }

  const mouth = summary.performanceValues.Mouth;
  const mood = summary.performanceValues.Mood;
  const gazeX = summary.performanceValues.GazeX;
  const gazeY = summary.performanceValues.GazeY;
  const headX = summary.performanceValues.HeadX;
  const headY = summary.performanceValues.HeadY;
  const bodyX = summary.performanceValues.BodyX;
  const bodyY = summary.performanceValues.BodyY;

  if (
    !Array.isArray(mouth) ||
    !Array.isArray(mood) ||
    !Array.isArray(gazeX) ||
    !Array.isArray(gazeY) ||
    !Array.isArray(headX) ||
    !Array.isArray(headY) ||
    !Array.isArray(bodyX) ||
    !Array.isArray(bodyY)
  ) {
    throw new Error(
      'Inochi browser probe performance values have invalid shapes.',
    );
  }

  expect(Number(mouth[0])).toBeCloseTo(0.2, 5);
  expect(Number(mood[0])).toBeCloseTo(-0.4, 5);
  expect(Number(gazeX[0])).toBeCloseTo(-0.25, 5);
  expect(Number(gazeY[0])).toBeCloseTo(0.05, 5);
  expect(Number(headX[0])).toBeCloseTo(-0.12, 5);
  expect(Number(headY[0])).toBeCloseTo(0.04, 5);
  expect(Number(bodyX[0])).toBeCloseTo(-0.08, 5);
  expect(Number(bodyY[0])).toBeCloseTo(0, 5);
  expect(summary.lightingApplied).toBe(true);
  expect(typeof summary.taxiPassengerSeatAnchor).toBe('string');
  expect(summary.taxiRenderAttempted).toBe(true);
});


test.each([
  ['garage', ['taxi-access', 'upgrades', 'exit']],
  ['home', ['messages', 'possessions', 'sleep', 'exit']],
] as const)(
  'production build renders the authored %s as a live 3D personal space',
  async (kind, expectedInteractionKinds, { page }) => {
    const browserErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        browserErrors.push(`console: ${message.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      browserErrors.push(`page: ${error.message}`);
    });

    const response = await page.goto(
      `/?spaceProbe=${kind}`,
      {
        waitUntil: 'networkidle',
      },
    );

    expect(response?.ok()).toBe(true);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const state: unknown = Reflect.get(
            window,
            '__outsiderDriverPersonalSpaceProbe',
          );

          if (typeof state !== 'object' || state === null) {
            return 'pending';
          }

          const status: unknown = Reflect.get(state, 'status');
          return typeof status === 'string'
            ? status
            : 'pending';
        }),
      )
      .toBe('success');

    const raw: unknown = await page.evaluate(() =>
      Reflect.get(
        window,
        '__outsiderDriverPersonalSpaceProbe',
      ),
    );

    if (!isRecord(raw) || !isRecord(raw.summary)) {
      throw new Error(
        'Personal-space browser probe completed without a summary.',
      );
    }

    const summary = raw.summary;
    expect(summary.kind).toBe(kind);
    expect(summary.spaceId).toBe(`personal-space:${kind}`);
    expect(summary.visited).toBe(true);
    expect(summary.currentSpaceId).toBe(
      `personal-space:${kind}`,
    );
    expect(summary.exercisedFlagValue).toBe(true);

    if (!Array.isArray(summary.interactionKinds)) {
      throw new Error(
        'Personal-space probe interaction kinds were not an array.',
      );
    }

    expect(summary.interactionKinds).toEqual(
      expect.arrayContaining([...expectedInteractionKinds]),
    );

    const gameCanvas = page.getByRole('application', {
      name: 'Outsider Driver game view',
    });
    await expect(gameCanvas).toBeVisible();
    expect(browserErrors).toEqual([]);
  },
);
