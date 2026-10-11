# Outsider Driver — Visual Style Bible

**Version:** 0.2.0 (district exploration documented; asset approval pending)  
**Recorded:** 2026-10-11  
**Decision status:** Core visual direction approved in concept; design details remain revisable.  
**Implementation status:** Not an in-engine art/performance acceptance, shader implementation specification, or release sign-off.  
**Related work:** [Visual calibration #70](https://github.com/MohamedXIV/outsider-driver/issues/70), [playable/visual epic #63](https://github.com/MohamedXIV/outsider-driver/issues/63), [visual acceptance #71](https://github.com/MohamedXIV/outsider-driver/issues/71).

This document is the repository-visible **Visual North Star**. Keep improving this same file in ordinary Git commits; Git history and the version heading distinguish earlier drafts from later decisions. Do not withhold draft art-direction decisions from the repo while waiting for finished art. Where a decision is unverified in the running game, say so explicitly.

## 1. Core identity — approved direction

**Hybrid Illustrative Alien Retro-Futurism**: hand-painted texture richness, rounded low-/mid-poly shapes, soft cel/toon lighting, and selective ink linework.

The city belongs to **non-human civilizations**. Humans are forbidden and widely viewed with suspicion, dislike, or worse; the protagonist is an illegal human living under cover. Never represent the city as a human metropolis with aliens added as decoration. Non-human scale, everyday infrastructure, interfaces, signage, and built history must be credible on their own terms.

This is a lived-in future with multiple generations of design and repair, **not** default hard-edged cyberpunk. The visual target is tactile, warmly designed and distinctive, not ultra-realistic.

## 2. Architecture and built history — approved direction

- Emphasize **rounded, cylindrical, oval, softly stepped, curved and ringed** massing: continuous facades, broad radii, circular/oval openings, substantial columns, generous supported overhangs and bridges.
- Avoid repeating the same dome/pod everywhere. Use changes in construction era, district wealth, function, and alien culture to produce recognizable architectural families.
- Alien-built dimensions and spatial conventions come first; do not implicitly normalize doors, shops or road furniture to human ergonomics.
- Physical bridges, ramps, elevated highways and tunnels may overlap on many levels. Every elevated roadway has a plausible supporting structure.
- Broad silhouettes carry shape. Texture atlases, trim sheets, painted panel lines and weathering provide much of the smaller detail.
- Complexity is not a goal: use rounded forms efficiently with view-dependent tessellation and shared modular assets.

## 3. Vehicles and movement — approved direction

- **All ordinary road traffic is ground-contact traffic** on physical streets, ramps or elevated roads. **No flying cars or hovering traffic.**
- Favor practical retro-futuristic vehicles with curved bodywork and distinct silhouettes, not generic sharp-edged hoverpods. Vehicle families may vary greatly between makers, uses, eras and alien users.
- The player's old taxi is a hero asset: tactile analog/digital controls, visible repairs, adapted fittings, hand-painted surface history, and recognizable personality.
- Traffic outside the taxi is mostly authored/background performance, not a full physics traffic simulation. Keep vehicles texture-rich and geometry-conscious.
- The taxi ride is route-driven and largely automatic; streets need to work **from the taxi camera**, not as a free-roam urban sandbox.

## 4. Roads — explicit approved detail

**Do not default every road to ordinary gray or black asphalt.**

Road surfaces may be built from muted painted or manufactured materials with district-specific color: weathered teal, sea-green, mineral blue-gray, faded terracotta, ochre, cream-gray or other locally motivated tones. Use material changes, broad painted lanes, aging, grime and subtle roughness variation, not rainbow/toy-track saturation.

Colored road surfaces are an important part of the city's identity, navigation readability and visual rhythm from inside the cab. Realistic gray roads are allowed where appropriate, but should not become the universal fallback.

## 5. Texturing and shape language — approved direction

- **Texture richness > geometric micro-detail.** Favor hand-painted wear, color variation, construction seams, painted shadow/occlusion, illustrated signage and emissive accents over individual modeled bolts and window frames.
- Silhouette and proportions must remain convincing even with simplified meshes. Smooth normals can improve the appearance of modestly segmented curved forms without adding polygons; silhouette-critical nearby curves still need sufficient segments.
- Favor reusable atlases, trim sheets, material families, instancing and LOD/impostors as applicable. High-resolution unique textures for every building are not the target.
- Do not prepaint harsh directional shadows onto surfaces intended to respond strongly to animated real-time cel lighting (avoid double shading).
- No mandatory vertex snapping, aggressive PSX wobble or distracting noisy dithering.

## 6. Hybrid rendering model — approved *art intent*, pending measured implementation

Use **three compatible treatments**, rather than one expensive universal PBR shader:

| Depth/use | Intended treatment | Constraints |
| --- | --- | --- |
| Background skyline, distant structures, 2D street actors | Unlit / baked-looking hand-painted textures, emissive details, atmospheric tint, billboards or impostors | Limit texture memory and alpha overdraw |
| Nearby roads, bridges, buildings, ordinary vehicles | Lightweight **soft cel** response with painted albedo and restrained emissive accents | Few real lights; no assumed per-light shadow maps |
| Taxi cockpit, important foreground objects and featured passengers | Enhanced stylized lighting, selective accents, limited reflections and coherent character tinting | Spend rendering budget where the player looks |

- Use **selective** hand-painted/inked edges, not heavy full-scene outline passes by default.
- Light intensity alone is not the main cost lever; light count, affected surfaces, shadows, post-processes, transparency, memory and shader complexity matter.
- Prefer painted/emissive windows and signs, baked-looking illumination and stylized wet-road highlights to citywide realtime reflections and GI.
- Support bright as well as dim locations. Not every district is rainy, nocturnal orange, or drenched in neon.
- This is a **target look**, not a claim that any custom Babylon material, performance budget or browser compatibility proof already exists.

## 7. Characters and population — approved aesthetic, runtime technology open

- Important alien passengers are expressive illustrated 2D characters integrated convincingly into the 3D cabin, with matching palette, rim/ambient lighting and selective linework.
- **The choice of character puppet/sprite runtime is a separate, currently open engineering decision.** Do not interpret this art document as selecting Inochi2D over the ongoing sprite comparison ([PR #79](https://github.com/MohamedXIV/outsider-driver/pull/79)).
- Background pedestrians are chiefly affordable 2D billboard/sprite/impostor actors; use atlases and controlled transparency. They should read as varied **non-human** residents.
- No full-scale pedestrian AI or pedestrian-level street exploration is required.

## 8. Color and atmosphere — direction, not fixed palette

Use deliberate district color scripts. Aged creams, copper/amber, weathered teal, muted coral, blue-gray, faded green and warm neutrals are *examples*, not a mandatory global palette.

- Industrial docks may be darker, oilier, more utilitarian.
- Commercial intersections may be brighter, busier and more colorful.
- Civic/elevated corridors may use cleaner materials and broader, calmer color zones.
- Different places must feel culturally and functionally different while belonging to one alien city.
- Avoid a generic purple/cyan Blade Runner-style skyline as the default.

## 9. Typography and alien signage — approved direction

For **player-facing UI**, favor highly readable, confident, clean geometric/rounded retro-futuristic editorial typography, with restrained hierarchy and generous legibility. Exact font family, weights and licensing remain unselected.

For **in-world signage**, respect alien scripts and visual conventions. English/Latin lettering is not the ordinary native street language. Translation, when available, should be an intentional player-facing layer, not an excuse to humanize all signs.

## 10. Camera and production constraints — approved direction

The city is a **curated moving exterior around the taxi**, with authored route modules, layered urban vistas, supported elevated roads and localized active scenery. It does not need to be completely traversable.

The player can use authored personal spaces (home/garage); ordinary street free-roam is **not** part of the current scope.

Prioritize (1) cabin/passenger readability, (2) near-road silhouettes and movement, (3) mid-distance compositional depth, and (4) distant skyline illusion. Asset and rendering choices should be reconstructible from Git-friendly definitions and exports, not hidden only in an editor.

## 11. Negative guardrails

Avoid:

- generic modern hard-surface cyberpunk; indiscriminate sharp mechanical detail;
- cars or taxis flying/hovering instead of using supported roads;
- a human-derived city with alien stickers or always-English signs;
- repetitive saucers/domes in place of varied architecture;
- full-scene heavy black outlines, saturated neon overload, rain as a universal requirement;
- overbuilt geometry, full city simulation, expensive citywide realtime GI/shadows/reflections;
- claiming concept images prove browser performance or asset implementation.

## 12. Current concept approval and next authoring steps

**Concept approval (2026-10-11):** User accepted the visual direction of the city/asset exploration board — rounded architecture, grounded vehicle forms, hand-painted texture and hybrid shading treatment, editorial typography and the occasional **colored road surface**. This records approval of the *direction*, not literal geometry, all proportions, final colors, or production-ready meshes.

**Next sequence:**

1. **Drafted:** three distinct [district exploration boards](DISTRICT_BOARDS.md): industrial **The Docks**, a commercial/market setting, and an elevated/civic corridor. These are exploration labels, not a declaration that every district name or world layout is finalized. **Review/acceptance is pending.**
2. Record decisions and rejected alternatives here, with dated revisions.
3. Produce a **production-oriented asset sheet** (building archetypes, grounded vehicles, road modules, signage, lamps, alien billboard actors) and specify asset source/export metadata.
4. Integrate a representative route and taxi environment into **Babylon.js**, verify visual cohesion, viewport readability, asset memory, draw calls and real frame performance before scaling.
5. Keep player-facing shift integration from the [Roadmap](ROADMAP.md) the gameplay priority; visual production must not block it without a proven need.

## Revision notes

- **v0.2.0 — 2026-10-11:** Linked first versioned three-district exploration; individual palettes, names, model families and concept renderings remain draft pending review.

- **v0.1.0 — 2026-10-11:** First committed draft: direction approved in conversation; in-engine calibration and final asset selection pending.
