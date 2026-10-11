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

## Decision gates

- [x] Captures use real Babylon geometry and fixed in-game camera.
- [x] The hybrid/prod screenshot is a valid baseline.
- [ ] Corrected textured-unlit and flat-graphic controls look meaningfully distinct and readable; replace superseded comparisons.
- [ ] Compare composition, colored asphalt, silhouette hierarchy, line/detail readability and emissive/signage integrity side by side.
- [ ] Establish a **small authored Garage/Home calibration pass** instead of inventing a separate engine pipeline.
- [ ] Capture actual puppet-in-cabin cohesion separately; a passenger-inspection camera of an empty seat is NOT puppet lighting acceptance.
- [ ] Decide final renderer material recipe only after inspecting actual corrected fixed-camera comparisons and bounded-space cohesion.

**Current design tendency (provisional):** keep the **existing textured hybrid** rather than introducing a broad custom shader. For far skyline, a real, readable painted unlit treatment may still be worthwhile. The initial invalid darkened controls are excluded from this judgment. Maintain visible teal/pigmented asphalt; avoid generic cyberpunk neon, multiple dynamic lights, vertex wobble or shimmer.

No arbitrary timeouts, test assertions or bundle budgets were relaxed in capturing this evidence.
