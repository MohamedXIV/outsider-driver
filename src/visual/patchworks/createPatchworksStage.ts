import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { AnimatedAnchorStage } from '../../app/presentation/AnimatedAnchorTransitionController';

export type PatchworksExpression = 'neutral' | 'curious' | 'wary';

/** A standalone authored 2D ambience study; no route, commerce or saves. */
export interface PatchworksStage extends AnimatedAnchorStage {
  /** Presentation-only fixture: an expression is never a relationship or Ink event. */
  setExpression(expression: PatchworksExpression): void;
  getMetrics(): {
    readonly updates: number;
    readonly fanAngle: number;
    readonly warmLightAlpha: number;
    readonly reducedMotion: boolean;
    readonly expression: PatchworksExpression;
    readonly streetOffset: number;
    readonly passerX: number;
    readonly tickerRunning: boolean;
    readonly destroyed: boolean;
    readonly illustratedLayerCount: number;
    readonly ownedTextureCount: number;
    /** Wall-clock measurements from this one Pixi entry, not a GPU benchmark. */
    readonly rendererInitMs: number;
    readonly illustrationDecodeMs: number;
    readonly firstFrameRenderMs: number;
    /** Width × height × 4; excludes staging/mipmaps/format/renderer overhead. */
    readonly estimatedDecodedRgbaBytes: number;
  };
}

/**
 * Each lab entry owns these decoded textures. Avoid the global Pixi Assets cache:
 * unload/load races between cancelled and subsequent entries can reuse stale
 * textures, and no other part of the app needs these illustration resources.
 */
const ILLUSTRATION_URLS = [
  '/visual/patchworks/shop-backplate.svg',
  '/visual/patchworks/street-vista.svg',
  '/visual/patchworks/partskeeper.svg',
  '/visual/patchworks/counter-foreground.svg',
] as const;

/** The network abort signal must interrupt slow SVG decode, not only fetch. */
async function decodeWithAbort(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  let onAbort: (() => void) | undefined;
  try {
    await Promise.race([
      image.decode(),
      new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(signal.reason ?? new DOMException('Patchworks decode aborted.', 'AbortError'));
        signal.addEventListener('abort', onAbort, { once: true });
        if (signal.aborted) onAbort();
      }),
    ]);
    signal.throwIfAborted();
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
}

async function loadOwnedIllustration(url: string, signal: AbortSignal): Promise<Texture> {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.headers.get('content-type')?.includes('image/svg+xml')) {
    throw new Error(`Patchworks illustration unavailable: ${url} (${String(response.status)})`);
  }
  const blob = await response.blob();
  signal.throwIfAborted();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await decodeWithAbort(image, signal);
    return Texture.from(image);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function rect(x: number, y: number, width: number, height: number, color: number): Graphics {
  return new Graphics().rect(x, y, width, height).fill(color);
}

function panel(x: number, y: number, width: number, height: number, radius: number, color: number): Graphics {
  return new Graphics().roundRect(x, y, width, height, radius).fill(color);
}

function circle(x: number, y: number, radius: number, color: number, alpha = 1): Graphics {
  return new Graphics().circle(x, y, radius).fill({ color, alpha });
}

/**
 * Pure presentation: moving hardware, low-cost emissive fake lights, vapor,
 * soft silhouettes, and idle character motion. The heavy scene only loads
 * from the standalone anchor-lab entry; it is not imported by main.ts.
 */
