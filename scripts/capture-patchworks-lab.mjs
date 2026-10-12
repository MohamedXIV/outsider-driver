/* global window, document, Event, setTimeout */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { probePatchworksWebglLifecycle } from './probe-patchworks-webgl-lifecycle.mjs';

const output = resolve(process.env.PATCHWORKS_ART_OUTPUT ?? 'docs/visuals/pixi-patchworks');
const url = 'http://127.0.0.1:5179/anchor-lab.html';
await mkdir(output, { recursive: true });

const vite = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5179', '--strictPort',
], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (vite.exitCode !== null) throw new Error('Vite dev server exited unexpectedly');
    try {
      const res = await fetch(url);
      if (res.ok) { ready = true; break; }
    } catch {
      // Server not accepting requests yet.
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!ready) throw new Error('Patchworks dev server did not become ready');

  browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errorLog = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errorLog.push(error.message));
  await page.goto(url);
  await page.locator('#enter').click();
  await page.locator('#visual-stage canvas').waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  const start = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (start.illustratedLayerCount !== 4 || start.ownedTextureCount !== 4) {
    throw new Error('Illustrated shop did not own all four source SVG textures: ' + JSON.stringify(start));
  }
  const renderTimings = ['rendererInitMs', 'illustrationDecodeMs', 'firstFrameRenderMs'];
  if (!renderTimings.every((name) => Number.isFinite(start[name]) && start[name] >= 0) ||
      start.estimatedDecodedRgbaBytes <= 0) {
    throw new Error('Pixi entry timings or decoded-pixel estimate invalid: ' + JSON.stringify(start));
  }
  const earlyCanvas = await page.locator('#visual-stage canvas').screenshot();
  await page.waitForTimeout(700);
  const animated = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  const lateCanvas = await page.locator('#visual-stage canvas').screenshot();
  if (earlyCanvas.equals(lateCanvas)) {
    throw new Error('Pixi canvas pixels did not change between animated frames');
  }
  if (animated.phase !== 'active' || !animated.tickerRunning ||
      animated.updates <= start.updates ||
      Math.abs(animated.fanAngle - start.fanAngle) < 0.001) {
    throw new Error('Pixi scene or rotating fan failed to animate: ' + JSON.stringify({ start, animated }));
  }
  if (Math.abs(animated.warmLightAlpha - start.warmLightAlpha) < 0.001) {
    throw new Error('Warm practical light did not change alpha');
  }
  await page.screenshot({ path: resolve(output, 'patchworks-desktop.png') });
  await page.locator('[data-expression="wary"]').click();
  const wary = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (wary.expression !== 'wary' || !await page.locator('#dialogue-line').textContent().then(s => s?.includes('Inspections?'))) {
    throw new Error('Accessible shop fixture did not change the Pixi shopkeeper expression');
  }
  await page.screenshot({ path: resolve(output, 'patchworks-wary.png') });
  await page.locator('[data-expression="neutral"]').click();
  // Synthetic hidden-document property tests the tab visibility handler, not browser tab scheduling.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(120);
  const hiddenStart = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  await page.waitForTimeout(240);
  const hiddenEnd = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (hiddenStart.updates !== hiddenEnd.updates) {
    throw new Error('Hidden document failed to stop Pixi ticker: ' + JSON.stringify({ hiddenStart, hiddenEnd }));
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(180);
  const visibleAgain = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (visibleAgain.updates <= hiddenEnd.updates) {
    throw new Error('Visible document failed to restart the Pixi ticker');
  }
  await page.locator('#exit').click();
  if (await page.locator('#visual-stage canvas').count() !== 0) {
    throw new Error('Scene canvas remained after exit');
  }
  const left = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (left.phase !== 'idle' || left.pauseCount !== 1 || left.resumeCount !== 1 ||
      left.tickerRunning || !left.destroyed || left.ownedTextureCount !== 0) {
    throw new Error('World suspend/release contract failed: ' + JSON.stringify(left));
  }

  await page.locator('#reduced-motion').check();
  await page.locator('#enter').click();
  await page.locator('#visual-stage canvas').waitFor();
  const reducedStart = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  const reducedEarlyCanvas = await page.locator('#visual-stage canvas').screenshot();
  await page.waitForTimeout(500);
  const reducedEnd = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  const reducedLateCanvas = await page.locator('#visual-stage canvas').screenshot();
  if (!reducedEarlyCanvas.equals(reducedLateCanvas)) {
    throw new Error('Reduced-motion mode changed rendered Pixi pixels');
  }
  if (!reducedEnd.reducedMotion || reducedEnd.tickerRunning ||
      reducedEnd.updates !== reducedStart.updates ||
      reducedEnd.fanAngle !== reducedStart.fanAngle) {
    throw new Error('Reduced-motion scene continued its ticker: ' +
      JSON.stringify({ reducedStart, reducedEnd }));
  }
  // Reduced motion must still permit accessible user-driven expression redraws.
  await page.locator('[data-expression="curious"]').click();
  const reducedCurious = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  const reducedCuriousCanvas = await page.locator('#visual-stage canvas').screenshot();
  if (reducedCurious.expression !== 'curious' || reducedCurious.tickerRunning ||
      reducedCurious.updates !== reducedStart.updates ||
      reducedEarlyCanvas.equals(reducedCuriousCanvas)) {
    throw new Error('Static stage failed to render a user-driven expression without a ticker');
  }
  await page.locator('[data-expression="neutral"]').click();
  const reducedRestoredCanvas = await page.locator('#visual-stage canvas').screenshot();
  if (!reducedEarlyCanvas.equals(reducedRestoredCanvas)) {
    throw new Error('Neutral pose did not restore identical static artwork');
  }
  await page.locator('#exit').click();
  const secondExit = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (secondExit.phase !== 'idle' || secondExit.pauseCount !== 2 ||
      secondExit.resumeCount !== 2 || secondExit.departureCount !== 2 ||
      secondExit.tickerRunning || !secondExit.destroyed || secondExit.ownedTextureCount !== 0 ||
      await page.locator('#visual-stage canvas').count() !== 0) {
    throw new Error('Repeated open/close lifecycle leaked: ' + JSON.stringify(secondExit));
  }

  const compact = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
  });
  compact.on('pageerror', (error) => errorLog.push(error.message));
  await compact.goto(url);
  await compact.locator('#enter').tap();
  await compact.locator('#visual-stage canvas').waitFor({ timeout: 20000 });
  const mobile = await compact.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  await compact.screenshot({ path: resolve(output, 'patchworks-compact.png'), fullPage: true });
  if (mobile.phase !== 'active') throw new Error('Mobile touch could not enter Pixi scene');
  await compact.locator('#exit').tap();
  if (await compact.locator('#visual-stage canvas').count() !== 0) {
    throw new Error('Compact touch exit left a Pixi canvas mounted');
  }
  // Failing an authored illustration must recover without mounting a partial
  // scene, leaking a Pixi canvas or claiming a successful arrival.
  const unavailable = await browser.newPage({ viewport: { width: 900, height: 760 } });
  unavailable.on('pageerror', (error) => errorLog.push(error.message));
  await unavailable.route('**/visual/patchworks/partskeeper.svg', (route) =>
    route.fulfill({ status: 503, contentType: 'text/plain', body: 'test-only missing illustration' }));
  await unavailable.goto(url);
  await unavailable.locator('#enter').click();
  await unavailable.locator('#status').filter({ hasText: /Scene failed: Patchworks illustration unavailable:/ }).waitFor();
  const failedAsset = await unavailable.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (failedAsset.phase !== 'idle' || failedAsset.pauseCount !== 0 ||
      failedAsset.resumeCount !== 0 || failedAsset.errorCount !== 1 ||
      await unavailable.locator('#visual-stage canvas').count() !== 0) {
    throw new Error('Illustration failure did not recover cleanly: ' + JSON.stringify(failedAsset));
  }
  await unavailable.close();
  // Deliberately stall the second SVG response, cancel while controller is
  // loading, then re-enter successfully. No Babylon suspension is permitted.
  const cancelled = await browser.newPage({ viewport: { width: 1100, height: 790 } });
  cancelled.on('pageerror', (error) => errorLog.push(error.message));
  let resolveDelayedRequest;
  const requestedIllustration = new Promise((resolve) => { resolveDelayedRequest = resolve; });
  await cancelled.route('**/visual/patchworks/street-vista.svg', async (route) => {
    resolveDelayedRequest();
    await new Promise((resolve) => setTimeout(resolve, 2200));
    // The pending request may already have been aborted by the scene exit.
    await route.continue().catch(() => {});
  });
  await cancelled.goto(url);
  await cancelled.locator('#enter').click();
  await requestedIllustration;
  if (!await cancelled.locator('#exit').isEnabled() ||
      await cancelled.locator('#exit').textContent() !== 'Cancel loading') {
    throw new Error('Loading overlay did not offer an accessible cancel action');
  }
  await cancelled.locator('#exit').click();
  const cancelImmediate = await cancelled.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (cancelImmediate.phase !== 'idle' || cancelImmediate.pauseCount !== 0 ||
      cancelImmediate.resumeCount !== 0 || cancelImmediate.departureCount !== 0 ||
      await cancelled.locator('#visual-stage canvas').count() !== 0) {
    throw new Error('Cancelling asset load affected world or canvas: ' + JSON.stringify(cancelImmediate));
  }
  await cancelled.unroute('**/visual/patchworks/street-vista.svg');
  await cancelled.waitForTimeout(2400);
  const cancelSettled = await cancelled.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (cancelSettled.phase !== 'idle' || cancelSettled.errorCount !== 0 ||
      await cancelled.locator('#visual-stage canvas').count() !== 0) {
    throw new Error('Aborted entry mounted a stale stage: ' + JSON.stringify(cancelSettled));
  }
  await cancelled.locator('#enter').click();
  await cancelled.locator('#visual-stage canvas').waitFor({ timeout: 20000 });
  const recoveredEntry = await cancelled.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (recoveredEntry.phase !== 'active' || recoveredEntry.ownedTextureCount !== 4 ||
      recoveredEntry.pauseCount !== 1) {
    throw new Error('Re-entry after cancellation failed: ' + JSON.stringify(recoveredEntry));
  }
  await cancelled.locator('#exit').click();
  const recoveredExit = await cancelled.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (recoveredExit.phase !== 'idle' || recoveredExit.ownedTextureCount !== 0 ||
      recoveredExit.resumeCount !== 1 || recoveredExit.departureCount !== 1) {
    throw new Error('Re-entry after cancellation did not clean up: ' + JSON.stringify(recoveredExit));
  }
  await cancelled.close();
  // Repeated 3D-context ownership observation in a fresh page, with CDP
  // post-GC heap/DOM counters. This is not a GPU memory benchmark.
  const webglLifecycle = await probePatchworksWebglLifecycle(browser, url, errorLog, output);
  if (errorLog.length) throw new Error('Page errors: ' + errorLog.join(' | '));

  const summary = { kind: 'PixiJS standalone isolated visual probe', start, animated, left, reducedStart, reducedEnd, mobile,
    screenshots: ['patchworks-desktop.png', 'patchworks-wary.png', 'patchworks-compact.png'],
    expressionFixture: { wary: wary.expression, dialogueUpdated: true },
    visibilityFixture: { hiddenUpdates: [hiddenStart.updates, hiddenEnd.updates], visibleUpdates: visibleAgain.updates, syntheticEvent: true },
    pixelMotionProof: {
      animatedFramesDiffer: true,
      reducedMotionFramesIdentical: true,
      reducedMotionTickerStopped: true,
      reducedMotionExpressionRendersOnDemand: true,
      comparison: 'Actual Pixi canvas screenshots, not tick counters alone',
    },
    reducedCurious,
    repeatedExit: secondExit,
    entryTimingDiagnostics: {
      rendererInitMs: start.rendererInitMs,
      illustrationDecodeMs: start.illustrationDecodeMs,
      firstFrameRenderMs: start.firstFrameRenderMs,
      estimatedDecodedRgbaBytes: start.estimatedDecodedRgbaBytes,
      label: 'Chromium SwiftShader software path; single sample only, not hardware FPS',
    },
    cancellationRecovery: { cancelImmediate, cancelSettled, recoveredEntry, recoveredExit },
    webglLifecycle: {
      cycles: webglLifecycle.cycles,
      observedContextCreations: webglLifecycle.evidence.distinctContextsSeen,
      report: 'webgl-lifecycle.json',
      caveat: 'WebGL context count is diagnostic and does not certify GPU memory release',
    },
    illustratedAssets: {
      sourceOwnedSvgLayers: 4,
      allFourLoaded: true,
      allFourDisposedOnExit: true,
      intentionalMissingLayerRecovered: true,
      failureState: failedAsset,
    },
    caveats: ['No real Babylon suspension in isolated lab', 'No GameSession transaction', 'CI SwiftShader timing is NOT player GPU FPS', 'CDP heap counters are not GPU memory measurements'],
  };
  await writeFile(resolve(output, 'metrics.json'), JSON.stringify(summary, null, 2));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
}
