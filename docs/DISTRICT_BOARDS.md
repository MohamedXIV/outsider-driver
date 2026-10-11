# Outsider Driver — District Visual Exploration Boards

**Version:** 0.1.0 — exploratory draft  
**Recorded:** 2026-10-11  
**Status:** Proposed district-specific designs; **not individually approved**, not final map or canonical district taxonomy.  
**Parent direction:** [Visual Style Bible v0.1](STYLE_BIBLE.md)  
**Tracking:** [Epic #63](https://github.com/MohamedXIV/outsider-driver/issues/63) / [visual calibration #70](https://github.com/MohamedXIV/outsider-driver/issues/70)

## Purpose and shared requirements

Explore three *different places in one alien-built city*, not three unrelated art styles. All share **Hybrid Illustrative Alien Retro-Futurism**: rounded but varied architecture, heavy hand-painted textures on modest low-/mid-poly geometry, soft stylized/cel lighting, selective illustration-style ink, practical aging and expressive but restrained signage. All road traffic is ground-based; multilayer roads are **real bridges and elevated roadbeds with supporting columns**. **No flying or hovering cars.**

The city was built for non-human residents. Humans are banned; human-looking signage, standard human vehicle ergonomics and familiar American-style city dressing must not become defaults. The player sees most streets from a **first-person taxi cabin following authored routes**. Distant buildings and pedestrians can be scenery cards/impostors, not detailed simulated urban assets.

Road surfacing has a design role: **muted, sometimes painted/tinted, district-aware**, never a mandatory solid-gray asphalt treatment. The identity should persist **without** rain, excessive bloom, nighttime-only lighting or physically correct reflections.

### Concept image provenance — important limitation

Two comparative three-column images were generated in this conversation on 2026-10-11 to explore architectural massing, palettes, taxi-view compositions and materials. Their **full PNG bytes are not stored in this GitHub repository by this documentation change**. Their SHA-256 checksums are recorded to identify exact drafts when images are subsequently imported through a binary-capable Git workflow:

| Draft | Exact generated PNG SHA-256 | Canvas |
| --- | --- | --- |
| Initial three-district color/form exploration | `d52242db5d7b96beb30449120018d1ba3eb804c084e85ed0091ec023623a360e` | 1536×1024 |
| Expanded three-district material/asset/taxi-view board | `714e46d4d11715356ad1e1b3aa859e653fad4807dac6fa88c28db086ade405f7` | 1536×1024 |

The *textual design briefs below* are the versioned, authoritative record of **proposals**; neither image is production art, in-engine evidence, nor proof that the exact props/cars shown have been modeled. Do not silently label the exploratory district names as final in the authored world registry.

---

## Board 01 — The Docks / industrial route

**Intended feeling:** working city, freight, repair, dependence and history; night/dusk lit by practical work lighting rather than fashionable cyberpunk neon. The Docks **already exists in the game content**; the designs below are candidate visual language, not an assertion that the current runtime scene implements them.

### Shape / scene grammar

- Rounded, heavy freight terminals with flattened barrel-roof forms, ringed cylindrical service towers and large loading apertures proportioned for alien cargo and non-human workers.
- Older reinforced road bridges, **visible support piers**, loading ramps, pipes, low retaining walls and cranes on actual docks.
- Exterior street seen *through an old taxi windshield*: broad foreground teal-gray road, useful silhouette of a curved warehouse, at least one raised road and a docked cargo vessel or machinery beyond.
- Avoid generic spiky towers and excessive saucer stacking. Functional bulk and age should explain the shapes.

### Exploratory palette (hex references, **not** locked swatches)

| Role | Candidate |
| --- | --- |
| Dark structural slate | `#23394B` |
| Oxidized teal | `#3A777E` |
| Colored road surface | `#477F82` |
| Worn cream and paint | `#D5B991` |
| Amber industrial light | `#D79A53` |
| Rust/coral repair accents | `#B26443` |

**Lighting:** mostly emissive/baked warehouse lights, localized service pools, cool ambient skyline, deliberate amber focal lights. Rain/wet surfaces optional only.

**Background actors:** alien worker billboard silhouettes, vehicle loading, static cargo units and limited traffic loops. **Grounded vehicles:** rounded freight trucks, service vans and worn industrial carriers.

**Suggested modular assets:** cargo terminal shell; arched warehouse module; ringed industrial tower; crane; supported elevated road segment; teal road + lane paint trim; cargo truck; dock lamp; worker billboard atlas; alien freight pictogram sheet.

**Camera/UX test:** can the player identify the road, upcoming support columns, and an apparent point of interest in front of the taxi without the reflected surface overwhelming the dashboard or passenger?

---

## Board 02 — Market Junction / commercial route

**Intended feeling:** convivial, bright, crowded, multilingual in alien terms; a lived-in crossroad of services and cultures, not a human shopping street with alien stickers. `Market Junction` is a **working visual-exploration label only**.

### Shape / scene grammar

- Mixed-height rounded shopfronts and shallow curved awnings, balconies, shaded recessed entrances and rounded signage panels.
- Density comes from overlapping silhouettes, painted facade detail, textures and modest billboard crowds instead of many geometric micro-props.
- A low bridge or raised connector crossing the street can establish the same city's multilayer transport language, but its visible structural supports must be plausible.
- Human-readable English should be absent from **in-world signs**. Graphic symbols and distinct alien scripts are preferred.
- Contrasting vehicle generations: older taxis, small covered market vans, public shuttles, delivery vehicles; all in road contact.

### Exploratory palette

| Role | Candidate |
| --- | --- |
| Cream plaster | `#E9C89A` |
| Warm street gold | `#DEA454` |
| Weathered coral | `#D66B4C` |
| Muted teal shop hardware | `#40858A` |
| Blue painted paving | `#669DB1` |
| Soft dark contrast | `#41515C` |

**Road surface:** warm tinted panels, terracotta or desaturated blue zones, and readable direction strips — restrained, worn and functional, **not a rainbow road**.

**Lighting:** a bright inhabited environment (daylight/dusk/night variations), emissive shops and awnings, simplified soft cel for nearby traffic; no requirement for wet reflection effects.

**Background actors:** differentiated non-human cutout groups, market vendor poses, signage panels, partial silhouettes beyond awnings.

**Suggested modular assets:** corner market pod; rounded shop family; awning variants; balcony module; supported low bridge; colored paving trim; small ground vehicle; market-service van; street sign system; alien pedestrian billboard atlas.

**Camera/UX test:** does the exterior read as distinctly social and commercial without overwhelming the Ink dialogue, passenger character, speed/route indications or visual hierarchy?

---

## Board 03 — Upper Route / civic overlook

**Intended feeling:** cleaner, airy, wealthier, orderly and watchful; a city with high-level transport engineering rather than high-tech floating traffic. `Upper Route / Civic` is a **visual route concept**, not a fixed canonical district or proof that the city must be organized vertically by social class.

### Shape / scene grammar

- Sweeping **supported** elevated roads, wide-radius barriers and ramps, calm pale-colored road surfaces, uninterrupted views across the city.
- Graceful cylindrical civic towers, broad curved institutional buildings, circular observation or service decks **on structural supports**, and distinctive but non-repetitive profiles.
- A narrow foreground with low-poly ground vehicles, a vista of varied silhouettes, and clear separation among near road, midground buildings and skyline.
- Keep design genuinely alien: unusual access architecture and proportion systems, not just modern high-rises with attached domes.
- Use occasional planted/landscaped areas and large quiet material zones as contrast with the market and docks.

### Exploratory palette

| Role | Candidate |
| --- | --- |
| Warm ivory | `#E5D6BA` |
| Pale cyan teal | `#82ABB6` |
| Muted elevated roadway | `#6CABB2` |
| Sandstone | `#BFA17D` |
| Soft amber highlights | `#DDAA69` |
| Distant slate | `#4D6E83` |

**Road surface:** light mineral cream with desaturated turquoise segments and painted lane details; cleaner than the docks, but not flawlessly sterile or toy-like.

**Lighting:** demonstrably attractive in bright/clear conditions using emissive details and simple cel lighting; no mandatory rain, dark exposure or expensive dynamic sunlight/shadow cascade.

**Background actors:** lower density, ceremonial/civic features, distant skyline cards, minimal traffic loops, occasional checkpoints or visible monitoring infrastructure as story context.

**Suggested modular assets:** curved elevated-road kit (straight/arc/ramp, columns, supports, barriers); civic tower; observation/service deck; pale road material tiles; distinctive lamppost; cleaner compact car; skyline backdrop; alien civic symbol system.

**Camera/UX test:** do wide views show the scale and social distinction of the city while keeping the road's curvature, support pillars and navigation legible?

---

## Cross-board consistency and open questions

**Keep consistent:**
- Round/soft architectural vocabulary *without cloning one dome*; mixed histories and localized variations.
- Non-human authorship, **no flying/hovering vehicles**, physically supported multilayer roads.
- Hand-painted albedo, selectively inked silhouettes, controlled cel shading and illustrated 2D background actors.
- Colored road surfacing in the same tasteful material language; district differentiation through wear, tint and repair.
- Clear geometric/editorial UI typography while street signage remains alien.
- Taxi-first camera composition, modular scenery and reusable material/mesh families.
- Babylon integration must remain code-/data-reviewable, and should not depend on an opaque editor-only format.

**Do not treat as decided yet:**
- Final district count, names, coordinates, route topology, climate and time cycle.
- Actual in-game art quality or performance; no triangle/draw-call budget claimed here.
- Final typeface, alien writing systems or vehicle silhouette ownership.
- Exact chosen stylized lighting shader/number of bands.
- Passenger rendering stack; [draft PR #79](https://github.com/MohamedXIV/outsider-driver/pull/79) is evaluating sprite alternatives.

## Production handoff (after user review)

1. Select the strongest and weakest design elements from each visual region; revise **this versioned document** and the [Style Bible](STYLE_BIBLE.md).
2. Create a **production-oriented asset sheet** of normalized categories (buildings, supported bridge segments, modular colored roads, vehicles, street furniture, alien billboard silhouettes) with shared texture atlas/trim-sheet families and GLB-ready IDs.
3. Integrate one validated Docks route environment into Babylon with a representative moving taxi, not a new gameplay architecture.
4. Compare near/mid/far treatments in real browser screenshots with fixed camera/exposure; record actual material use, draw calls, GPU/CPU frame metrics where measurable, and do not claim completion solely from generated concept illustrations.
5. Continue first playable shift work as Track A priority; no reason to defer gameplay integration for art expansion.

## Revision history

- **v0.1.0 — 2026-10-11:** First Git-versioned three-district exploration, conceptual palettes, modular families, taxi-view intentions, and explicit open decisions.
