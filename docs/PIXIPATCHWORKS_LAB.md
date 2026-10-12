# Patchworks — Animated PixiJS Location Lab

**Status:** standalone technical visual proof, **not yet game-playable or approved final art**. [Draft PR #88](https://github.com/MohamedXIV/outsider-driver/pull/88), stacked on [#87](https://github.com/MohamedXIV/outsider-driver/pull/87) for cancellation-safe location transitions. The world-building/3D→2D architecture lives in [Draft #84](https://github.com/MohamedXIV/outsider-driver/pull/84).

## Real implementation

The dependency `pixi.js@8.22.0` is **exact-version locked in a genuine npm-produced** `package-lock.json`. The implementation is isolated under `src/visual/patchworks/` and reachable at `/anchor-lab.html` on the development server. Vite's normal production entry does **not** import the lab, so it does not add the Pixi renderer to the shipped taxi game's JS bundle.

- A 960×540 single Pixi canvas composes the shop's counter, roadside window, refurbished parts shelves, analog monitor, sign/practical lamp and alien partskeeper silhouette.
- A private ticker animates an overhead fan, screen scanline, fluctuating amber lamp, breathing/blinking character, drifting vapor and fine dust. These are explicit scene-graph transformations; **no physically accurate light simulation** is claimed.
- Text, buttons, focus, reduced-motion control and technical status remain native HTML outside the GPU canvas.
- `AnimatedAnchorTransitionController` handles the lab's entry/loading/scene ownership and teardown. The lab's arrival and Babylon suspension ports are **fixtures**; it does NOT simulate an actual taxi arrival.
- No authoritative credits, inventory, time, Ink transactions or persistent state are connected yet. Do **not** suggest that clicking a button purchases anything in the game.

## Verified first real browser pass

[CI #38264739180](https://github.com/MohamedXIV/outsider-driver/actions/runs/38264739180) completed **SUCCESS** at `804e970`: 277/277 unit tests / 68 files, strict lint/typecheck/build/budget, 18/18 Playwright game smoke, and the dedicated Chromium/SwiftShader Patchworks Lab capture. [Actual browser screenshots and measurements](https://github.com/MohamedXIV/outsider-driver/actions/runs/38264739180/artifacts/11753883654) (temporary artifact) show desktop 1280×900 and mobile Pixel-5-shaped capture.

- Browser inspection: after entry, the fan angle advanced from **0.9279 to 1.8879 radians** and warm-light alpha from **0.0845 to 0.1223** while the Pixi ticker advanced from 29 to 34 updates.
- Exit removed the Pixi canvas, restored the test suspension and returned the controller to `idle`; no error events recorded.
- Reduced-motion entry held fan at zero and light at fixed state while retaining the rendered scene.
- Compact touch entered and exited the lab in actual Chromium emulation.
- Main-production JS budget remained **1,780,890 B of 2,000,000 B**; gzip **440,253 B of 500,000 B**. This is NOT a bound on `anchor-lab.html`'s separately loaded Pixi code.

**Limits:** the scene art is **minimal flat-color blockout**, not an approved high-fidelity hand-painted character/environment. The CI timing is Chromium with software-rendered SwiftShader, *not an actual-device GPU FPS test*. Canvas load and context memory must be profiled on hardware before the second renderer is accepted broadly.

## Stronger artifact checks — pending exact-head verification

The capture utility additionally verifies that two actual **Pixi canvas screenshots** differ while animation is enabled, and are identical after Reduced Motion is selected. It checks repeat enter→exit (two suspension releases, no stale canvas), plus a real mobile touch exit. These checks must pass on the new exact head before calling the pixel assertions verified; previous successful CI proves animation counters only.

## Next integration gate (do not skip)

1. Reconcile GameSession and navigation PRs #72/#74; only a physically valid authored arrival may open a destination and only the canonical session can authorize departure.
2. Keep Pixi lazily loaded from the actual shop entry; Babylon suspends for the specific reason `location-anchor` and resumes without clearing independent Settings/visibility pauses.
3. Replace flat technical Graphics primitives with actual layered illustrated background and partskeeper art. Keep the dynamic lights and props independently controllable. This is a future **art pass**, not a reason to retune the entire 3D visual style.
4. Wire one genuine Ink conversation and one command-backed transaction or service; test save/reload and invalid location entry.
5. Measure Pixi chunk size, asset memory, entry latency, repeated load/unload GPU context behavior and an actual device frame-time sample before merging this dependency into the normal player route.

**Workflow policy:** the CI scene capture is gated to this exact PR branch; no routine image artifact added to unrelated branches. Keep PR #88 Draft until this is a validated preview and game integration is addressed.
