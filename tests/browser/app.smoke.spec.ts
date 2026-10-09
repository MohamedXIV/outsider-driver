import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface PerformanceBudgetConfig {
  readonly budgets: {
    readonly startupReadyMs: number;
  };
}

const performanceBudgetConfig = JSON.parse(
  readFileSync(
    new URL(
      '../../config/performance-budgets.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as PerformanceBudgetConfig;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function waitForRuntimeReady(page: Page): Promise<void> {
  // networkidle does not mean synchronous GPU initialization has finished.
  // Use the existing test deadline for readiness, then assert the contract.
  await page.waitForFunction(() =>
    performance.getEntriesByName('outsider-driver:startup-ready').length > 0 ||
    document.querySelector('[role="alert"]') !== null,
    undefined,
    { polling: 100 },
  );
}

async function expectRuntimeOutcome(
  page: Page,
): Promise<'game' | 'compatibility'> {
  await waitForRuntimeReady(page);
  const gameCanvas = page.getByRole('application', {
    name: 'Outsider Driver game view',
  });
  const compatibilityAlert = page.getByRole('alert');

  const canvasCount = await gameCanvas.count();
  const alertCount = await compatibilityAlert.count();

  expect(canvasCount + alertCount).toBe(1);

  if (canvasCount === 1) {
    await expect(gameCanvas).toBeVisible();
    // Startup has completed: inspect once rather than polling a ready canvas
    // under a second, unrelated five-second assertion deadline.
    const hasDrawingBuffer = await gameCanvas.evaluate((element) =>
      element instanceof HTMLCanvasElement &&
      element.width > 0 && element.height > 0,
    );
    expect(hasDrawingBuffer).toBe(true);

    return 'game';
  }

  await expect(compatibilityAlert).toBeVisible();
  await expect(compatibilityAlert).toContainText(
    'This browser cannot run Outsider Driver',
  );

  return 'compatibility';
}

test('production build resolves its runtime capability contract without browser errors', async ({ page }, testInfo) => {
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

  const outcome = await expectRuntimeOutcome(page);

  if (testInfo.project.name !== 'firefox-desktop') {
    expect(outcome).toBe('game');
  }

  if (
    testInfo.project.name === 'chromium-desktop' &&
    outcome === 'game'
  ) {
    const startupReadyMs = await page.evaluate(() => {
      const mark = performance
        .getEntriesByName('outsider-driver:startup-ready')
        .at(-1);

      return mark?.startTime ?? null;
    });

    if (startupReadyMs === null) {
      throw new Error(
        'Production startup did not publish the startup-ready performance mark.',
      );
    }

    console.log(
      `Production startup-ready: ${startupReadyMs.toFixed(1)} ms / ${String(performanceBudgetConfig.budgets.startupReadyMs)} ms budget`,
    );
    expect(startupReadyMs).toBeLessThanOrEqual(
      performanceBudgetConfig.budgets.startupReadyMs,
    );
  }

  expect(browserErrors).toEqual([]);
});
test('verified WASM renders the baseline puppet and pinned official real rig in TaxiScene', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'The expensive real-Inochi proof runs once on canonical desktop Chromium; cross-browser projects exercise the production Babylon/UI surface without repeating the WASM fixture.',
  );

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

  // Completion includes resource cleanup after the final acceptance stage.
  // This uses the probe's existing 90-second test deadline, not expect's 5s.
  await page.waitForFunction(() => {
    const probe = (window as Window & {
      __outsiderDriverInochiProbe?: { status?: string };
    }).__outsiderDriverInochiProbe;
    return probe?.status === 'success' || probe?.status === 'failure';
  }, undefined, { polling: 100 });

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
  expect(summary.taxiRenderSucceeded).toBe(true);
  expect(summary.taxiRenderError).toBeNull();

  if (!isRecord(summary.realPuppet)) {
    throw new Error(
      'Inochi browser probe did not publish the pinned real-puppet summary.',
    );
  }

  const realPuppet = summary.realPuppet;
  console.log(
    `Inochi pinned official real-rig probe: ${JSON.stringify(realPuppet)}`,
  );

  expect(realPuppet.sourceModel).toBe(
    'Inochi2D/example-models@cd95dd00ddff63b1f7d2b84a19914c3c70d05945/Aka.inx',
  );
  expect(typeof realPuppet.puppetName).toBe('string');
  expect(String(realPuppet.puppetName).length).toBeGreaterThan(0);
  expect(typeof realPuppet.puppetAuthor).toBe('string');
  expect(Number(realPuppet.parameterCount)).toBeGreaterThan(0);
  expect(typeof realPuppet.parameterExercised).toBe('string');
  expect(realPuppet.parameterValueChanged).toBe(true);
  expect(Number(realPuppet.vertexCount)).toBeGreaterThan(0);
  expect(Number(realPuppet.indexCount)).toBeGreaterThan(0);
  expect(Number(realPuppet.textureCount)).toBeGreaterThan(0);
  expect(Number(realPuppet.commandCount)).toBeGreaterThan(0);
  expect(Array.isArray(realPuppet.drawStates)).toBe(true);
  expect(Array.isArray(realPuppet.blendModes)).toBe(true);
  expect(typeof realPuppet.taxiPassengerSeatAnchor).toBe('string');
  expect(realPuppet.taxiRenderAttempted).toBe(true);
  expect(realPuppet.taxiRenderSucceeded).toBe(true);
  expect(realPuppet.taxiRenderError).toBeNull();
});


