# Docks Barrel Terminal — Source-Owned GLB v0.1

**Status:** Draft first real, reproducible textured glTF 2.0 binary asset. **Generator and tests committed; actual in-game GLB loading not yet integrated**.  
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

## Next integration gate — still open

`TaxiSceneDefinitionSchema` currently accepts primitive shapes only and has synchronous scene creation. It **does not yet accept imported GLB instances**, nor does the package include `@babylonjs/loaders`.

**Do not** fake GLB support by renaming a primitive, writing a partial bespoke glTF parser in the Babylon adapter, or making a parallel taxi renderer. Next work should deliberately add `@babylonjs/loaders` at a matching pinned version, update `package-lock.json`, design a validated model reference discriminant in the existing TaxiSceneDefinition, then use the official asynchronous Babylon load path with abort/dispose-safe lifecycle and material treatment compatible with the Hybrid Art Style.

Only after this can we replace the old primitive `docks-left-1-shell` family with **actual GLB instances** and recapture the same 1600×900 gameplay-camera composition. The generator and its source-controlled asset alone do **not** qualify as runtime integration or visual acceptance.

## Review and QA gates

- [ ] CI passes on exact generator commit (lint, tests, build, budget).
- [ ] Generated GLB passes programmatic structural and texture checks.
- [ ] Official glTF loader dependency and strict asset-content discriminant integrated.
- [ ] Repeated asset instances load within the **existing** taxi scene/worldRoot.
- [ ] Async loading races/re-entry/disposal handled and tested.
- [ ] Fixed-camera browser captures show actual imported meshes replacing primitives.
- [ ] Texture memory, load size and real frame time measured; visual approval pending.

**Performance:** asset is intentionally small, but no exact VRAM/frame-time claim is made here. A binary/file size is not a GPU memory budget.
