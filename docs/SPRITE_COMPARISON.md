# Passenger Sprite Comparison — Evaluation #1

## Purpose

The production decision to **abandon Inochi2D** is final. This branch is an **experiment**, not the replacement migration or approval of a candidate. It is stacked on **Draft PR #73** (retro-futuristic cockpit) so that the comparison takes place in the actual intended passenger cabin, not in a second scene. It deliberately does not touch the active #72 → #74 → #76 → #78 session/ride stack.

## Browser instructions

1. Use Node 24 and `npm ci`.
2. Launch `npm run dev:sprites` (no Inochi WASM preparation). A **Passenger Lab** button is present in development. The normal `npm run dev` also exposes the button.
3. Alternatively go to `http://localhost:5173/?spriteViewer=1` while the Vite **development server** runs, to auto-open the panel. This experiment is deliberately absent from production preview bundles to protect strict size budgets.
4. Use the mode selector to switch **A: Spritesheet**, **B: Layered**, **C: Hybrid** on the same alien seated at `taxi.anchors.passengerSeat`. Choose *Passenger glance* or *Close portrait* to see the rear seat from inside the 3D taxi; original driver POV genuinely looks ahead, not backward.
5. Exercise expression, talk, blink, gaze, head and body, lighting, close-up and `Restart Ink dialogue` / real choices. The authored `foundation-passenger.ink` is compiled by the existing runtime; `performance:guarded` and `performance:firm` call the common `PassengerPerformanceControlPort` semantics. Domain events run against an **in-memory isolated demo** and never change the game session/save.
6. Set **Settings → Motion intensity = 0** to suppress automatic secondary movement.

## Comparison architecture

All three variants render **the same original author-drawn 256×320 pixel source illustration** through one `drawAlienLayer()` implementation. This keeps character identity, palette, frame dimensions and costume identical across techniques.

| Technique | Actual meshes/textures | Functional limitations |
| --- | --- | --- |
| Packed spritesheet | 1 atlas, 4 expressions × 4 facial states; 1 Babylon plane | Head/gaze changes cannot be independently represented, which is visible by design |
| Layered | Body, head, antennae, eyes, mouth; independently UV-framed face and simple transforms | Extra draw calls/alpha edges; coarse gaze quantization |
| Hybrid | Four authored body/head animation frames plus independently framed eyes and mouth | Fewer layers than B; cannot freely turn the baked head |

Textures are rasterized **once on mounting** from the shared vector shapes into `DynamicTexture` atlases. No GPU texture is re-uploaded per animation frame. Live animation changes UVs/transforms, idle is deterministic time-driven, and the cached actors are simply enabled/disabled on mode change. The renderer is not tied to a new game state or puppet runtime. It disposes Babylon meshes, materials, textures and supplemental light on exit.

### Artistic limitations of milestone #1

This is a **hand-authored vector art evaluation character**, not a final production illustration or proof of AI art consistency. Sheet/body motion is deliberately small. Expressions and blink states are illustrative; the comparison is suitable for evaluating **rendering architecture** in the taxi, not for declaring the final visual/artistic winner. The user must visually approve a production-quality asset pass before selection.

### Measurements and boundaries

The viewer displays actual plane count and estimated raw RGBA atlas bytes (`width × height × 4`) per candidate. These are **decoded texture estimates**, **not measured VRAM**, network download bytes or reliable GPU draw-call numbers. Generated assets have no network texture transfer, so no deceptive compressed-download size comparison is provided. Browser profiling, first-frame timing, compressed production atlases, actual GPU metrics, alpha and close-up review remain future gates.

**Architecture migration map**

- **Preserve**: `PassengerPerformanceControlPort`, `resolvePassengerPerformanceCue`, `foundation-passenger.ink`, authored passenger IDs, relationships, ride/domain state, save format, Babylon taxi anchor and lights.
- **Replace on approval**: `BabylonInochiPassengerRenderer`, `InochiPuppetSession`, `OfficialInochiRuntimeAdapter`, parameter mapping and specific puppet asset loading.
- **Remove after end-to-end migration tests**: Inochi WASM downloads/preparation, probes/fixtures, stale docs and tests. **None are removed in this branch.**

## Verification history

