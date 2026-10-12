# Patchworks — Animated PixiJS Location Lab

**Status:** standalone technical visual proof with first authored SVG illustration layers, **not yet game-playable or approved final art**. [Draft PR #88](https://github.com/MohamedXIV/outsider-driver/pull/88), stacked on [#87](https://github.com/MohamedXIV/outsider-driver/pull/87) for cancellation-safe location transitions. The world-building/3D→2D architecture lives in [Draft #84](https://github.com/MohamedXIV/outsider-driver/pull/84).

## Real implementation

The dependency `pixi.js@8.22.0` is **exact-version locked in a genuine npm-produced** `package-lock.json`. The implementation is isolated under `src/visual/patchworks/` and reachable at `/anchor-lab.html` on the development server. Vite's normal production entry does **not** import the lab, so it does not add the Pixi renderer to the shipped taxi game's JS bundle.

- A 960×540 single Pixi canvas composes the shop's counter, roadside window, refurbished parts shelves, analog monitor, sign/practical lamp and alien partskeeper silhouette.
- Four **editable, source-owned SVG illustrations** now form the backplate, street vista, alien partskeeper portrait and foreground counter. These are intentional layered vector concept assets (retro industrial shapes, patinated cabinet parts, aged signage, hand-authored surface marks); no generative external bitmaps or opaque editor project are needed. They supersede the previous large rectangle/cabinet/counter/torso Pixi Graphics blockouts; the actual fan, light, vapor, eye/expression, CRT and passing street silhouette remain independently animated Pixi objects.
- A private ticker animates an overhead fan, screen scanline, fluctuating amber lamp, breathing/blinking character, drifting vapor and fine dust. The window now masks a gently drifting street depth layer and an intermittent ground-level alien passer.
- HTML expression probes ask about a rotor or inspections and update the vendor's rendered eyes/brow/head attitude without modifying Ink, trust or persistent world state. The scene remains a prototype, **not a playable narrative merchant**.
- The lab defaults its reduced-motion checkbox to the OS preference, allows a user override, and suspends its scene ticker for hidden documents. With Reduced Motion active, the compositor renders a static frame and **never starts the continuous ticker**; user-driven expression changes trigger a single explicit redraw. These are explicit scene-graph transformations; **no physically accurate light simulation** is claimed.
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

## Follow-up browser evidence

[Exact-head CI #38287312094](https://github.com/MohamedXIV/outsider-driver/actions/runs/38287312094) **passed** at `8d6cbe23` with 277 unit tests, 18 browser smoke tests and the dedicated Chromium Pixi proof. The [browser artifact](https://github.com/MohamedXIV/outsider-driver/actions/runs/38287312094/artifacts/11763807531) captures desktop, wary expression and compact touch, with JSON metrics. The actual animated canvas pixels changed, and the Reduced Motion canvas pixels remained identical; the synthetic hidden-tab test stopped updates and restored them after visibility returned. Two scene entries and exits released their fixture suspension and left no mounted canvas.

## Pending verification — layered illustration implementation

New SVG art layers live at `public/visual/patchworks/{shop-backplate,street-vista,partskeeper,counter-foreground}.svg`, authored as editable SVG and decoded into browser images on each isolated entry. `src/visual/patchworks/createPatchworksStage.ts` uses an **abort-aware, per-entry texture loader**, not Pixi's shared global asset cache. Each successfully created stage disposes its renderer and all four owned textures on departure; partial load failures release already decoded textures, destroy the temporary app and surface a visible error. No route/session/content ID is derived from filenames.

Layer pixel bases: backplate 960×540; street 240×190; portrait 230×240; foreground 960×540. Raw RGBA8 decoded backing area is approximately **4.34 MiB**, before browser renderer overhead, resizing, mipmaps or GPU format variation. **This is an arithmetic estimate, not GPU memory profiling.** No third-party artwork, runtime download, new npm dependency, artificial economy or separate animation loop is introduced. The drawings are **production-editable concept illustrations, not approved final detailed painted artwork**.

The dedicated Chromium probe now requires all four illustrated layers to load, reports per-entry owned-texture counts before and after disposal, and forces one SVG HTTP 503 to verify clean startup recovery. **These gates need an exact-head CI run before PASS is claimed.**

## Pending verification — zero-ticker reduced-motion enhancement

Reduced-motion `start()` now deliberately avoids activating Pixi's continuous ticker, and presentation-only HTML expression changes redraw once on demand. Scalar metrics are kept independent from Pixi's destroyed transforms; the browser probe additionally checks the ticker stays stopped, static frames remain pixel-identical, and the curious expression changes/reverts canvas pixels without a live animation loop. **This enhancement needs its own exact-head CI result before being marked proven.** No painted assets, canonical arrival or purchase is implied.

## Next integration gate (do not skip)

1. Reconcile GameSession and navigation PRs #72/#74; only a physically valid authored arrival may open a destination and only the canonical session can authorize departure.
2. Keep Pixi lazily loaded from the actual shop entry; Babylon suspends for the specific reason `location-anchor` and resumes without clearing independent Settings/visibility pauses.
3. Replace flat technical Graphics primitives with actual layered illustrated background and partskeeper art. Keep the dynamic lights and props independently controllable. This is a future **art pass**, not a reason to retune the entire 3D visual style.
4. Wire one genuine Ink conversation and one command-backed transaction or service; test save/reload and invalid location entry.
5. Measure Pixi chunk size, asset memory, entry latency, repeated load/unload GPU context behavior and an actual device frame-time sample before merging this dependency into the normal player route.

**Workflow policy:** the CI scene capture is gated to this exact PR branch; no routine image artifact added to unrelated branches. Keep PR #88 Draft until this is a validated preview and game integration is addressed.
