# Passenger Sprite Comparison — Evaluation #1

## Purpose

The production decision to **abandon Inochi2D** is final. This branch is an **experiment**, not the replacement migration or approval of a candidate. It is stacked on **Draft PR #73** (retro-futuristic cockpit) so that the comparison takes place in the actual intended passenger cabin, not in a second scene. It deliberately does not touch the active #72 → #74 → #76 → #78 session/ride stack.

## Browser instructions

1. Use Node 24 and `npm ci`.
2. Launch `npm run dev`. A **Passenger Lab** button is present in development.
3. Alternatively go to `/?spriteViewer=1` (works in a browser preview build, without making the viewer the normal game entry).
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

## Validation

Run `npm run typecheck`, `npm run test`, `npm run build`, then `npx playwright test tests/browser/sprite-comparison.spec.ts --project=chromium-desktop`.

Not yet measured: art production cost at scale; sprite image sizes once exported and compressed; exact GPU frame timing; reloading a live ride from the stacked gameplay PRs. Do not merge automatically, mark tests PASS without executing, or declare a winner.
