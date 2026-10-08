/* global document, performance */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Capture the production taxi through the normal entry URL, using Vite's existing
// Engine module instance. Camera adjustments stay in this review tool, not the app.
const url = process.env.TAXI_CAPTURE_URL ?? 'http://127.0.0.1:5173/';
const output = resolve('docs/visuals/66');
await mkdir(output, { recursive: true });
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({
  ...(executablePath === undefined ? {} : { executablePath }),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => performance.getEntriesByName('outsider-driver:startup-ready').length > 0);
  const runtime = await (await page.request.get(new URL('/src/rendering/BabylonRenderingRuntime.ts', url).href)).text();
  const engineUrl = /import \{ Engine \} from "([^"]+)"/.exec(runtime)?.[1];
  if (engineUrl === undefined) throw new Error('Capture requires the Vite development server.');
  await page.evaluate(async (moduleUrl) => {
    const { Engine } = await import(moduleUrl);
    const scene = Engine.Instances.at(-1).scenes.find((candidate) => candidate.activeCamera?.name === 'taxi-driver-camera');
    if (scene === undefined) throw new Error('Production taxi scene is not active.');
    await scene.whenReadyAsync();
  }, engineUrl);
  await page.screenshot({ path: resolve(output, 'cockpit.png') });
  const metrics = await page.evaluate(async (moduleUrl) => {
    const { Engine } = await import(moduleUrl);
    const engine = Engine.Instances.at(-1);
    const scene = engine.scenes.find((candidate) => candidate.activeCamera?.name === 'taxi-driver-camera');
    return { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length,
      triangles: scene.meshes.reduce((total, mesh) => total + mesh.getTotalIndices() / 3, 0),
      startupReadyMs: performance.getEntriesByName('outsider-driver:startup-ready')[0].startTime,
      canvas: { width: document.querySelector('canvas').width, height: document.querySelector('canvas').height } };
  }, engineUrl);
  await page.evaluate(async (moduleUrl) => {
    const { Engine } = await import(moduleUrl);
    const scene = Engine.Instances.at(-1).scenes.find((candidate) => candidate.activeCamera?.name === 'taxi-driver-camera');
    scene.activeCamera.position.set(-0.5, 1.25, 0.65);
    scene.activeCamera.rotation.set(0.25, 2.55, 0);
    scene.render();
  }, engineUrl);
  await page.screenshot({ path: resolve(output, 'passenger.png') });
  await page.setViewportSize({ width: 900, height: 900 });
  await page.reload();
  await page.waitForFunction(() => performance.getEntriesByName('outsider-driver:startup-ready').length > 0);
  await page.evaluate(async (moduleUrl) => {
    const { Engine } = await import(moduleUrl);
    await Engine.Instances.at(-1).scenes.find((candidate) => candidate.activeCamera?.name === 'taxi-driver-camera').whenReadyAsync();
  }, engineUrl);
  await page.screenshot({ path: resolve(output, 'compact.png') });
  if (errors.length > 0) throw new Error(errors.join('\n'));
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
} finally {
  await browser.close();
}
