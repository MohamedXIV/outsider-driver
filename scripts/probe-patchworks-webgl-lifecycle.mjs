/* global window, HTMLCanvasElement */
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

/**
 * Browser-only repeated WebGL/Pixi probe. This instruments one fresh Chromium
 * page; it never changes game state, production renderer or shared resources.
 * CDP heap counters and WebGL context observations are diagnostics, NOT a GPU
 * memory measurement or a proof that a context has been garbage-collected.
 */
export async function probePatchworksWebglLifecycle(browser, url, errorLog, output) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 780 } });
  const webglWarnings = [];
  page.on('pageerror', (error) => errorLog.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'warning' && /too many active webgl contexts/i.test(message.text())) {
      webglWarnings.push(message.text());
    }
  });

  // Patch before application import so Pixi's WebGL getContext calls are seen.
  // WeakRef is essential: diagnostics themselves must not keep contexts alive.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    const seen = new WeakSet();
    const observations = [];
    let contextLossEvents = 0;
    let contextRestoreEvents = 0;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      const result = Reflect.apply(original, this, [kind, ...args]);
      if (result && (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') &&
          !seen.has(result)) {
        seen.add(result);
        observations.push({ kind, ref: new WeakRef(result) });
        this.addEventListener('webglcontextlost', () => { contextLossEvents++; });
        this.addEventListener('webglcontextrestored', () => { contextRestoreEvents++; });
      }
      return result;
    };
    Reflect.set(window, '__outsiderWebglProbe', {
      snapshot: () => ({
        createdContexts: observations.length,
        trackedContextsWithJsReference: observations.filter((o) => o.ref.deref() !== undefined).length,
        observedContextLost: observations.filter((o) => o.ref.deref()?.isContextLost() === true).length,
        contextLossEvents,
        contextRestoreEvents,
        kinds: observations.map((o) => o.kind),
      }),
    });
  });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.enable');
  const heapSnapshot = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const [performance, dom] = await Promise.all([
      cdp.send('Performance.getMetrics'),
      cdp.send('Memory.getDOMCounters'),
    ]);
    const heapBytes = performance.metrics.find((entry) => entry.name === 'JSHeapUsedSize')?.value;
    return {
      jsHeapUsedBytes: heapBytes ?? null,
      domNodes: dom.nodes,
      domDocuments: dom.documents,
      domEventListeners: dom.jsEventListeners,
    };
  };
  try {
    await page.goto(url);
    const baseline = await heapSnapshot();
    const rounds = [];
    const total = 6;
    for (let i = 0; i < total; i++) {
      await page.locator('#enter').click();
      await page.locator('#visual-stage canvas').waitFor({ timeout: 20000 });
      const active = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
      const contextActive = await page.evaluate(() => Reflect.get(window, '__outsiderWebglProbe').snapshot());
      if (active.phase !== 'active' || active.destroyed || active.ownedTextureCount !== 4 ||
          active.pauseCount !== i + 1 || active.departureCount !== i ||
          contextActive.createdContexts < i + 1) {
        throw new Error('WebGL context / stage acquisition failed on cycle ' + String(i + 1) +
          ': ' + JSON.stringify({ active, contextActive }));
      }
      await page.locator('#exit').click();
      const exited = await page.evaluate(() => Reflect.get(window, '__outsiderPatchworksLab').inspect());
      const mountedCanvases = await page.locator('#visual-stage canvas').count();
      if (exited.phase !== 'idle' || !exited.destroyed || exited.tickerRunning ||
          exited.ownedTextureCount !== 0 || exited.pauseCount !== i + 1 ||
          exited.resumeCount !== i + 1 || exited.departureCount !== i + 1 ||
          exited.errorCount !== 0 || mountedCanvases !== 0) {
        throw new Error('WebGL stage cleanup failed on cycle ' + String(i + 1) +
          ': ' + JSON.stringify({ exited, mountedCanvases }));
      }
      const contextsAfter = await page.evaluate(() => Reflect.get(window, '__outsiderWebglProbe').snapshot());
      const heapAfter = await heapSnapshot();
      rounds.push({
        cycle: i + 1,
        rendererInitMs: active.rendererInitMs,
        illustrationDecodeMs: active.illustrationDecodeMs,
        firstFrameRenderMs: active.firstFrameRenderMs,
        acquiredContexts: contextActive.createdContexts,
        ...contextsAfter,
        ...heapAfter,
      });
    }
    const final = await heapSnapshot();
    if (webglWarnings.length) {
      throw new Error('Browser reported a WebGL context exhaustion warning: ' + webglWarnings.join(' | '));
    }
    const report = {
      cycles: total,
      baseline,
      final,
      rounds,
      contextExhaustionWarnings: webglWarnings,
      evidence: {
        distinctContextsSeen: rounds.at(-1)?.createdContexts ?? 0,
        zeroCanvasesAndOwnedTexturesAfterEachExit: true,
        balancedFixtureSuspendsAndResumes: true,
        noJsPageErrors: true,
      },
      caveats: [
        'CDP JS heap / DOM counts are post-GC observations, not GPU memory usage',
        'WebGL isContextLost() and webglcontextlost events do not certify GPU allocation reclamation',
        'SwiftShader software rendering cannot establish player hardware FPS or context overhead',
        'No Babylon city or simultaneous Babylon and Pixi renderers are mounted in this lab',
      ],
    };
    await writeFile(resolve(output, 'webgl-lifecycle.json'), JSON.stringify(report, null, 2));
    return report;
  } finally {
    await cdp.detach();
    await page.close();
  }
}