const personalSpaceBrowserCases = [
  ['garage', ['taxi-access', 'upgrades', 'exit']],
  ['home', ['messages', 'possessions', 'sleep', 'exit']],
] as const;

for (const [
  kind,
  expectedInteractionKinds,
] of personalSpaceBrowserCases) {
  test(
    `production build renders the authored ${kind} as a live 3D personal space`,
    async ({ page }, testInfo) => {
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

      const runtimeOutcome = await expectRuntimeOutcome(page);

      if (runtimeOutcome === 'compatibility') {
        expect(testInfo.project.name).toBe('firefox-desktop');
        expect(browserErrors).toEqual([]);
        return;
      }

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

      const raw: unknown = await page.evaluate(() => {
        const value: unknown = Reflect.get(
          window,
          '__outsiderDriverPersonalSpaceProbe',
        );
        return value;
      });

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

      expect(browserErrors).toEqual([]);
    },
  );
}


test('accessibility and control settings persist and provide a keyboard escape path', async ({ page }, testInfo) => {
  // Canonical runner trace 37875150736: the full real-input/reload scenario
  // consumes ~30 seconds cumulatively even with correct persisted DOM values.
  // This is a whole-test bound, not a weakened per-action or startup budget.
  test.setTimeout(60_000);

  test.skip(
    testInfo.project.name === 'chromium-compact-touch',
    'The compact profile has a dedicated touch/layout settings contract; desktop profiles exercise persistence when the runtime capability gate permits the game surface.',
  );

  const response = await page.goto('/', {
    waitUntil: 'networkidle',
  });

  expect(response?.ok()).toBe(true);

  const runtimeOutcome = await expectRuntimeOutcome(page);

  if (runtimeOutcome === 'compatibility') {
    expect(testInfo.project.name).toBe('firefox-desktop');
    return;
  }

  const canvas = page.getByRole('application', {
    name: 'Outsider Driver game view',
  });
  const settingsButton = page.getByRole('button', {
    name: 'Accessibility and controls settings',
  });

  await canvas.focus();
  await page.keyboard.press('Escape');
  await expect(settingsButton).toBeFocused();

  await settingsButton.press('Enter');

  const interfaceScale = page.getByLabel('Interface scale');
  const motionIntensity = page.getByLabel('Motion intensity');
  const contrast = page.getByLabel('Contrast');
  const focusIndicator = page.getByLabel('Focus indicator');
  const pointerSensitivity = page.getByLabel(
    'Pointer look sensitivity',
  );
  const touchSensitivity = page.getByLabel(
    'Touch look sensitivity',
  );

  await expect(interfaceScale).toBeFocused();

  await interfaceScale.fill('135');
  await motionIntensity.fill('25');
  await contrast.selectOption('high');
  await focusIndicator.selectOption('always');
  await pointerSensitivity.fill('150');
  await touchSensitivity.fill('125');

  const shell = page.locator('.game-shell');
  await expect(shell).toHaveAttribute('data-contrast', 'high');
  await expect(shell).toHaveAttribute(
    'data-focus-indicator',
    'always',
  );

  expect(
    await shell.evaluate((element) =>
      element.style.getPropertyValue('--game-ui-scale'),
    ),
  ).toBe('1.35');

  await page.reload({
    waitUntil: 'networkidle',
  });

  await waitForRuntimeReady(page);
  const reloadedSettingsButton = page.getByRole('button', {
    name: 'Accessibility and controls settings',
  });
  await reloadedSettingsButton.click();

  await expect(page.getByLabel('Interface scale')).toHaveValue(
    '135',
  );
  await expect(page.getByLabel('Motion intensity')).toHaveValue(
    '25',
  );
  await expect(page.getByLabel('Contrast')).toHaveValue('high');
  await expect(page.getByLabel('Focus indicator')).toHaveValue(
    'always',
  );
  await expect(
    page.getByLabel('Pointer look sensitivity'),
  ).toHaveValue('150');
  await expect(
    page.getByLabel('Touch look sensitivity'),
  ).toHaveValue('125');

  await page.keyboard.press('Escape');

  await expect(reloadedSettingsButton).toBeFocused();
  await expect(
    page.locator('#game-accessibility-settings'),
  ).toBeHidden();
});