- CI run #37918750826 on the initial Draft PR failed at strict ESLint before TypeScript/build/browser testing. The reported parser/project and void-arrow rules were corrected.
- CI run #37919019507 verified ESLint, content and save checks, and **275/275 existing unit tests**; compilation stopped on four strict TypeScript errors involving a DOM Element and nullability of the taxi handle. These were fixed in the next commit. This is still **not a green CI run**.
- CI run #37919280454 passed the **complete production foundation** (lint/content/save/275 existing tests/typecheck/Vite build/performance budgets). The Chromium visual test reached active mode, expression, slider and lighting interactions before the 30-second aggregate test timeout on software-rendered CI. Browser acceptance is **not yet green**; the isolated test timeout was raised to 120 seconds, with budgets unchanged. Its PNG/trace artifacts document the visible 3D passenger.
- The browser comparison is developer-only, so production bundle size remains the authoritative performance gate. Preview hosting may be externally rate limited; browser testing via Node 24 / Vite dev does not require Vercel.

## Validation

The browser test also captures a `spritesheet.png`, `layered.png` and `hybrid.png` inside the real taxi, which CI uploads as **sprite-comparison-visuals** for human A/B/C review. These images are build evidence rather than a substitute for interactive evaluation of the three animation methods.

Run `npm run typecheck`, `npm run test`, `npm run build`, then `npm run test:sprite:browser` (dedicated Vite dev-server Playwright configuration, not the normal production preview smoke suite).

The separate browser smoke spec is gated by `SPRITE_LAB_DEV=1` and is intentionally skipped during the normal production-only `npm run test:browser`; it runs in the dedicated sprite-lab config. Not yet measured: art production cost at scale; sprite image sizes once exported and compressed; exact GPU frame timing; reloading a live ride from the stacked gameplay PRs. Do not merge automatically, mark tests PASS without executing, or declare a winner.


## Mint elf real-art integration after asset upload

The first evaluation's procedural alien is still selectable, but the user's
actual illustrated mint elf is now also wired in as a **source-art** option. See
[Mint elf art handoff](MINT_ELF_ASSET_HANDOFF.md). Its files are under
`public/passengers/mint-elf/`, with WebP suffixes. The A/B/C approaches are
**architecture variants rather than three finished animations** of this sprite.
B uses torso, head and independently masked right antenna; C uses full portrait
with only the right antenna separated. A is one original image. Do not compare
facial animation capability until independent eye/mouth layers have been cleaned
and authored. The dedicated Playwright spec exercises WebP HTTP 200/MIME,
asset readiness, mode switching and real Ink choices. Fresh CI still required
for any new PR head.


## Lighting evaluation after user screenshot (October 2026)

The real mint elf art appears darker than neighboring 3D taxi geometry in the
user's screenshot. **Do not treat this as a reason to switch the characters
to 3D**: first compare equal exposures and materials.

Two new controls in the development-only Passenger Lab are independent of the
3D scene's `Taxi lighting` selector:

- **Sprite shader: Lit / Unlit**. Lit retains Babylon StandardMaterial direct
  lighting. Unlit uses `StandardMaterial.disableLighting = true` while
  retaining the source artwork's painted shading. This is *not* a custom toon
  shader and does not bypass shared postprocess or exposure.
- **Sprite brightness: 0.25–3×**, initial value 1×. Applies per-character
  material RGB tint/multiplier (not texture re-encoding or transparency gain);
  applied to both procedural comparison alien and real mint elf, all A/B/C
  variants, and when switching between them. It does not change cabin lights.

Compare `Taxi lighting = cabin/dim/neon` under each sprite shading setting.
Check clipping above 2× brightness, color fidelity, nighttime readability and
alpha silhouette. The artist-painted shading inside mint elf art is preserved
in Unlit; the remaining differences with 3D architecture, contact shadows and
scene textures are *art-direction questions* requiring more work.

Potential next phase, **not implemented yet**: stepped diffuse lighting for
3D cabin materials (2–3 tonal bands with an ambient floor and anti-aliased
thresholds), coordinated LUT/color grade for 2D and 3D, and optional
normal-mapped or fake-directional tint for sprite layers without destroying
their painted details. Avoid high-frequency dithering or vertex wobble.

The current changes intentionally do not convert the whole 3D taxi to toon
rendering or add new save settings. User review precedes that broader change.
