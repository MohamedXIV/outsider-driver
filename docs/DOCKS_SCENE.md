# The Docks — Authored Taxi Scenery (first implementation)

**Status:** Initial authored runtime scenery on a **draft stacked branch**, not an approved production GLB art pass.  
**Work:** [visual calibration #70](https://github.com/MohamedXIV/outsider-driver/issues/70), depends on [cockpit PR #73](https://github.com/MohamedXIV/outsider-driver/pull/73).  
**Art North Star:** [Asset Sheet on main](https://github.com/MohamedXIV/outsider-driver/blob/main/docs/ASSET_SHEET.md).

## Implementation scope

- `src/content/presentation/docksRouteScenery.ts` exports deterministic, JSON-compatible `TaxiSceneDefinition.assets` for The Docks. These are **authored presentation assets**, not a game-state model or a new world simulation.
- Existing `src/content/presentation/defaultTaxiScene.ts` composes this module into the **real** taxi scene without replacing the approved cockpit, camera, seat anchors or route-domain logic.
- Babylon's existing `createTaxiScene` material/geometry instancing and scene ownership render and dispose it. No dedicated renderer, editor, save schema or control system.
- Roads: twenty reused teal hand-painted SVG tiles over a continuous physically supported roadbed, painted center markings and sidewalks. Their tiled UV use avoids a single over-stretched 160m texture.
- Architecture: ten cylindrical industrial building volumes with floor/service bands, caps, enamel finishes, oval alien cargo insignia, and docking service pods.
- Roads above ground: two physical supported cross-road overpasses; explicit piers intersect decks, not flying roads.
- Cargo: two grounded freight carriers with four visible wheels each, rounded cab/tank massing, reused painted finish.
- Background: port crane, sea plane, painted/emissive road lamps.
- Three local, reusable illustration textures: `public/taxi/docks-road.svg`, `docks-enamel.svg`, and `docks-glyph.svg`. Signage uses **alien symbols**, not English.

## Artistic boundaries

The current implementation is **a real Babylon primitive/texture assembly**, not the final GLB asset set and not a finished Hybrid Cel Shader. Existing soft ambient/diffuse lighting handles nearby meshes; selected parts use authored emissive tint and drawn texture detail. Neither final custom material integration, real movement of street traffic, atmospheric effects, weather, performance budgets nor a measured 3D character/world lighting match is claimed.

### Rendering costs to measure

- Primitive mesh/instance count and material/draw-call count in actual browser.
- Actual decoded textures, GPU upload and frame timings; no conceptual polygon/VRAM guess treated as evidence.
- Alpha usage remains very limited; emissive lights are painted material properties rather than dozens of new Point Lights.
- Road readability, windshield occlusion, signs, bridge support visibility and scale at fixed camera positions.

## Automated checks authored

`src/content/presentation/docksRouteScenery.test.ts` checks:
- deterministic assets, unique IDs, strict schema and world parent;
- repeated colored road material and bounded physical roadway extent;
- two bridges and their load-bearing pier overlap; physically grounded wheel props and alien glyph;
- instantiated Babylon `NullEngine` meshes, diffuse painted texture, cabin-light isolation, scene disposal.

**Pending:** Node 24 `npm run check`, full browser visual screenshot comparison and perceptual art approval. Do not merge a draft PR before canonical dependencies, checks and visual acceptance.

## Browser evidence and corrective art pass — 2026-10-11

A real Vite/Chromium fixed-camera capture at commit `9fb7d05df969299b8bbdc06c451b5a95408e9b71` was archived in [CI run 38136763916](https://github.com/MohamedXIV/outsider-driver/actions/runs/38136763916), artifact [Docks taxi-camera art evidence](https://github.com/MohamedXIV/outsider-driver/actions/runs/38136763916/artifacts/11701510798). The ZIP contains `cockpit.png` 1600×900, `passenger.png` 1600×900, `compact.png` 900×900, plus metrics; artifact retention is only **3 days**. Full-resolution PNG bytes have not been permanently imported into the repo, though Git tracks this evidence link and review.

Measured screenshot pass (not GPU timing): **279 meshes/instances, 26 materials, 14 textures, 7,932 nominal triangles, 413ms startup-ready performance mark**. Babylon screenshot is valid but art-direction acceptance is **NOT** satisfied:

- Cockpit remains readable; the actual road and industrial silhouettes are visible.
- Painted teal roadway was too dark to communicate the approved district-specific colored street identity.
- Ten mostly upright cylindrical warehouses were repetitive and low-contrast; the concept's barrel warehouses and practical multi-era city layers did not read.
- Passenger-inspection screenshot checks the seat/cabin alone, not a rendered live passenger. Do not mistake it for character cohesion approval.

**Corrective implementation:** commits following this capture lighten *painted albedo/ambient emissive base* on road tiles and facades without adding Point Lights/shadowmaps/postprocessing; three older depot shells change to grounded elongated barrel-like warehouse silhouettes rather than only vertical cylinders. Shared texture and geometry instancing remain intact. The same fixed-camera screenshot must be captured again; the original metrics are a **before** snapshot, not a measurement of the revised art.

**Verification caveat:** original visual branch commit `fc1bd1e` passed all 279/279 unit tests/68 files and build/size budgets but had 17 browser passes, 1 compact-touch 30s timeout. Capture commit `9fb7d05` likewise passed foundation and produced screenshots, but Playwright reported **16 passed, 2 timed-out UI/browser tests** under SwiftShader. Base cockpit PR #73 previously passed all 18 tests in its own CI. This is not evidence that the visual branch is browser-green or that timeouts should be relaxed. New exact-head checks required; keep PR Draft.

## Next pass (once cockpit base is ready)

1. Render the first playable Docks route with a fixed taxi camera; inspect the scene rather than inferring quality from the authored primitives.
2. Replace selected primitive constructions with reusable authored GLB meshes and atlases while preserving IDs, worldRoot, district intent and scene lifecycle. Avoid parallel scene systems.
3. Compare cheap painted unlit backgrounds against lightly cel-lit foreground materials in an actual in-game browser run (especially alongside the current passenger-sprite experiments).
4. Only then establish justified numerical performance budgets and a production art/GLB rollout.
