# Production Performance Budgets

Outsider Driver uses coarse production budgets to catch meaningful regressions in the web build. These are release-hardening gates, not micro-optimization targets.

The canonical limits live in `config/performance-budgets.json`. `npm run build && npm run budget:check` measures the generated `dist/` output and fails when a size budget is exceeded. The normal `npm run check` path runs the same budget gate in CI.

## Baseline and limits

The limits were established from production `main` at `538b7dc6d7d57ca7653f4204c49fdad67a4ba895`.

| Metric | Observed baseline | Budget | Purpose |
| --- | ---: | ---: | --- |
| entry JavaScript | 1,161,446 B | 1,300,000 B | catch growth in the always-loaded application/Babylon entry |
| entry JavaScript gzip | 283,935 B | 325,000 B | bound initial compressed JS transfer |
| total JavaScript | 1,776,670 B | 2,001,000 B | bound aggregate production code/chunks |
| total JavaScript gzip | 439,109 B | 500,000 B | bound aggregate compressed JavaScript |
| largest lazy JS chunk | 114,610 B | 150,000 B | prevent a single deferred feature chunk from silently ballooning |
| initial HTML/CSS/module transfer | 321,781 B | 380,000 B | protect the first production navigation payload |
| Inochi2D WASM | 6,537,169 bytes | 7,000,000 bytes | catch a major runtime artifact increase |
| startup-ready | measured in Chromium CI | 5,000 ms | catch gross startup regressions without treating CI jitter as micro-performance |

The byte baselines above come from the first deterministic budget report on this branch. The initial-transfer measurement includes the HTML, entry module, stylesheet, and Vite modulepreload references emitted by the production index.

## Initial loading contract

The Inochi2D WASM is staged in the production output at `/vendor/inochi2d/inochi2d.wasm`, but it is not part of the initial HTML/module transfer budget. The runtime fetch happens when `InochiWasmBindings.create()` is invoked, so the large WASM payload stays outside first-paint transfer until an Inochi runtime is actually requested.

The browser smoke records `outsider-driver:startup-ready` immediately after the production application starts. Canonical desktop Chromium asserts that this mark remains below the configured startup budget.

Large systems that are not required for initial boot should stay behind dynamic imports or equivalent demand-driven loading when practical. A budget failure is a signal to inspect loading architecture before increasing a limit.

## Fixture isolation

`npm run fixture:inochi` creates browser-test assets under `dist/__fixtures__` only after the production build. Those files are not production assets.

`npm run budget:check` fails if `dist/__fixtures__` content exists in the production build being measured. Run the budget gate directly after `npm run build`, as CI does.

Production character assets may legitimately use Inochi formats later; the gate therefore rejects the CI fixture namespace rather than banning all `.inx` assets.

## Changing a budget

A budget may be raised when the production feature cost is intentional. The pull request that changes a limit must include:

1. the before/after measured value from `npm run budget:check`;
2. the feature or dependency change responsible for the increase;
3. why lazy loading, code splitting, asset reduction, or another architectural change is not preferable;
4. the new amount of headroom and why it remains a useful regression gate.

Do not raise a budget simply to make CI green. Conversely, do not spend engineering time shaving insignificant bytes or milliseconds solely to stay far below a limit. These gates exist to catch major regressions.

## 2026-10-09 narrowly measured aggregate-JS revision (#77 / PR #78)

The production first-ride runtime on PR #76 measured **2,248,428 B total JavaScript**, with entry **1,631,105 B**, exceeding the previous **2,000,000 B** and **1,300,000 B** ceilings. The first intervention compiled canonical authored `.ink` sources at build time so the browser keeps only `inkjs` Story instead of the full compiler; after this, the combined gameplay stack still failed the original entry and aggregate budgets.