export async function createPatchworksStage(
  signal: AbortSignal,
  reducedMotion = false,
): Promise<PatchworksStage> {
  if (signal.aborted) throw new Error('Patchworks scene request aborted.');
  const isAborted = (): boolean => signal.aborted;
  const initStart = performance.now();
  const app = new Application();
  await app.init({
    width: 960,
    height: 540,
    autoStart: false,
    sharedTicker: false,
    preference: 'webgl',
    antialias: true,
    resolution: 1,
    background: 0x192c34,
  });
  const rendererInitMs = performance.now() - initStart;
  if (isAborted()) {
    app.destroy(true, { children: true });
    throw new Error('Patchworks scene request aborted.');
  }

  const illustrationStarted = performance.now();
  const ownedTextures: Texture[] = [];
  try {
    // Sequential decoding also makes aborted entries cheap to unwind.
    for (const url of ILLUSTRATION_URLS) {
      ownedTextures.push(await loadOwnedIllustration(url, signal));
    }
  } catch (error: unknown) {
    for (const texture of ownedTextures) texture.destroy();
    app.destroy(true, { children: true });
    throw error;
  }
  const illustrationDecodeMs = performance.now() - illustrationStarted;
  const estimatedDecodedRgbaBytes = ownedTextures.reduce(
    (total, texture) => total + texture.width * texture.height * 4,
    0,
  );
  const [backplateTexture, streetTexture, portraitTexture, counterTexture] = ownedTextures;
  if (!backplateTexture || !streetTexture || !portraitTexture || !counterTexture) {
    throw new Error('Patchworks illustration layer manifest is incomplete.');
  }

  const stage = app.stage;
  // Source-owned illustrated layers provide the actual texture, silhouettes,
  // wear, staging and street depth. Pixi owns only compositing/secondary motion.
  const backplate = new Sprite(backplateTexture);
  stage.addChild(backplate);

  // The street vignette moves independently behind the painted window frame.
  const street = new Container();
  const streetIllustration = new Sprite(streetTexture);
  streetIllustration.position.set(65, 129);
  streetIllustration.width = 200;
  streetIllustration.height = 169;
  street.addChild(streetIllustration);
  // Ground-level passer: a distinct silhouette outside the reachable shop,
  // masked by the architectural window rather than drawn over its frame.
  const passer = new Container();
  passer.addChild(new Graphics().ellipse(0, 0, 21, 4).fill({ color: 0x0e2934, alpha: 0.6 }));
  passer.addChild(new Graphics().poly([-12, -5, -19, -31, -9, -49, 10, -49, 19, -28, 12, -5]).fill(0x132e3a));
  passer.addChild(new Graphics().ellipse(0, -52, 13, 14).fill(0x173843));
  passer.addChild(new Graphics().poly([-7, -60, -13, -76, 0, -66, 14, -75, 7, -60]).fill(0x173843));
  passer.addChild(circle(-5, -54, 2, 0xc6a365, 0.8));
  passer.position.set(-50, 261);
  passer.visible = false;
  street.addChild(passer);
  stage.addChild(street);
  const streetWindowMask = panel(65, 129, 200, 169, 12, 0xffffff);
  stage.addChild(streetWindowMask);
  street.mask = streetWindowMask;
  stage.addChild(rect(159, 130, 12, 168, 0x8f8f7a));
  stage.addChild(rect(64, 211, 200, 11, 0x8f8f7a));

  // Suspended service monitor and its shifting data line.
  stage.addChild(panel(554, 129, 160, 113, 13, 0xbda275));
  stage.addChild(panel(565, 139, 140, 87, 9, 0x102e34));
  const scanline = rect(574, 151, 122, 4, 0x80dfca);
  scanline.alpha = 0.45;
  stage.addChild(scanline);
  for (let i = 0; i < 7; i++) {
    stage.addChild(rect(577 + i * 17, 172 + (i % 3) * 9, 11, 6, 0x538f88));
  }
  // Overhead analog fixtures, practical not a full shadow-renderer.
  // Lamp fixture itself is in the backplate; these remain animatable overlays.
  const lampCore = circle(607, 143, 19, 0xf4ce88, 0.8);
  stage.addChild(lampCore);
  const warmGlow = circle(607, 166, 109, 0xe3a15b, 0.07);
  stage.addChild(warmGlow);

  // Reconditioned fan, made of rotating Pixi objects rather than baked frames.
  stage.addChild(rect(456, 45, 8, 51, 0x9e9680));
  const fan = new Container();
  fan.position.set(460, 104);
  for (let i = 0; i < 4; i++) {
    const blade = panel(-8, -65, 16, 55, 9, 0x9d9b82);
    blade.rotation = i * Math.PI / 2;
    fan.addChild(blade);
  }
  fan.addChild(circle(0, 0, 16, 0x475d5b));
  stage.addChild(fan);

  // A recurring shopkeeper: idles and blinks while the shop is running.
  const vendor = new Container();
  vendor.position.set(672, 325);
  const illustratedPartskeeper = new Sprite(portraitTexture);
  illustratedPartskeeper.position.set(-115, -170);
  vendor.addChild(illustratedPartskeeper);
  const leftEye = circle(-19, -62, 8, 0x253b39);
  const rightEye = circle(19, -62, 8, 0x253b39);
  vendor.addChild(leftEye, rightEye);
  // Expression marks are visual changes only, not dialogue or social state.
  const curiousMark = circle(35, -111, 5, 0xe3c78c, 0.8);
  const waryBrow = new Graphics().poly([-36, -81, -8, -74, 10, -76, 37, -83]).stroke({ color: 0x34504b, width: 5 });
  curiousMark.visible = false;
  waryBrow.visible = false;
  vendor.addChild(curiousMark, waryBrow);
  const blink = rect(-34, -71, 67, 16, 0x729a8d);
  blink.alpha = 0;
  vendor.addChild(blink);
  stage.addChild(vendor);

  // Foreground illustrated material passes in front of the partskeeper.
  stage.addChild(new Sprite(counterTexture));

  // Vapor and fine dust: existing geometry only; tick updates transforms.
  const vapor = Array.from({ length: 5 }, (_, i) => {
    const item = new Graphics().ellipse(0, 0, 16 + i * 3, 8 + i).fill({ color: 0xb6c7b1, alpha: 0.16 });
    item.position.set(358 + i * 9, 341);
    stage.addChild(item);
    return item;
  });
  const dust = Array.from({ length: 11 }, (_, i) => {
    const item = circle(0, 0, 1 + (i % 3), 0xcdbb8f, 0.2);
    item.position.set(56 + i * 76, 65 + (i * 71) % 315);
    stage.addChild(item);
    return item;
  });
  const foreground = rect(0, 520, 960, 20, 0x282d2e);
  stage.addChild(foreground);

  let elapsed = 0;
  let updates = 0;
  // Store scalar diagnostics independently: Pixi releases transforms on destroy.
  let fanAngleValue = fan.rotation;
  let warmLightValue = warmGlow.alpha;
  let expression: PatchworksExpression = 'neutral';
  // Keep diagnostics detached from Pixi transforms: destroy(true) releases them.
  let streetOffset = 0;
  let passerX = -50;
  const setExpression = (next: PatchworksExpression): void => {
    if (destroyed) return;
    expression = next;
    curiousMark.visible = next === 'curious';
    waryBrow.visible = next === 'wary';
    leftEye.scale.y = next === 'wary' ? 0.62 : 1;
    rightEye.scale.y = next === 'wary' ? 0.62 : 1;
    vendor.rotation = next === 'curious' ? 0.035 : next === 'wary' ? -0.02 : 0;
    // Reduced motion presents a static scene; expressions redraw on demand.
    if (!playing || reducedMotion) app.render();
  };
  let playing = false;
  let destroyed = false;
  const tick = (ticker: { deltaTime: number }): void => {
    elapsed += Math.min(ticker.deltaTime, 2);
    updates++;
    if (reducedMotion) return;
    fanAngleValue += 0.032 * ticker.deltaTime;
    fan.rotation = fanAngleValue;
    // Slow depth drift and an occasional pedestrian, physically behind glass.
    streetOffset = Math.sin(elapsed * 0.006) * 2.5;
    street.x = streetOffset;
    const passingCycle = elapsed % 560;
    passer.visible = passingCycle < 410;
    passerX = -50 + passingCycle * 0.65;
    passer.x = passerX;
    warmLightValue = 0.06 + 0.025 * Math.sin(elapsed * 0.061) +
      (Math.sin(elapsed * 0.191) > 0.91 ? 0.045 : 0);
    warmGlow.alpha = warmLightValue;
    lampCore.alpha = 0.77 + 0.16 * Math.sin(elapsed * 0.082);
    vendor.y = 325 + Math.sin(elapsed * 0.032) * 2.5;
    blink.alpha = Math.sin(elapsed * 0.12) > 0.985 ? 1 : 0;
    scanline.y = 145 + ((elapsed * 0.8) % 65);
    vapor.forEach((item, i) => {
      item.y = 341 - ((elapsed * (0.2 + i * 0.05) + i * 11) % 100);
      item.alpha = 0.12 * Math.max(0, (item.y - 235) / 110);
      item.x = 360 + i * 10 + Math.sin(elapsed * 0.019 + i) * 13;
    });
    dust.forEach((item, i) => {
      item.x = (56 + i * 76 + elapsed * 0.07 * (1 + i % 3)) % 950;
    });
  };
  app.ticker.add(tick);
  const firstFrameStart = performance.now();
  app.render();
  const firstFrameRenderMs = performance.now() - firstFrameStart;

  return {
    canvas: app.canvas,
    start: () => {
      if (destroyed || playing) return;
      playing = true;
      // Static reduced-motion stages never start a continuous GPU draw loop.
      if (!reducedMotion) app.start();
    },
    stop: () => {
      if (destroyed || !playing) return;
      playing = false;
      if (!reducedMotion) app.stop();
    },
    dispose: () => {
      if (destroyed) return;
      destroyed = true;
      playing = false;
      app.stop();
      app.ticker.remove(tick);
      app.destroy(true, { children: true });
      // Own, release and never share these four textures across entries.
      for (const texture of ownedTextures) texture.destroy();
    },
    setExpression,
    getMetrics: () => ({
      updates,
      fanAngle: fanAngleValue,
      warmLightAlpha: warmLightValue,
      reducedMotion,
      expression,
      streetOffset,
      passerX,
      tickerRunning: playing && !reducedMotion && !destroyed,
      destroyed,
      illustratedLayerCount: ILLUSTRATION_URLS.length,
      ownedTextureCount: destroyed ? 0 : ownedTextures.length,
      rendererInitMs,
      illustrationDecodeMs,
      firstFrameRenderMs,
      estimatedDecodedRgbaBytes,
    }),
  };
}
