# Docks Barrel Terminal — Source-Owned GLB v0.1

**Status:** Draft source-owned GLB with budget-optimized build-time Babylon geometry projection and four authored Docks placements. **Browser visual acceptance is still pending**.  
**Work branch:** [Draft PR #80](https://github.com/MohamedXIV/outsider-driver/pull/80), stacked on [cockpit PR #73](https://github.com/MohamedXIV/outsider-driver/pull/73).  
**Art identity:** [Style Bible](STYLE_BIBLE.md) and [Asset Sheet](ASSET_SHEET.md).

## Source of truth

`scripts/build-docks-barrel-glb.mjs` is a deterministic Node authoring source (not a runtime mesh builder). It produces `public/city/docks-barrel-terminal.glb` from basic curved geometry and a generated **embedded hand-painted 128×128 PNG enamel atlas**.

Model asset ID: `bld_ind_barrel_terminal`.

- 20-segment oval, horizontal capsule-like industrial shell (not a vertically repeated tower).
- Front/rear bulkheads with outward-facing normals.
- Two trim bands and alien-scale freight aperture.
- Six glTF mesh primitives, three deliberately low-metallicity, rough material families.
- Non-human local proportions, distinct painted surface wear, no hovering, no complex real-time lighting.
- Rebuildable by Git + Node 24, with no Blender executable or npm package added to generate the content.

Run `npm run city:assets`; both `npm run dev` and `npm run build` call it before Vite so deploy artifacts carry the GLB. The generated binary is ignored in Git intentionally: **changes to geometry or palette require a reviewed commit to the builder**, not opaque art edits. `src/content/presentation/docksBarrelGlb.test.ts` tests byte determinism, valid GLB header/chunks/buffer bounds, PNG signature, material list, and valid indexed triangle streams.

## Budget-driven runtime asset pipeline decision — 2026-10-11

A first direct browser import was implemented with `@babylonjs/loaders@9.28.0` using its official plugin and `LoadAssetContainerAsync`. It passed **285/285 unit tests**, TypeScript and production build, but it failed the unchanged bundle budget. Exact measured CI evidence at [run 38140392003](https://github.com/MohamedXIV/outsider-driver/actions/runs/38140392003):

| Measure | Direct official browser loader | Existing budget |
| --- | ---: | ---: |
| Total JavaScript | 3,865,613 B | 2,000,000 B |
| Total JavaScript gzip | 985,781 B | 500,000 B |
| Largest lazy JS chunk | 716,978 B | 150,000 B |

This cost was disproportionate for a curated taxi-view city and a six-primitive warehouse. **We did not raise size budgets, disable strict TypeScript, or ship CDN runtime loaders.**

The current solution is instead a **source-owned build-time projection**:

- One deterministic Node authoring script creates three *corresponding outputs* from the same six-part geometry and paint source: `docks-barrel-terminal.glb` (standard reusable authoring/export asset), `docks-barrel-terminal.render.json` (validated, compact Babylon geometry buffers), and `docks-enamel.png` (painted albedo).
- `npm run city:assets` runs ahead of `dev` and `build`; all three generated artifacts are ignored in Git while the generator and its tests are versioned.
- The Zod `TaxiSceneDefinition.models` records the stable ID and source GLB file; the taxi adapter resolves its sibling `.render.json` and loads that **once per source** via fetch.
- Babylon `VertexData` and shared `StandardMaterial` render the resulting geometry; the same mesh is instantiated across **four Docks warehouse placements** under `worldRoot`.
- Source validation checks all vertex/index lengths and finite values; lifecycle cancellation discards late responses from a disposed taxi scene. The capture script waits for `scene.metadata.cityModelsReady`.

**Scope limit:** this is a single optimized, deterministic authoring format — **not** general runtime import of arbitrary third-party GLBs. A general model pipeline for artist-supplied Blender exports must design a separate **build-time conversion** with format validation. This deliberately preserves texture-driven, low-overdraw Babylon rendering without bundling the expensive general glTF loader in the player application.

## QA #81 — complete green render-pause browser checkpoint

[CI #38146830737](https://github.com/MohamedXIV/outsider-driver/actions/runs/38146830737) on code + exact documentation head `2c1cbbc671041bb697de9a618bca42d901b5a7e8` completed **SUCCESS**: **290/290 unit tests across 71 files**, strict lint/typecheck, production build and the original JS budgets (total gzip **448,279 / 500,000 bytes**), **18/18 cross-browser Playwright tests** including previously flaky Desktop Settings keyboard dismissal and Compact Touch touch interaction with its new real canvas resolution assertion. Screenshot capture/metrics also **SUCCESS**. No skipped tests, increased timeouts, additional render infrastructure or relaxed budgets.

[Fixed-camera evidence artifact #11704913440](https://github.com/MohamedXIV/outsider-driver/actions/runs/38146830737/artifacts/11704913440) recorded **279 meshes, 31 materials, 17 textures, 9,012 nominal triangles and 24 compact GLB-source-derived meshes**. The 1600×900 driver-cockpit PNG is **pixel-for-pixel identical** to low-raster v0.3 pre-menu-pause capture, as expected because the menu is closed during capture. The art style and visible road did not change. Single startup-ready marker sample 360.5ms. Headless SwiftShader timing probe saw 33 of 60 requested scene frames in 15 seconds: median interval 421.3ms, median CPU render 1.7ms. Not a device FPS or GPU-time benchmark.

**QA status:** a genuine mitigation of rendering contention has now passed full browser CI once. Because earlier same-art runner results alternated between 18/18 and 17/18, one repeat ordinary CI pass is useful before declaring #81 **stably** resolved. This documentation-only update naturally triggers a fresh PR CI run; do not schedule a separate manual rerun just for optics. Preserve the QA issue until that result is known.

## QA #81 — Settings modal explicitly pauses background 3D rendering

The next scoped [CI #38146042284](https://github.com/MohamedXIV/outsider-driver/actions/runs/38146042284) with the High-DPI backing-buffer cap confirmed the compact-touch **test (including actual raster-density assertion) passed**, but Chromium Desktop Settings **timed out again**, for 17/18. This establishes that GPU pixel density is not the sole cause of Chromium UI latency on constrained software-renderer workers; **#81 remains open**.

A player-facing rendering lifecycle correction now pauses the continuous Babylon `runRenderLoop` **only while the Settings modal is visibly open**, and resumes precisely on close. `createGameSurface` exposes a typed Settings visibility subscription; `main.ts` explicitly wires it to `BabylonRenderingRuntime.setSettingsOverlayOpen`. There are no DOM-selector polls, CSS visibility guesses or test-only toggles in the render loop. The UI remains responsive while a static last-rendered taxi frame is held behind Settings; this is normal game-menu pause behavior, not a change in game time, save semantics or controls.

The render lifecycle keeps the existing start/dispose guards and is idempotent across repeated open/close. Its browser acceptance contract remains unchanged: actual Settings keyboard Escape/focus/persistence plus real touch action must pass. No test timeout, retry, bundle budget or render-cost limit has been relaxed. Because `src/main.ts` is also used by adjacent gameplay branches, this connection must be reconciled with pending gameplay PRs before any merge (do not fork a parallel game bootstrap).

## QA #81 — product-level high-DPI 3D drawing-buffer cap

The repeat of reduced-raster v0.3 (doc-only head `edc7e430b488bdea5ba4ecb38a0248d2a214a99f`, [CI #38145438902](https://github.com/MohamedXIV/outsider-driver/actions/runs/38145438902)) **was not fully stable**: **287/287 unit tests/build passed**, **17/18 browser smokes passed**, but the Chromium **compact-touch** UI test hit its 30-second whole-test timeout again. Desktop Chromium Settings passed. **Thus smaller art texture raster alone is NOT a complete fix**, and the original one-time 18/18 v0.3 result cannot be called a definitive root-cause proof.

The new product fix caps Babylon's 3D backing surface to **1.5 physical pixels per CSS pixel** across high-DPI devices. The test's emulated Pixel 5 previously drew an approximately **1080×1999 canvas behind a ~393px-wide CSS surface** (~2.75x density), multiplying expensive SwiftShader pixel work without changing touch coordinates. A 1.5x density targets ~590px width and substantially fewer shaded pixels, while desktop DPR 1 remains unchanged. The UI itself, gesture/touch coordinates, accessibility settings, tests, and CPU/GPU budgets are **not** scaled or relaxed. `BabylonRenderingRuntime` applies the cap on initialization and resize; `hardwareScalingForDpr` has desktop/retina/invalid-DPR unit tests, and the existing compact-touch browser contract now asserts the actual WebGL backing resolution relative to the canvas CSS width.

This is a **production rendering optimization for low-end and high-DPI hardware**, not a CI-only branch or suppressed assertion. The exact-head browser test must verify its effectiveness and touch behavior; do not close #81 simply because the cap was committed. Game-canvas sharpness on actual Android must still be assessed visually.

## QA #81 — reduced raster-cost A/B (2026-10-11)

The prior `bba7e8d` run (small paint textures) passed 18/18 browser smokes; v0.2 enlarged barrel paint 128→256 pixels and introduced a warehouse facade at SVG native 512×512. Two Chromium settings/touch tests then repeatedly timed out **both with and without profiling preceding the smoke suite**, while Firefox/WebKit and foundation passed. This does not prove a particular texture caused the slowdown.

This diagnostic v0.3 changes **only the raster load of the painted assets** relative to v0.2: the barrel albedo outputs 128×128 pixels (sampling the same authored three-band, cargo-oval/seam recipe at half resolution) and the SVG facade declares 256×256 raster dimensions while retaining the complete original 512-unit vector design/viewBox. Runtime geometry, material definitions, scene/test logic, and budgets are unchanged. The pixel-level asset tests sample the corresponding physical positions at half size.

**Measured v0.3 result:** [CI #38144978970](https://github.com/MohamedXIV/outsider-driver/actions/runs/38144978970) completed **SUCCESS** at exact head `4c9a75bba58258b9ebe3cc695afe9122aba0e8b5`: **287/287 unit tests (70 files)**, typecheck/lint/build/size budgets, **18/18 original cross-browser smoke tests**, and real driver/passenger/compact Babylon screenshots. [Three-camera artifact #11704059673](https://github.com/MohamedXIV/outsider-driver/actions/runs/38144978970/artifacts/11704059673) (temporary).

Actual art screenshot: **279 meshes/instances, 31 materials, 17 texture objects, 9,012 nominal triangles**, source-derived model meshes **24**; startup-ready single capture sample 287.1ms. Compared with v0.2 fixed 1600×900 screenshot, the RGB mean-absolute-channel difference is **0.047 / 255**, and only **0.061% of pixels** differ by more than 8 levels in any channel. This is a *pixel-level comparison of the specific fixed camera*, not a user aesthetic acceptance or guarantee across routes.

Headless SwiftShader art-capture probe yielded **52 frame intervals out of 60 requested in the 15s window** (vs v0.2's 17). Median callback interval **289.1ms** (v0.2 653.7ms), p95 **573.5ms** (v0.2 1021ms); measured scene CPU render **median 1.4ms/p95 3.7ms** (v0.2 1.7/4.7). Different CI instances are not an exact paired hardware benchmark and neither interval nor CPU duration is GPU frame time or device FPS. **A/B correlation supports raster cost as a culprit but does not establish sole causality**; do not increase game performance claims.

**Decision:** keep lower raster sizes because the same approved silhouettes/details remain visible at the taxi camera with the browser suite green and low asset cost. No product UI/Settings changes, timer increases or budget relaxations needed. Leave root-cause QA #81 open until stability is confirmed on a further ordinary PR run/local target (do not create gratuitous rerun workflows).

**Decision gate:** run the full unchanged browser suite on this exact commit and compare against v0.2 16/18 and old v0.1 18/18. If it remains slow, do not claim the resolution change fixed anything or keep re-running Action jobs speculatively. Use targeted local A/B and trace/resource profiling next. Keep #81 open until root cause or a stable validated correction is demonstrated.

## Art calibration v0.2 — selective painted cel tone (2026-10-11)

**New proposed pass — pending screenshot review:** the deterministic barrel texture has moved from a mostly uniform 128×128 enamel surface to a **256×256 illustrated atlas** with three intentional warm/neutral/cool directional tone regions, low-frequency brush wear, panel seams/rivets and bold oval amber/teal glazed openings. All details are baked into the SAME texture used by the exported authoring GLB and the compact Babylon runtime model. No new loader, global shader, outline post-process, dynamic light or shadow map is added.

The remaining upright rounded warehouse family now uses dedicated `/taxi/docks-warehouse.svg` facade art: larger illustrated vents/windows, alien cargo pictograms and worn painted structural bands. Existing vehicle tanks and supports keep the older generic industrial enamel sheet; they **do not** inherit building windows.

This is an inexpensive **soft-cel/painterly treatment through painted albedo plus the current scene lighting**, **not** an implemented dynamic custom toon shader. A future optional banded-light shader must be tested separately if this handpainted approach is insufficient.

### Real-browser frame measurement

`scripts/capture-taxi-scene.mjs` now waits for authored geometry readiness and measures a fixed-camera scene from the browser's live Babylon render loop after 15 warmup renders, aiming for 60 samples (15s cap). It records:

- **Scene frame intervals**: time between `onAfterRenderObservable` callbacks (includes scheduling/throttling, not just rendering).
- **Scene CPU render duration**: observed elapsed time from `onBeforeRenderObservable` to `onAfterRenderObservable` (not GPU profiling).
- Median, p95, mean, actual sample count and whether sample collection timed out, plus GLB-source-derived mesh count.

GitHub CI uses headless Chromium with SwiftShader; results can compare runs in the same environment but are **not** representative GPU FPS on players' devices. Do not claim GPU frame time, measured mobile performance or final acceptance from these numbers. Preserve current JavaScript and startup budgets.

**Comparison baseline:** previous v0.1 exact-head capture `bba7e8d`, [artifact #11702992254](https://github.com/MohamedXIV/outsider-driver/actions/runs/38140934805/artifacts/11702992254), reported 279 meshes, 31 materials, 17 textures and 9,012 nominal triangles; it did **not** record frame intervals, so no historical frame-time A/B exists yet.

## Verification and acceptance still needed

## Review and QA gates

- [ ] CI passes on exact generator commit (lint, tests, build, budget).
- [ ] Generated GLB passes programmatic structural and texture checks.
- [x] Official loader cost evaluated and rejected on unchanged size budgets; strict model-reference schema committed.
- [ ] Verify four GLB-source-derived Babylon instances in actual browser screenshots and scene metrics.
- [ ] Verify async loading races/re-entry/disposal under exact-head browser/adapter tests (guard code implemented).
- [ ] Fixed-camera browser captures show actual imported meshes replacing primitives.
- [ ] Texture memory, load size and real frame time measured; visual approval pending.

**Performance:** asset is intentionally small, but no exact VRAM/frame-time claim is made here. A binary/file size is not a GPU memory budget.
