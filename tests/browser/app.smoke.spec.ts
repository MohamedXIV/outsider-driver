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


interface InochiProbeSummary {
  readonly puppetName: string;
  readonly parameterCount: number;
  readonly parameterExercised: string | null;
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly textureCount: number;
  readonly commandCount: number;
  readonly drawStates: readonly string[];
  readonly blendModes: readonly string[];
  readonly maskLayerCount: number;
  readonly maximumMaskDepth: number;
  readonly maximumCompositeDepth: number;
  readonly taxiPassengerSeatAnchor: string;
  readonly taxiRenderAttempted: boolean;
  readonly taxiRenderSucceeded: boolean;
  readonly taxiRenderError: string | null;
}

interface InochiProbeState {
  readonly status: 'pending' | 'success' | 'failure';
  readonly summary?: InochiProbeSummary;
  readonly error?: string;
}

test('real Inochi2D puppet loads through verified WASM and reaches TaxiScene rendering', async ({ page }) => {
  const response = await page.goto('/?inochiProbe=1', {
    waitUntil: 'networkidle',
  });

  expect(response?.ok()).toBe(true);

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const state = Reflect.get(
          window,
          '__outsiderDriverInochiProbe',
        );

        if (typeof state !== 'object' || state === null) {
          return 'missing';
        }

        const status = Reflect.get(state, 'status');
        return typeof status === 'string'
          ? status
          : 'invalid';
      }),
    )
    .toBe('success');

  const state = await page.evaluate(() =>
    Reflect.get(window, '__outsiderDriverInochiProbe'),
  ) as InochiProbeState;

  expect(state.status).toBe('success');
  expect(state.error).toBeUndefined();

  const summary = state.summary;

  if (summary === undefined) {
    throw new Error('Inochi browser probe completed without a summary.');
  }

  console.log(
    `Inochi real-puppet probe: ${JSON.stringify(summary)}`,
  );

  expect(summary.puppetName.length).toBeGreaterThan(0);
  expect(summary.vertexCount).toBeGreaterThan(0);
  expect(summary.indexCount).toBeGreaterThan(0);
  expect(summary.textureCount).toBeGreaterThan(0);
  expect(summary.commandCount).toBeGreaterThan(0);
  expect(summary.taxiPassengerSeatAnchor.length).toBeGreaterThan(0);
  expect(summary.taxiRenderAttempted).toBe(true);
});