test('compact touch profile remains usable without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-compact-touch',
    'This contract targets the compact touch compatibility profile.',
  );

  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(`console: ${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    browserErrors.push(`page: ${error.message}`);
  });

  const response = await page.goto('/', {
    waitUntil: 'networkidle',
  });

  expect(response?.ok()).toBe(true);
  expect(await expectRuntimeOutcome(page)).toBe('game');

  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    maxTouchPoints: navigator.maxTouchPoints,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  }));

  expect(metrics.innerWidth).toBeLessThanOrEqual(500);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(
    metrics.innerWidth,
  );
  expect(metrics.maxTouchPoints).toBeGreaterThan(0);
  expect(metrics.coarsePointer).toBe(true);

  const settingsButton = page.getByRole('button', {
    name: 'Accessibility and controls settings',
  });
  const box = await settingsButton.boundingBox();

  if (box === null) {
    throw new Error(
      'Compact touch settings button has no tappable bounding box.',
    );
  }

  await page.touchscreen.tap(
    box.x + box.width / 2,
    box.y + box.height / 2,
  );

  await expect(
    page.locator('#game-accessibility-settings'),
  ).toBeVisible();

  const panelBox = await page
    .locator('#game-accessibility-settings')
    .boundingBox();

  if (panelBox === null) {
    throw new Error(
      'Compact touch settings panel has no rendered bounds.',
    );
  }

  expect(panelBox.x).toBeGreaterThanOrEqual(0);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(
    metrics.innerWidth + 1,
  );
  expect(browserErrors).toEqual([]);
});

test('unsupported WebGL capability fails into an accessible compatibility surface', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'One deterministic browser profile is sufficient for the unsupported-capability contract.',
  );

  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(`console: ${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    browserErrors.push(`page: ${error.message}`);
  });

  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'WebGLRenderingContext', {
      configurable: true,
      value: undefined,
    });
  });

  const response = await page.goto('/', {
    waitUntil: 'networkidle',
  });

  expect(response?.ok()).toBe(true);

  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(
    'This browser cannot run Outsider Driver',
  );
  await expect(alert).toContainText('WebGL graphics');
  await expect(
    page.getByRole('application', {
      name: 'Outsider Driver game view',
    }),
  ).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});
