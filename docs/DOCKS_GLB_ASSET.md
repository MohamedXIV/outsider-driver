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
