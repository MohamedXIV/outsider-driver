# Animated 2D Anchor Architecture — Babylon + Pixi + Ink (v0.1)

> **Status:** proposed technical architecture, **not implemented**, PixiJS not installed. Written for [location anchors #86](https://github.com/MohamedXIV/outsider-driver/issues/86) and the agreed [3D city / 2D interiors design](LOCATION_PRESENTATION_MODES_V0.md). Reconcile with the actual canonical player-shift and GameSession implementation in stacked PRs #72/#74 **before code integration**.
>
> **User clarified:** secondary locations are **living, animated 2D spaces**, not static illustration panels. Expect moving props, flickering lights, shadows/reflections, particles, weather or vapor, layered character idle motion, occasional parallax, and illustrated depth. Player's own home/garage and city travel remain 3D.

## Decision

| Responsibility | Owner |
| --- | --- |
| City streets, architecture/facades, driving, passengers in taxi, player's personal garage/home | **Babylon.js** (existing) |
| Animated painted interiors, layered backgrounds, shop props, light sprites, masks, 2D particles and portrait motion | **PixiJS, lazy-loaded for location anchors** (proposed) |
| Dialogue text, Ink choices, menus, item lists, prices, form fields, accessibility and settings | **Native HTML/CSS UI** (existing approach) |
| Narrative branching, choices and scene flags | **inkjs** + canonical game commands/state |
| Arrival validation, world time, credits, inventory, relationship, risk, save/reload, transition | **One GameSession / player-navigation owner**; not Pixi or Babylon |

**Why PixiJS, not Phaser:** This slice needs a focused GPU-accelerated 2D *compositor* (sprites, animated layers, particles, masks/filters), not another full input/physics/scene/gameplay framework. Phaser 4 remains an option only if separately scoped 2D minigame mechanics justify it. HTML/CSS alone can animate some layers, but Pixi becomes useful because **animated ambience is a product requirement**, not a nice-to-have. Do **not** introduce a separate React app or a second economy model.

**Warning:** Having one *active* render loop does **not** mean Babylon and Pixi literally share one WebGL context. If both have GPU canvases, each may allocate a context/resources. This is acceptable only after measurement. Stop the inactive loop, retain/release resources deliberately, and handle browser context limits. If measurements show insufficient benefit, a composed DOM animation fallback should remain possible.

## Layers on screen (one authoritative app)

```text
                       GameSession / authored location graph
                      (arrival, commands, time, save, relationships)
                                      |
                           PlayerPresentationCoordinator
                                  /        \
                                 /          \
                     3D stage (Babylon)    2D stage (Pixi, lazy)
                       taxi/city/home       active VN anchor only
                                                 |
                                    HTML/CSS dialogue, choices,
                                    accessible shop UI / Ink
```

**Compositor choice:** the Pixi canvas occupies the scene area, optionally overlaying a **paused/frozen 3D frame**. Native HTML/CSS remains a top interactive layer. Do not render text-heavy shop menus into textures merely to appear inside Pixi. Scene content must have an explicit location ID and correspond to a real visible 3D facade/stop.

## Transition contract

1. **Approach (Babylon active):** a route ends at an authored physical shop stop, e.g. Patchworks parts vendor in Outer Margin. The domain/navigation owner validates arrival, permissions and whether the vendor is accessible. A roadside 3D facade can be visible beforehand.
2. **Enter (transition):** the presentation coordinator records a *return context* referencing the canonical arrived location. It asynchronously loads PixiJS on the first visit and that anchor's layered assets. Show accessible loading state; do not pause Babylon yet if the new view isn't ready. Use generation tokens / cancellation so quick re-entry, leaving, tab change and asset errors cannot mount a stale scene.
3. **Activate Pixi:** once the 2D scene is ready, pause Babylon's continuous render loop (keep the last 3D frame when appropriate); show the Pixi canvas, start the Pixi ticker and overlay HTML dialogue and controls. Transfer keyboard/touch focus to the VN controls. Only the Pixi animation ticker needs continuous rendering.
4. **Interact:** Pixi sprites handle *visual animation and pointer hotspots only*. UI shows Ink text, choices, shop inventory and pricing. **Only GameSession commands** can mutate credits, items, elapsed time, story/risk or relationships. If no canonical merchant command exists, **do not fake success or change a local Pixi wallet**; implement a small domain command in the proper branch first.
5. **Leave:** stop Pixi ticker, unsubscribe scene events, cancel pending asset loads, release active location textures/filters/listeners and hide/remove its canvas. Resume Babylon only after the session confirms a valid return state: parked taxi, home or personal garage. Restore accessible focus. The presentation coordinator must not fabricate route travel.
6. **Recover:** on loading failure, WebGL context loss, or interrupted transition, display a usable HTML fallback and keep the authoritative session unchanged; never strand the player in a black canvas.

**Lifecycle implementation choice for the first slice:** create a single lazily initialized Pixi application at first anchor entry, with at most one active 2D scene and ticker. Reuse or destroy the renderer based on measured memory/entry latency; always unload *scene-specific* resources on exit. A paused ticker saves GPU execution but **does not automatically free VRAM**. The host retains ownership and handles application dispose/HMR.

The existing Babylon `RenderingRuntimePort` on `main` is minimal (`start/dispose`); later stacked art and gameplay PRs add lifecycle/navigation capabilities. The coordinator needs an **explicit, typed suspension/resumption interface**, not direct poking into `Engine.Instances`, DOM selectors or parallel render loops. Coordinate the new port contract with #72/#74 and the existing Settings pause behavior; these competing pause reasons should compose (e.g. menu open and VN open) rather than one resume accidentally restarting another's paused world.

## First vertical slice: Patchworks Parts Counter (Outer Margin)

**Small, deliberately expressive visual scene:**
- Illustrated background, counter foreground, two parallax layers; recognizably matches the 3D shop facade and local culture.
- Rotating ceiling fan, **flickering amber practical light**, subtle screen scan, intermittent steam/dust sprites, one passing exterior silhouette.
- Shopkeeper sprite with blink/breathing and at least two expressions. No general character-rig requirement, no physics.
- Lighting mostly **stylized 2D tricks** (animated gradient/additive glow, masking, timed shadow/reflective overlays); normal-mapped real-time 2D lighting/filter stack is optional, not promised.
- HTML/CSS/Ink dialogue and an accessible two-item price/stock panel. At least one real persisted interaction using canonical domain commands; prices and inventory must be source-backed, not temporary UI fixtures in the finished slice.
- Pause/reduce motion according to existing accessibility preferences; stop animation on hidden tab and on exit.

**Playable proof:** arrive via a legitimate authored 3D route → identify the shop facade → enter animated Pixi scene → hear/talk/shop via Ink and canonical state → exit to the correct context → reload game and verify the transaction plus story consequences persisted. If actual game data is not yet wired, start with presentation-only **clearly labeled fixture/probe**, not a fake completed shop.

## Minimum test gates (do not raise budgets blindly)

- **Functional:** approved destination/stop and returns; cannot enter from unrelated districts; no duplicated purchases under double-click or interrupted transition; no independent local currency/time; save/reload consistency.
- **Lifecycle:** only one active animation loop; Babylon suppressed during Pixi scene; repeated open/close, tab-hide, context loss, loading failure and HMR/dispose work without leaks or stale overlays.
- **UI/accessibility:** readable HTML text, keyboard & touch focus, Escape/back policy, reduced motion, contrast and DPI behavior preserved.
- **Measurements:** compare cold Pixi import/bundle and assets, scene VRAM/texture counts where observable, startup-ready size, repeated entry/exit timings and actual 2D frame times. Set budgets from measured data, not arbitrary claims; browser CI/SwiftShader is not proof of mobile FPS.
- **Scope:** one live shop anchor, **no separate 2D world manager, no new map teleport system, no Phaser dependency**, no commitment to animation every background illustration.

## Future decision rule

Keep **Babylon + Pixi + native DOM/inkjs** only if the living 2D vertical slice demonstrates clear visual/authoring benefits with acceptable renderer memory and context behavior. If needs shrink to simple fades/blinks, the same anchor contract can use HTML/CSS without Pixi. If a 2D location gains actual movement/collision-heavy mechanics, assess Phaser **for that minigame**, not as a mandatory second main engine.
