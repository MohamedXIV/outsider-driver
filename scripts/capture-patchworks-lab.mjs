/* global window, setTimeout */
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
  await page.waitForTimeout(700);
  const animated = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (animated.phase !== 'active' || animated.updates <= start.updates ||
      Math.abs(animated.fanAngle - start.fanAngle) < 0.001) {
    throw new Error('Pixi scene or rotating fan failed to animate: ' + JSON.stringify({ start, animated }));
  }
  if (Math.abs(animated.warmLightAlpha - start.warmLightAlpha) < 0.001) {
    throw new Error('Warm practical light did not change alpha');
  }
  await page.screenshot({ path: resolve(output, 'patchworks-desktop.png') });
  await page.locator('#exit').click();
  if (await page.locator('#visual-stage canvas').count() !== 0) {
    throw new Error('Scene canvas remained after exit');
  }
  const left = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (left.phase !== 'idle' || left.pauseCount !== 1 || left.resumeCount !== 1) {
    throw new Error('World suspend/release contract failed: ' + JSON.stringify(left));
  }

  await page.locator('#reduced-motion').check();
  await page.locator('#enter').click();
  await page.locator('#visual-stage canvas').waitFor();
  const reducedStart = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  await page.waitForTimeout(500);
  const reducedEnd = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
  if (!reducedEnd.reducedMotion || reducedEnd.updates <= reducedStart.updates ||
      reducedEnd.fanAngle !== reducedStart.fanAngle) {
    throw new Error('Reduced-motion scene still animated or stopped drawing: ' +
      JSON.stringify({ reducedStart, reducedEnd }));
  }
  await page.locator('#exit').click();

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
  if (errorLog.length) throw new Error('Page errors: ' + errorLog.join(' | '));

  const summary = { kind: 'PixiJS standalone isolated visual probe', start, animated, left, reducedStart, reducedEnd, mobile,
    screenshots: ['patchworks-desktop.png', 'patchworks-compact.png'],
    caveats: ['No real Babylon suspension in isolated lab', 'No GameSession transaction', 'CI SwiftShader timing is NOT player GPU FPS'],
  };
  await writeFile(resolve(output, 'metrics.json'), JSON.stringify(summary, null, 2));
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
}
