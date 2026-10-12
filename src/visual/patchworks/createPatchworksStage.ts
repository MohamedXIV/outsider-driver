import { Application, Container, Graphics } from 'pixi.js';
import type { AnimatedAnchorStage } from '../../app/presentation/AnimatedAnchorTransitionController';

/** A standalone authored 2D ambience study; no route, commerce or saves. */
export interface PatchworksStage extends AnimatedAnchorStage {
  getMetrics(): {
    readonly updates: number;
    readonly fanAngle: number;
    readonly warmLightAlpha: number;
    readonly reducedMotion: boolean;
  };
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
  if (signal.aborted) {
    app.destroy(true, { children: true });
    throw new Error('Patchworks scene request aborted.');
  }

  const stage = app.stage;
  // The painted-like palette and hand-composed silhouettes are a test scene,
  // not final artist-approved production backgrounds.
  stage.addChild(rect(0, 0, 960, 540, 0x243b3f));
  stage.addChild(rect(0, 0, 960, 148, 0x354e50));
  stage.addChild(rect(0, 147, 960, 10, 0x75806b));
  stage.addChild(rect(0, 157, 960, 194, 0x344747));
  stage.addChild(rect(0, 350, 960, 190, 0x4b4c42));

  // A street-facing window makes this a lived-in place in Outer Margin.
  stage.addChild(panel(40, 110, 252, 216, 27, 0x172f3c));
  stage.addChild(panel(51, 120, 230, 195, 22, 0x658a82));
  stage.addChild(panel(61, 129, 210, 169, 20, 0x223c52));
  const street = new Container();
  street.addChild(rect(75, 238, 180, 24, 0x677576));
  street.addChild(panel(94, 179, 55, 66, 8, 0x6f847d));
  street.addChild(panel(177, 159, 59, 86, 13, 0x415e65));
  street.addChild(circle(209, 173, 12, 0xb98755, 0.8));
  stage.addChild(street);
  stage.addChild(rect(159, 130, 12, 168, 0x8f8f7a));
  stage.addChild(rect(64, 211, 200, 11, 0x8f8f7a));

  // Aged storage cabinets and salvaged components.
  for (const [x, w] of [[324, 103], [431, 109], [742, 120]] as const) {
    stage.addChild(panel(x, 142, w, 221, 10, 0x7d7662));
    stage.addChild(panel(x + 7, 151, w - 14, 190, 7, 0x344c4c));
    for (let y = 192; y < 332; y += 65) {
      stage.addChild(rect(x + 9, y, w - 18, 6, 0xb5a179));
      stage.addChild(panel(x + 19, y - 29, 35, 26, 9, 0x927f66));
      stage.addChild(circle(x + 73, y - 14, 13, 0x4f8580));
    }
  }
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
  stage.addChild(rect(603, 38, 7, 70, 0x88745e));
  stage.addChild(new Graphics().poly([558, 111, 660, 111, 638, 144, 575, 144]).fill(0xb69b71));
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
  vendor.addChild(new Graphics().ellipse(0, 30, 68, 17).fill({ color: 0x15282c, alpha: 0.4 }));
  vendor.addChild(panel(-58, -3, 118, 95, 30, 0x85765f));
  vendor.addChild(new Graphics().ellipse(0, -52, 52, 64).fill(0x729a8d));
  vendor.addChild(new Graphics().ellipse(-42, -53, 18, 25).fill(0x729a8d));
  vendor.addChild(new Graphics().ellipse(42, -53, 18, 25).fill(0x729a8d));
  vendor.addChild(circle(-19, -62, 8, 0x253b39));
  vendor.addChild(circle(19, -62, 8, 0x253b39));
  const blink = rect(-34, -71, 67, 16, 0x729a8d);
  blink.alpha = 0;
  vendor.addChild(blink);
  stage.addChild(vendor);

  // Warm working counter and foreground objects frame the character.
  stage.addChild(panel(264, 365, 629, 93, 16, 0xa69375));
  stage.addChild(rect(270, 381, 619, 18, 0xd0b589));
  stage.addChild(panel(291, 444, 579, 81, 8, 0x5a534c));
  stage.addChild(panel(334, 344, 103, 33, 8, 0x69736b));
  stage.addChild(circle(482, 362, 16, 0x839e85));
  stage.addChild(panel(767, 329, 76, 42, 9, 0x444f52));
  stage.addChild(circle(807, 348, 10, 0xe5b76b, 0.8));

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
  let playing = false;
  let destroyed = false;
  const tick = (ticker: { deltaTime: number }): void => {
    elapsed += Math.min(ticker.deltaTime, 2);
    updates++;
    if (reducedMotion) return;
    fan.rotation += 0.032 * ticker.deltaTime;
    warmGlow.alpha = 0.06 + 0.025 * Math.sin(elapsed * 0.061) +
      (Math.sin(elapsed * 0.191) > 0.91 ? 0.045 : 0);
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
  app.render();

  return {
    canvas: app.canvas,
    start: () => {
      if (destroyed || playing) return;
      playing = true;
      app.start();
    },
    stop: () => {
      if (destroyed || !playing) return;
      playing = false;
      app.stop();
    },
    dispose: () => {
      if (destroyed) return;
      destroyed = true;
      playing = false;
      app.stop();
      app.ticker.remove(tick);
      app.destroy(true, { children: true });
    },
    getMetrics: () => ({
      updates,
      fanAngle: fan.rotation,
      warmLightAlpha: warmGlow.alpha,
      reducedMotion,
    }),
  };
}
