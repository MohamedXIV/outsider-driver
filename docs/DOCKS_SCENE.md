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

## Next pass (once cockpit base is ready)

1. Render the first playable Docks route with a fixed taxi camera; inspect the scene rather than inferring quality from the authored primitives.
2. Replace selected primitive constructions with reusable authored GLB meshes and atlases while preserving IDs, worldRoot, district intent and scene lifecycle. Avoid parallel scene systems.
3. Compare cheap painted unlit backgrounds against lightly cel-lit foreground materials in an actual in-game browser run (especially alongside the current passenger-sprite experiments).
4. Only then establish justified numerical performance budgets and a production art/GLB rollout.