Bundle attribution on [Actions 37875125039](https://github.com/MohamedXIV/outsider-driver/actions/runs/37875125039) found `inkjs/dist/ink.mjs` and Babylon scene/material/mesh modules dominating the entry. Isolating **Ink runtime and Zod into cached chunks**, retaining ES2024 compatibility and *hidden* production source maps and avoiding the legacy modulepreload polyfill reduced the canonical runner output to:

| Measured metric | Result | Limit before change |
| --- | ---: | ---: |
| Entry JavaScript | 1,168,527 B | 1,300,000 B — PASS |
| Entry gzip | 282,553 B | 325,000 B — PASS |
| Total JavaScript | 2,000,616 B | 2,000,000 B — **616 B over** |
| Total JavaScript gzip | 492,893 B | 500,000 B — PASS |
| Largest deferred JS | 127,084 B | 150,000 B — PASS |
| Initial HTML/CSS/modules gzip | 376,908 B | 380,000 B — PASS |
| Inochi WASM | 6,537,169 B | 7,000,000 B — PASS |

[Measured CI run 37875476448](https://github.com/MohamedXIV/outsider-driver/actions/runs/37875476448). ESNext and Oxc compression/mangling passes were tested and did **not** reduce the residual aggregate 616 B. Bundling small Babylon shader modules produced **1,998,957 B** total JavaScript, but added shader modules to the initial preload graph, increasing first-load gzip to **386,068 B** (6,068 B over its limit; [Actions 37876173709](https://github.com/MohamedXIV/outsider-driver/actions/runs/37876173709)). A narrower grouping gave **2,000,390 B** and **381,776 B initial** ([Actions 37876292018](https://github.com/MohamedXIV/outsider-driver/actions/runs/37876292018)), still failing two gates. Both shader-group experiments were **reverted**, specifically to protect the metered initial download. As measured earlier, lazily importing the entire session produced a 921,022 B chunk against a 150,000 B limit, so that was rejected too.

**Decision:** after a reduction of **247,812 B in aggregate JavaScript** versus #76 and large reductions in entry/gzip, the remaining *616 uncompressed bytes* do not justify breaking the initial-transfer budget or adding gameplay/rendering complexity. Increase **only** the aggregate-uncompressed ceiling **2,000,000 → 2,001,000 B** (+1,000 B, **0.05%**); the immediate headroom at this measured revision is just **384 B**. This change does **not** increase actual data downloaded and does **not** change the initial-transfer gzip cap, runtime/WASM, individual lazy-chunk, entry-size, compressed-total or startup deadlines. A future feature such as the active-ride HUD must still measure/re-evaluate its footprint rather than silently raising thresholds again. The exact-head CI must pass before PR #78 is called verified.


## 2026-10-13 canonical taxi-stop persistence revision (#86 / PR #89)

[Exact-head attempt #38346716248](https://github.com/MohamedXIV/outsider-driver/actions/runs/38346716248) with save v12 and route-authenticated arrival completed **306/306 unit tests (69 files), 42/42 save-compat tests, content checks, strict lint/typecheck and build**, then failed **only** the aggregate *uncompressed* JavaScript budget:

| Metric | Before new arrival (PR #78) | With v12 arrival | Existing cap | Result |
| --- | ---: | ---: | ---: | --- |
| Entry JavaScript | 1,168,527 B | 1,169,742 B | 1,300,000 B | PASS |
| Entry gzip | 282,553 B | 282,877 B | 325,000 B | PASS |
| Total JavaScript | 2,000,616 B | **2,001,831 B** | 2,001,000 B | **831 B over** |
| Total JS gzip | 492,893 B | 493,202 B | 500,000 B | PASS |
| Largest lazy chunk | 127,084 B | 127,084 B | 150,000 B | PASS |
| Initial transfer gzip | 376,908 B | 377,231 B | 380,000 B | PASS |

The feature adds a versioned v11→v12 migration, strict arrival/save validation and canonical session guards, with only a **323 B increase in measured initial compressed transfer**. More dynamic imports for this roughly 1.2 KB code path would fragment the synchronous authoritative settlement/persistence contract for a cosmetic raw-byte saving. The project already rejects broad splitting of the canonical session because that broke the 150 KB lazy-chunk constraint; see the earlier decision above.

**Proposed reviewable decision:** raise only `totalJavaScriptBytes` **2,001,000 → 2,002,000 B** (+1,000 B, 0.05% of previous cap) to accommodate the measured 831 B overflow; expected immediate headroom **169 B**. The total increase versus the original 2,000,000 B ceiling is **0.10%**. No other thresholds change. The future authored Patchworks route/anchor will require **another explicit architectural and budget review**, not an automatic extension of this small allowance. Keep PR Draft until exact-head CI passes and the cap change is reviewed.

## 2026-10-13 authored Patchworks route / 3D frontage (#86 / PR #90)

[Exact-head pre-lazy CI #38352645252](https://github.com/MohamedXIV/outsider-driver/actions/runs/38352645252) verified **308/308 Vitest (69 files), 42/42 save compatibility, strict TypeScript/lint and build** for the two-segment Docks Clinic → Outer Margin route, origin-safe second dispatch, and a read-only Babylon `RouteSceneryPresenter` integration. This builds an actual rendered stop, not a fictitious 2D teleport. The budget gate was the **only remaining failure** at that head:

| Metric | Measured | Previous cap | Result |
| --- | ---: | ---: | --- |
| Entry JavaScript | 1,178,129 B | 1,300,000 B | PASS |
| Entry gzip | 285,161 B | 325,000 B | PASS |
| Total JavaScript | **2,010,218 B** | 2,002,000 B | **8,218 B over** |
| Total gzip | 495,493 B | 500,000 B | PASS |
| Largest lazy chunk | 127,084 B | 150,000 B | PASS |
| Initial transfer gzip | **379,515 B** | 380,000 B | PASS (485 B left) |

Compared with the exact-head v12 baseline (2,001,831 B raw total; 377,231 B initial-transfer gzip), this route and visible Babylon frontage added **8,387 B total raw and 2,284 B initial transfer gzip**. This is a legitimate feature cost and the proximity to the initial-transfer limit warrants more than another naive cap increase.

**Architectural response:** pull `RouteSceneryPresenter` out of startup imports. Only request its code at the first actual taxi route, cache its constructor, use the **latest committed** session state on resolve, and ignore work after a scene change or disposal. No additional render loop or mutable game state. This should recover some initial transfer and keeps the heavy route compositor out of home/garage startup. Existing asynchronous arrival handling remains canonical (shop Pixi is still a separate PR).

**Reviewable aggregate-only decision:** provisionally adjust `totalJavaScriptBytes` **2,002,000 → 2,012,000 B** (+10,000 B, **0.50%** of the previous cap). This is measured against an actual +8,218 B shortfall, not a silent relaxation of every limit; anticipated headroom is 1,782 B before the lazy-loader refactor. **No gzip, initial transfer, lazy chunk, startup or WASM ceilings change.** Re-measure exact-head CI after lazy loading and record the final values. Still Draft until acceptance and reviewer acknowledgment. No claim of real device FPS.
