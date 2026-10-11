/* global window, document, performance */
// Fixed-camera MATERIAL COMPARISON ONLY. This is a browser art-review tool,
// not a production rendering toggle or a new game renderer.
// The flat graphic control is deliberately NOT called a real cel shader.
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const url = process.env.TAXI_CAPTURE_URL ?? 'http://127.0.0.1:5173/';
const output = resolve(process.env.TAXI_MATERIAL_OUTPUT ?? 'docs/visuals/80-material-compare');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => performance.getEntriesByName('outsider-driver:startup-ready').length > 0);

  // This is the same in-engine instance used by the regular fixed-camera
  // screenshot, not a reconstructed scene or generated illustration.
  const runtimeText = await (await page.request.get(
    new URL('/src/rendering/BabylonRenderingRuntime.ts', url).href,
  )).text();
  const engineUrl = /import \{ Engine \} from "([^"]+)"/.exec(runtimeText)?.[1];
  if (engineUrl === undefined) throw new Error('Material review requires Vite dev module resolution.');

  const initial = await page.evaluate(async (moduleUrl) => {
    const { Engine } = await import(moduleUrl);
    const engine = Engine.Instances.at(-1);
    const scene = engine?.scenes.find((item) => item.activeCamera?.name === 'taxi-driver-camera');
    if (scene === undefined) throw new Error('Production taxi scene missing');
    await scene.metadata?.cityModelsReady;
    await scene.whenReadyAsync();
    const world = scene.getTransformNodeByName('taxi-world-root');
    if (world === null) throw new Error('Canonical taxi worldRoot missing');
    const originals = [...new Set(world.getChildMeshes().map((mesh) => mesh.material))]
      .filter((material) => material?.getClassName() === 'StandardMaterial')
      .map((material) => ({
        material,
        diffuseColor: material.diffuseColor.clone(),
        emissiveColor: material.emissiveColor.clone(),
        diffuseTexture: material.diffuseTexture,
        disableLighting: material.disableLighting,
      }));
    if (originals.length < 8) throw new Error('Insufficient real world materials to compare');
    Reflect.set(window, '__docksComparisonOriginals', originals);
    return {
      width: document.querySelector('canvas')?.width,
      height: document.querySelector('canvas')?.height,
      meshes: scene.meshes.length,
      materials: scene.materials.length,
      textures: scene.textures.length,
      sceneName: scene.activeCamera.name,
      variantMaterials: originals.length,
    };
  }, engineUrl);

  const treatments = [
    {
      id: 'hybrid-production',
      title: 'Approved-direction hybrid: painted albedo + existing soft scene lighting',
      note: 'The real current production baseline; no change to materials.',
    },
    {
      id: 'painted-unlit',
      title: 'Painted texture without scene lighting',
      note: 'A near/far background impostor proxy, not a custom shader.',
    },
    {
      id: 'flat-graphic-control',
      title: 'Flat three-value graphic comparison, unlit',
      note: 'Three palette-value groups; NOT genuine normal-dependent toon/cel shading.',
    },
  ];

  const report = [];
  for (const treatment of treatments) {
    const stat = await page.evaluate((id) => {
      const snapshots = Reflect.get(window, '__docksComparisonOriginals');
      if (!Array.isArray(snapshots)) throw new Error('Material baseline lost');
      let changed = 0;
      for (const original of snapshots) {
        const material = original.material;
        material.diffuseColor.copyFrom(original.diffuseColor);
        material.emissiveColor.copyFrom(original.emissiveColor);
        material.diffuseTexture = original.diffuseTexture;
        material.disableLighting = original.disableLighting;
        // Keep authored emissive signage readable. Only adjust surface paints.
        if (id !== 'hybrid-production' && material.emissiveTexture === null) {
          material.disableLighting = true;
          material.emissiveColor.copyFromFloats(0, 0, 0);
          if (id === 'flat-graphic-control') {
            const value = (material.diffuseColor.r + material.diffuseColor.g + material.diffuseColor.b) / 3;
            material.diffuseTexture = null;
            if (value < 0.37) material.diffuseColor.copyFromFloats(0.27, 0.40, 0.39);
            else if (value < 0.67) material.diffuseColor.copyFromFloats(0.59, 0.65, 0.55);
            else material.diffuseColor.copyFromFloats(0.88, 0.80, 0.62);
          }
          changed++;
        }
      }
      const scene = snapshots[0].material.getScene();
      scene.render();
      return { changedWorldMaterials: changed, sceneMeshes: scene.meshes.length };
    }, treatment.id);
    if (treatment.id !== 'hybrid-production' && stat.changedWorldMaterials < 4) {
      throw new Error('Material treatment did not affect real world surfaces');
    }
    await page.screenshot({ path: resolve(output, treatment.id + '.png') });
    report.push({ ...treatment, ...stat, image: treatment.id + '.png' });
  }
  await page.close();

  const spaces = [];
  for (const kind of ['garage', 'home']) {
    const spacePage = await browser.newPage({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    spacePage.on('pageerror', (error) => errors.push(error.message));
    const route = new URL(url);
    route.searchParams.set('spaceProbe', kind);
    await spacePage.goto(route.href);
    await spacePage.waitForFunction(() => {
      const probe = Reflect.get(window, '__outsiderDriverPersonalSpaceProbe');
      return probe?.status === 'success' || probe?.status === 'failure';
    }, { timeout: 25000 });
    const result = await spacePage.evaluate(() => Reflect.get(window, '__outsiderDriverPersonalSpaceProbe'));
    if (result.status !== 'success') {
      throw new Error(kind + ' production space probe failed: ' + String(result.error));
    }
    // Wait for the actual authored personal-space scene to be fully ready.
    await spacePage.evaluate(async (moduleUrl) => {
      const { Engine } = await import(moduleUrl);
      const engine = Engine.Instances.at(-1);
      const active = engine?.scenes.find((s) => s.activeCamera !== null && s.activeCamera !== undefined && !s.activeCamera.name.includes('taxi'));
      if (active === undefined) throw new Error('Personal-space Babylon camera missing');
      await active.whenReadyAsync();
      active.render();
    }, engineUrl);
    await spacePage.screenshot({ path: resolve(output, kind + '.png') });
    spaces.push({ kind, probe: result.summary, image: kind + '.png' });
    await spacePage.close();
  }
  if (errors.length !== 0) throw new Error(errors.join('\n'));
  process.stdout.write(JSON.stringify({
    purpose: 'Actual Babylon fixed-camera art review, not a benchmark',
    initial,
    treatments: report,
    spaces,
    caveats: [
      'Flat graphic profile is NOT real cel lighting',
      'Garage/home are genuine bounded production scenes, not a passenger visual-cohesion proof',
      'Only production hybrid treatment ships; other variants exist only in this screenshot script',
      'No GPU FPS, draw-call or texture-memory claims are made',
    ],
  }, null, 2) + '\n');
} finally {
  await browser.close();
}
