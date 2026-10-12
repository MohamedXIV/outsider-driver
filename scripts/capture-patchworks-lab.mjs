/* global window, document, Event, setTimeout */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

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
      left.tickerRunning || !left.destroyed) {
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
      secondExit.tickerRunning || !secondExit.destroyed ||
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
    caveats: ['No real Babylon suspension in isolated lab', 'No GameSession transaction', 'CI SwiftShader timing is NOT player GPU FPS'],
  };
  await writeFile(resolve(output, 'metrics.json'), JSON.stringify(summary, null, 2));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
}
