# Docks Barrel Terminal — Source-Owned GLB v0.1

**Status:** Draft runtime-integrated glTF 2.0 asset; official Babylon loader and four authored Docks instances implemented, **browser visual acceptance still pending**.  
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

## Actual in-engine loader implementation — first draft

A pinned **`@babylonjs/loaders@9.28.0`** dependency, matching `@babylonjs/core@9.28.0`, now belongs to the project lockfile. Dependency metadata was resolved by npm in the branch CI, uploaded as a review artifact, and applied via GitHub connector rather than hand-guessed.

`TaxiSceneDefinitionSchema.models` optionally validates stable IDs, `/city/*.glb` source URLs, world-only placement and transforms. Duplicate IDs are rejected across both primitive assets and model references. The `defaultTaxiSceneDefinition` uses four authored references to one `docks-barrel-terminal.glb`; the earlier primitive barrel variants for those four placements are no longer emitted.

`src/rendering/taxi/loadTaxiCityModels.ts` is the **existing taxi scene's** Babylon adapter: lazy-loads the official GLB plugin, decodes each distinct GLB source once, instantiates authored references under `worldRoot`, and attaches source container lifetime to scene disposal. An async load from a disposed/replaced taxi scene is discarded. Actual load failures from a live scene remain observable as browser errors and a rejected `TaxiSceneHandle.modelLoading` promise.

Fixed-camera browser capture waits for `scene.metadata.cityModelsReady` before taking screenshots, making the model visibility a tested review requirement. Do not infer success from the generator alone.

**Performance guardrail:** Official loaders are lazy imports, not included in the initial application entry. Keep **all existing JavaScript/budget limits unchanged** until measuring the actual impact; do not relax lazy-chunk or total-code budgets just to make the importer pass.

## Remaining gates

## Review and QA gates

- [ ] CI passes on exact generator commit (lint, tests, build, budget).
- [ ] Generated GLB passes programmatic structural and texture checks.
- [x] Official glTF loader dependency pinned with npm-resolved integrity and strict model-reference schema committed.
- [ ] Verify actual imported GLB instances in new browser screenshots and scene metrics (wiring implemented).
- [ ] Verify async loading races/re-entry/disposal under exact-head browser/adapter tests (guard code implemented).
- [ ] Fixed-camera browser captures show actual imported meshes replacing primitives.
- [ ] Texture memory, load size and real frame time measured; visual approval pending.

**Performance:** asset is intentionally small, but no exact VRAM/frame-time claim is made here. A binary/file size is not a GPU memory budget.
