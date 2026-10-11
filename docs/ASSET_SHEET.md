# Outsider Driver — Production-Oriented Asset Exploration Sheet

**Version:** 0.1.0 (asset design/authoring proposal)  
**Recorded:** 2026-10-11  
**Status:** DRAFT: production-oriented family specifications; not final models, source meshes, asset downloads or measured performance.  
**Art direction:** [Visual Style Bible](STYLE_BIBLE.md)  
**Visual regions:** [District Boards](DISTRICT_BOARDS.md)  
**Tracking:** [Visual calibration #70](https://github.com/MohamedXIV/outsider-driver/issues/70), [scenery #17](https://github.com/MohamedXIV/outsider-driver/issues/17), [performance #53](https://github.com/MohamedXIV/outsider-driver/issues/53).

## Goal

Turn the concept-approved **Hybrid Illustrative Alien Retro-Futurism** into identifiable, reusable, low-/mid-poly asset **families**. The output is an authoring vocabulary that an artist or agent can model in Blender, texture, and export as GLB into existing Babylon.js scenery/content architecture. It must **not** introduce a second game/editor/runtime architecture.

The game is **taxi-first, authored-route-based and not an open-world driving game**. Most 3D art exists to support composition through the windshield. Rich hand-painted texture information and clearly rounded silhouettes matter more than tiny geometry.

**Non-negotiable:** All normal vehicles run **in physical contact with supported streets, ramps or bridges**; no flying/hovering vehicles. The city is alien-built, not a human city. Roads can be painted or manufactured in **muted non-gray colors**, not standardized black asphalt. Heavy citywide PBR/GI/shadows are not required.

### Versioned concept reference and limits

An illustrated 1536×1024 asset exploration sheet was generated in this conversation on 2026-10-11 with building silhouettes, modular pieces, roads, grounded vehicles, props, signage, texture swatches and district palettes. The generated image **has not been uploaded to GitHub as an original PNG** by this docs commit; the exact original PNG SHA-256 is:

`82809059948bc0d851e1c5ad84bab5d1aabaebfc65821883cdbc8b95de77776b`

**Do not interpret the image's apparent model count, geometry, text labels or painted fake 3D shading as tested/exportable GLB geometry.** This document and Git history track the *textual authoring contract* until a binary-capable Git workflow imports the source visuals and approved models. Asset family names below are provisional, not claims about files already in `public/`.

---

## 1. Building archetypes — draft IDs and reusable modules

| Proposed family ID | Asset concept | Primary silhouettes / reuse | Initial districts |
| --- | --- | --- | --- |
| `bld_res_ring_stack` | Residential stack | ringed cylindrical residence; floor bands, painted windows, variable stacked heights | Market / residential background |
| `bld_com_round_hub` | Commercial hub | asymmetric rounded retail bulk, awning ring, lower portals and overhangs | Market |
| `bld_ind_barrel_terminal` | Industrial terminal | massive flattened barrel / capsule shell, cargo door variants, utility bands | Docks |
| `bld_civ_tall_shell` | Civic shell | elongated oval tower, arched aperture, clean large-face panels | Upper Route |
| `bld_trn_terminal_pod` | Transit node | broad round canopy, high-capacity access openings, contained support columns | Market / Upper |
| `bld_infra_skybridge_node` | Elevated junction node | wide rounded cantilever with **visible load-bearing supports** and connector ports | Docks / Upper |

**Each family should prefer construction from a small common kit**, not six unique high-poly sculpted monoliths. Potential shared building modules:

- `mod_wall_curve_01`: curved wall segment with repeatable UVs.
- `mod_window_oval_01`: shallow inset / texture-facing oval window; can be a plane or decal on distant LOD.
- `mod_corner_round_01`: rounded transition between wall sections.
- `mod_cap_low_dome_01`: roof cap with sufficient segments for the onscreen silhouette.
- `mod_balcony_band_01`: curved balcony or floor ring, simplified support.
- `mod_civic_arch_01`: broad nonhuman-scaled entry arch.
- `mod_support_pier_01`: load-bearing pier for platforms, elevated roadbeds and canopies.

**Art risk:** resist the temptation to reuse the exact same saucer roof on every archetype. Curved is a shared language, **not** a universal building shape.

## 2. Road and bridge kit — geometry and district skins separated

**Geometry families**, with continuous edge and UV standards to be specified during the first actual GLB prototype:

| Proposed ID | Purpose | Must support |
| --- | --- | --- |
| `road_straight_a` | Base road segment | lane/color decals, shoulder/crown, simple repetitions |
| `road_arc_wide_a` | Wide bend | taxi-eye continuity; road-edge matching |
| `road_arc_tight_a` | Tight authored bend | matched tessellation, no large cracks |
| `road_junction_a` | Intersection | authored branching appearance; no full traffic simulation |
| `road_ramp_up_a` | Ascending physical ramp | road contact/transition; side support |
| `road_ramp_down_a` | Descending physical ramp | road contact/transition; side support |
| `bridge_deck_a` | Elevated supported span | support sockets, barrier sockets, underside geometry |
| `bridge_pier_short_a` | Short pier | deck support/ground attachment |
| `bridge_pier_tall_a` | Tall pier | deck support/ground attachment |
| `road_barrier_opaque_a` | Opaque safety edge | modular length, texture reuse |
| `road_barrier_open_a` | Open rail safety edge | limited transparency/overdraw |
| `road_tunnel_entry_a` | Curved tunnel portal | connected roadway, authored enter/exit |

**Shared, replaceable material skins** (do not duplicate geometry merely for color):

- `mat_road_docks_teal` — weathered oxidized teal, faded repair strips.
- `mat_road_market_ochre` — warmer tinted ochre/terracotta with mixed blue panel repairs.
- `mat_road_upper_cream` — muted cream/blue-green civic paving.
- `mat_road_res_green` — residential weathered desaturated green; optional concept.
- `mat_road_lane_details` — painted lines, arrows, local alien traffic symbols.

**Construction truth:** all roadway decks must physically connect via ramps/bridges and be visibly supported. Illustrations may hide their support beneath camera framing; the in-engine geometry must not imply hover roads.

**Camera truth:** road details are read from within the taxi at shallow grazing angles. Prioritize road continuity, lane flow, color, and support silhouette over close-up 4K cracks.

## 3. Grounded vehicle archetypes — illustrative silhouettes, not final homologation

| Proposed ID | Concept | Visual distinction |
| --- | --- | --- |
| `veh_taxi_hero_old` | Player taxi hero reference | aged working body, altered panels, unusual rounded windshield, nonhuman interior controls |
| `veh_personal_compact` | Small personal | low, tapered, soft aerodynamic wedge with exposed ground wheels |
| `veh_family_carrier` | Family/public-sized | tall continuous capsule, multiple oval apertures and practical access |
| `veh_cargo_hauler` | Heavy freight | elongated segmented body with **ground wheels/axles**, non-car rear modules |
| `veh_service_compact` | Service utility | stubby practical chassis, cargo/service tool volume |
| `veh_industrial_long` | Industrial carrier | extra-long low rugged freight platform |
| `veh_public_shuttle` | Bus/shuttle | rounded roomy silhouette, repeated apertures and large nonhuman door |

For all except the already-owned taxi hero, initial usage is **simple authored route traffic**, not driveable/physics actors. One vehicle may have painted district/cultural variants without extra mesh families. Ground contact and apparent scale must remain credible; avoid visually indistinguishable Beetle-style cars.

**Important:** the taxi already has a live cockpit effort ([PR #73](https://github.com/MohamedXIV/outsider-driver/pull/73)); these are **future art family proposals**, not permission to overwrite that work or claim the hero GLB exists.

## 4. Street props, signs and nonhuman presence

| Proposed family ID | Suggested variants / notes |
| --- | --- |
| `prop_lamp_curve` | short/tall curved retro service lamps; warm baked/emissive screen |
| `prop_sign_column` | mounted alien navigation signs, distinct icon patterns |
| `prop_sign_hanging` | shop sign and market pendant; native alien text only |
| `prop_billboard_large` | large illustrated poster in alien visual language |
| `prop_vendor_booth` | rounded market kiosk with minimal geometry |
| `prop_transit_shelter` | round canopy with seat and support posts |
| `prop_bench` | furniture sized for relevant species, **not default human ergonomics** |
| `prop_planter` | alien urban planting / climate-specific street container |
| `prop_utility_box` | rounded civic/industrial utility service case |
| `prop_road_gate` | checkpoint/maintenance barrier, supports route-event dressing |
| `prop_vending_pod` | enclosed alien dispensing machine, tactile retro controls |
| `prop_waste_unit` | weathered civic receptacle appropriate to local species |
| `sprite_alien_crowd_atlas` | non-human figures, silhouettes, stance and size variation, LOD billboards |

**Typography:** the clean, restrained geometric editorial headings of the presentation **are a player-facing UI direction**. Billboard/road-sign *world content* should not default to English. An alien glyph/icon sheet should distinguish functional navigation from decoration and be validated for visibility at taxi-view distances.

## 5. Shared material families — content and rendering roles

| Draft family | Appearance | Default approach |
| --- | --- | --- |
| `surface_enamel_worn` | cream/teal/coral paint, chips, brush variation | cel-lit near/mid, textured |
| `surface_enamel_clean` | refined civic finishing | cel-lit near/mid, textured |
| `surface_concrete_warm` | beige/mineral composite | cel-lit mid or unlit baked far |
| `surface_oxidized_metal` | mottled teal/slate industrial structure | textured cel; no mandatory metallic PBR |
| `surface_window_illustrated` | stylized glass panels and painted interiors | baked/unlit or subtle cel, limited transparency |
| `surface_road_district` | painted paving with hand-weathered markings | lightweight lit near, simplified unlit far |
| `surface_emissive_sign` | alien icon sign, practical bulbs and screens | emission/fake glow; bloom optional |
| `surface_ink_detail` | selective outlines/graphic accents | drawn texture or sparse geometry where necessary |

Share **texture atlases / trim sheets** among families where practical; tune texture resolution by projected screen size, not building wealth. No full per-building bespoke 4K texture default. Prefer actual limited material variety and draw-call-friendly batching/instancing over hundreds of tiny mesh/material parts.

## 6. Intended depth-tier / LOD strategy

- **Hero (taxi interior, close vehicles/bridge silhouette):** preserve curved silhouette and authored controls; enhanced stylized material only where visibly helpful.
- **Near scenery:** lightweight fragment cel shading and painted albedo; practical road/lamp details; explicit physical supports.
- **Mid scenery:** fewer curve segments and materials; shared textures; very light cel or baked-looking treatments.
- **Far skyline, shops behind foreground buildings, distant pedestrians:** unlit billboard/impostor/cutout or very light meshes, with atmospheric tint and authored parallax.
- **Background people:** predominantly sprites/billboards. Monitor transparency sorting and alpha overdraw; do not assume transparent quads are literally free.

Segment/triangle counts are **not fixed from concept art**. Define budgets only after inspecting true projected silhouette size and running Babylon/real-browser measurements; smooth normals reduce visible faceting **without** correcting a jagged outer silhouette.

## 7. Proposed source/GLB metadata contract — design draft only

Before implementation, adapt to the repository's existing scene/content/presentation contracts. No runtime code/schema is committed by this document.

An authored record for each approved asset should eventually supply:

```json
{
  "id": "bld_ind_barrel_terminal",
  "status": "draft",
  "source": "art/source/buildings/bld_ind_barrel_terminal.blend",
  "renderAsset": "public/assets/city/buildings/bld_ind_barrel_terminal.glb",
  "renderRole": "midground",
  "materialFamilyIds": ["surface_enamel_worn", "surface_oxidized_metal"],
  "districtTags": ["docks"],
  "variants": ["clean", "weathered"],
  "anchors": ["roadside", "loading", "upper_connection"],
  "lodPolicy": "near-mid-far",
  "collisionPolicy": "visual-only",
  "notes": "Illustrative schema example only; referenced asset files and runtime schema do not exist yet."
}
```

**Paths and values above are *illustrative proposals*, not verified existing files or accepted runtime Zod schema.** Keep asset IDs stable once production content references them; artists can revise shape/material without changing saved gameplay identities. Validate source existence, GLB loading, side/up orientation, uniform scale, UV seams, material limits and disposal before production use.

## 8. First real scene assembly proposal — Docks roadside

A **small authored visible sequence**, not an open world and not a second game loop:

1. Hero: existing taxi cockpit and one authentic passenger presentation path (under the current passenger-technology evaluation).
2. Near: `road_straight_a` into `road_arc_wide_a`, painted teal, one visible barrier, one lamppost, one passing grounded freight vehicle.
3. Mid: `bld_ind_barrel_terminal`, one bridge `bridge_deck_a` supported by short/long pier, a dock crane.
4. Far: simplified `bld_res_ring_stack` skyline/impostors and minimal non-human workers.
5. Lighting: base ambient/cel with practical warehouse emissive windows and **optional** taxi-interior environmental color shift. No citywide realtime shadows/reflections mandatory.
6. Validate fixed-camera daylight/dusk/night stills and an actual route-time animation: lane readability, taxi+passenger visibility, draw calls, texture size, input response and frame times.

Do not delay existing Track A playable-shift integration to implement this styling. Align with current draft cockpit/ride PR stack rather than competing with it.

## 9. Explicit draft acceptance gates

- [x] Written draft families and naming proposals captured in Git history.
- [x] Concept-level production exploration sheet generated (PNG **not** in repo).
- [ ] User review / approval of individual asset silhouettes and palettes.
- [ ] Original board artwork source binaries committed to GitHub through suitable tooling.
- [ ] Reusable Blender source meshes and production-ready textured GLBs authored.
- [ ] Authentic Babylon taxi-eye scene assembled from approved assets.
- [ ] Browser captures and comparative visual/art evaluation completed.
- [ ] Actual render/asset performance measured and tracked.
- [ ] Final alien scale/ergonomic/signage conventions authored and validated.

## Revision log

- **v0.1.0 — 2026-10-11:** Draft six building archetypes, common modules, twelve road/bridge parts, seven vehicle classes, street props, shared material vocabulary, realistic depth tiers and first-scene handoff. All are proposals pending model and browser validation.
