# Visual Calibration — In-Engine Material Treatment Review

Status: **Draft / visual decision not yet accepted**, issue [#70](https://github.com/MohamedXIV/outsider-driver/issues/70), implementation [Draft PR #80](https://github.com/MohamedXIV/outsider-driver/pull/80).

## Capture contract

`scripts/capture-docks-material-comparison.mjs` launches the **actual** Vite/Babylon player scene and awaits authored model loading, then captures the identical 1600×900 driver camera, unchanged scene, geometry, time and authored lights. It temporarily adjusts existing `StandardMaterial` instances on **worldRoot only**. The cabin, navigation, Settings and gameplay are not replaced. No alternate material version is shipped in the player.

| Profile | Meaning | Current production? |
| --- | --- | --- |
| `hybrid-production` | Hand-painted building and road albedo plus current soft directional/practical lighting | Yes |
| `painted-unlit` | Same painted textures routed through emission rather than scene lighting | No — review-only proxy for far/unlit backdrops |
| `flat-graphic-control` | World materials rendered with a limited warm-neutral-cool emissive palette, excluding emissive signage | No — review-only **graphic flat control, not genuine normal-dependent toon/cel lighting** |

The flat graphic control is deliberately labeled accurately. No conclusion about the cost/quality of a real toon shader can be made from these screenshots. If a normal-dependent cel shader remains compelling, it needs its own narrow follow-up benchmark and proper same-geometry proof.

## Initial 2026-10-11 experiment (superseded controls)

[First browser artifact](https://github.com/MohamedXIV/outsider-driver/actions/runs/38152543793/artifacts/11706966998), [CI](https://github.com/MohamedXIV/outsider-driver/actions/runs/38152543793): **production foundation PASS, 18/18 browser PASS and real image capture PASS**. The hybrid image is a valid player-game screenshot. However, **do not compare the two review-only controls in this artifact**: disabling StandardMaterial lighting while zeroing emission made many world surfaces almost black; it is not a valid painted-unlit or flat-palette look. The reviewer subsequently corrected the capture-only treatment to explicitly route painted texture/palette through emission and reject identical variant images. The corrected outputs require exact-head visual review before making any art choice.

The same initial artifact also contains **real Garage and Home production-scene screenshots**, obtained using their existing dedicated probe entry points. They reveal a material quality disparity: these spaces remain minimal dark blockout boxes with isolated strong highlights, visibly behind the taxi and Docks. They are *not* compatible evidence for claiming cross-scene art cohesion.

## Corrected material comparison — valid evidence

The corrected capture-only `StandardMaterial` controls explicitly route their painted albedo through `emissiveTexture` (or graphic palette through `emissiveColor`) rather than setting emission to zero. The script now **rejects byte-identical screenshots**, so an ineffective material experiment cannot silently pass as three valid looks. [Exact-head CI #38153222627](https://github.com/MohamedXIV/outsider-driver/actions/runs/38153222627) is **SUCCESS** (290/290 unit tests, 71 files, strict lint/typecheck, production build and budgets, 18/18 Playwright, fixed-camera comparison/garage/home capture). [Corrected real-browser artifact #11707811581](https://github.com/MohamedXIV/outsider-driver/actions/runs/38153222627/artifacts/11707811581) contains all five named material/bounded-space screenshots and metrics.

**Visual findings at the exact same driver camera, scene, materials source and lighting setup:**

| Treatment | What the screenshots actually show | Decision |
| --- | --- | --- |
| `hybrid-production` | The muted teal/pigmented road remains identifiable, painted oval-window/barrel depots show material wear and volume, and warm taxi controls are legible in context. Night scene still looks simplified and darker than the concept board. | **Keep as current production look** and calibrate selectively. |
| `painted-unlit` | Replacing world lighting with full emissive painted texture makes concrete, road and barrels nearly white; flattens depth and destroys night-time hierarchy. | **Reject as universal treatment.** Cheap distant/backdrop emissive impostors may still work after separate exposure calibration. |
| `flat-graphic-control` | A reduced three-value palette preserves big silhouettes but loses the actual painted windows, wear and colored-road nuance; looks more like simplified untextured blockout geometry. | **Reject as an all-world replacement.** It does not test normal-dependent toon shading. |

In a clearly defined approximate road/building viewport ROI (pixels `x=300..1449, y=110..469` of the **1600×900** fixed camera), pixel luminance over **220/255** occupies **0% hybrid, 38.25% painted-unlit, 0% flat graphic**. This is a screen-space exposure diagnostic to support the visible overexposure, **not** a texture/GPU performance measurement or universal art-quality score.

**Cross-scene cohesion:** actual Garage and Home screenshots still show extremely sparse dark blockout scenes with isolated emissive highlights. Their baseline and practical calibration work are tracked by [#82](https://github.com/MohamedXIV/outsider-driver/issues/82), taking care not to edit the ongoing gameplay navigation PR #74. **Do not mark #70 complete** while those scenes remain incoherent with the taxi or while actual Inochi passenger-in-cabin screenshot evidence is absent.

**Renderer recommendation for this slice:** retain **hand-painted texture + restrained soft scene-lighting** as the visual north star, with selective emissive functional displays and potentially cheap painted distant impostors. A *real* cel shader, if ever pursued, must be compared on the same camera with a real stepped normal-dependent lighting implementation, not mislabeled as this flat control. Avoid broad shader architecture without a justified benefit.

## Decision gates

- [x] Captures use real Babylon geometry and fixed in-game camera.
- [x] The hybrid/prod screenshot is a valid baseline.
- [x] Corrected controls produce distinct actual browser images; initial broken controls excluded; unlit and flat control not selected.
- [x] Side-by-side fixed-camera review completed with documented colored asphalt, exposure, silhouette and detail tradeoffs.
- [ ] Establish a **small authored Garage/Home calibration pass** instead of inventing a separate engine pipeline.
- [ ] Capture actual puppet-in-cabin cohesion separately; a passenger-inspection camera of an empty seat is NOT puppet lighting acceptance.
- [ ] Decide final renderer material recipe only after inspecting actual corrected fixed-camera comparisons and bounded-space cohesion.

**Current design tendency (provisional):** keep the **existing textured hybrid** rather than introducing a broad custom shader. For far skyline, a real, readable painted unlit treatment may still be worthwhile. The initial invalid darkened controls are excluded from this judgment. Maintain visible teal/pigmented asphalt; avoid generic cyberpunk neon, multiple dynamic lights, vertex wobble or shimmer.

No arbitrary timeouts, test assertions or bundle budgets were relaxed in capturing this evidence.
