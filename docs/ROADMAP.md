# Roadmap

## Roadmap rule

This is **not a vertical-slice roadmap**.

Every phase lands production architecture intended to remain in the final game. Early milestones use small fixture/content sets to prove systems, but no phase creates a throwaway demo layer.

Content breadth grows continuously after the system spine exists.

## Immediate next milestone — playable integration and visual calibration

**Why now:** The production domain, narrative, persistence, and rendering systems have substantial automated coverage, but the normal browser entry currently boots a 3D taxi surface rather than a complete player-facing shift. Finishing system work does **not** imply that the game is already playable or visually representative. The next work should connect existing production systems and establish a distinctive retro-futuristic visual direction together, without building throwaway demo systems.

Work on two coordinated tracks, prioritizing a usable game loop over broad visual polish:

### Track A — First real player-facing shift (primary)

1. Compose existing production services in the application entry with explicit ownership/disposal and persisted save/load.
2. Expose a native in-game path: home/garage preparation → inspect/accept available work → pickup → automatic route progression → Ink passenger conversation and consequential choices → drop-off/payment/world state → return and resume.
3. Connect actual state-driven UI for job selection, ride progress, conversation choices, basic radio/translator access, and resulting facts/relationships/suspicion where the authored content exercises them.
4. Make the first supported journey replayable without debug query parameters, console hooks, or test-specific state fabrication. Keep systems generic; use a small amount of validated authored content, not a separate vertical-slice architecture.

### Track B — Approved visual direction, measured in-engine calibration (parallel)

The [Visual Style Bible v0.1](STYLE_BIBLE.md) records the **approved concept direction**, including rounded alien-built retro-futurism, grounded vehicles, colored street materials and hybrid painterly/soft-cel/selective-ink treatment. It does **not** claim that the final shader, asset set, passenger rendering technology or runtime performance is already proven.

1. Define and preserve the first-person taxi cockpit/exterior route composition and silhouette hierarchy, with restrained detail and good road/passenger readability.
2. Compare the chosen **hybrid** treatment with useful painterly and soft-cel controls on the **same** representative camera/time/light composition. Do not presume a complex bespoke shader is necessary.
3. Extend the same material language to garage/home and to the currently evaluated expressive 2D passenger solution; keep the puppet technology decision separate from the art direction.
4. Record **three distinct district exploration boards** (industrial Docks, commercial/market, elevated/civic), then a modular **asset exploration sheet**; preserve revisions in Git rather than waiting for a final art bible.
5. Validate representative GLB/material/lighting implementation in Babylon with browser captures, startup/rendering cost, asset memory, readability and visual cohesion. Visual work must not block the first playable shift without a justified dependency.

### Shared acceptance / stop conditions

- A player can finish and persist at least one authentic shift through the standard game UI.
- The taxi is immediately recognizable and legible under representative night lighting; garage/home and passenger presentation do not look like unrelated games.
- Every visible action consumes or changes the canonical domain/app state; debug probes remain verification tools only.
- Neither a fully polished asset set nor a complex final toon shader blocks integration. Conversely, do not postpone all visual decisions until after extensive content production.
- Validate at least one real local/browser walkthrough before expanding the next content batch. Do not mark the entire game complete based only on system-level test success.

See `docs/GAME_DESIGN.md` for the retro-futuristic identity constraint. The concept-level art direction is recorded in `docs/STYLE_BIBLE.md`; detailed palette, asset choices and renderer-wide implementation remain subject to measured look-development work.

## Phase 0 — Repository and production foundation

Goal: a deployable, testable, cloud-agent-friendly game repository.

- TypeScript/Vite/Babylon application foundation.
- CI: typecheck, lint, tests, build.
- Browser smoke verification.
- Content/schema validation infrastructure.
- Stable ID conventions.
- Save-state versioning and migration framework.
- Architecture boundaries for domain, content, rendering, narrative, UI.
- Deployment preview path.

## Phase 1 — World, time, content, and persistence contracts

Goal: establish the shared data model all gameplay builds on.

- Time/calendar model without fixed campaign length.
- District/location/route definitions.
- Passenger/content registry.
- Job/ride contracts.
- Fact/knowledge model.
- Identity/claim model.
- Translator language/pack definitions.
- Radio station/broadcast definitions.
- Taxi upgrade definitions.
- Persistent save/load coverage.

## Phase 2 — Taxi travel and 3D presentation

Goal: make the taxi a convincing moving game space without free driving.

- 3D taxi cockpit.
- Route progression/autopilot.
- Light vehicle dynamics.
- Camera/interior secondary motion.
- Modular route scenery.
- Basic route events and decision hooks.
- Lighting/time presentation contract.
- Passenger seat/placement contract.

## Phase 3 — Passenger and narrative runtime

Goal: establish the complete ride conversation loop.

- Passenger lifecycle: pickup → ride → drop-off → consequences.
- Ink/inkjs integration.
- Typed game-query and game-event boundary.
- Choice/conversation UI.
- Passenger memory hooks.
- Narrative validation/testing.
- Routine/recurring/story passenger content roles.

## Phase 4 — Social stealth systems

Goal: implement the core survival game.

- Cover identity.
- Persistent claims/lies.
- Contradiction detection/query.
- Passenger suspicion.
- City/authority attention.
- Knowledge acquisition and use.
- Human-attitude model distinct from trust/affection.
- Consequence/callback triggers.

## Phase 5 — Inochi passenger performance

Goal: make important passengers expressive participants in the 3D taxi.

- Inochi2D runtime/WASM integration.
- Babylon renderer/bridge.
- Puppet lifecycle and seat placement.
- Talk/blink/gaze/expression control.
- Stylized 3D-light-responsive passenger material.
- Performance cues from narrative state.
- Automated/runtime validation of character assets where feasible.

This phase must integrate with existing passenger/narrative systems; it must not create a parallel character gameplay model.

## Phase 6 — Work, economy, translation, and radio

Goal: make knowledge and access drive the working life of the player.

- Fares, expenses, rewards.
- Legal/official job eligibility.
- Underground job network.
- Translator runtime.
- Translator packs: coverage/quality/legality/risk.
- Radio stations and broadcast scheduling.
- Information learned from radio.
- Passenger reactions where authored.
- Risk/reward upgrade hooks.

## Phase 7 — Garage, home, taxi upgrades, and personal persistence

Goal: create the between-shifts life loop.

- 3D garage.
- 3D home/small apartment/room.
- Taxi upgrade installation/state.
- Maintenance/repair at narrative-appropriate depth.
- Possessions/souvenirs.
- Messages and personal callbacks.
- Shift preparation and return flow.

No base-building system is implied.

## Phase 8 — Relationships and recurring lives

Goal: support deep long-term passenger arcs.

- Persistent relationship state.
- Trust/affection/romance where authored.
- Human-attitude separation.
- Recurring passenger scheduling/availability.
- Relationship-gated jobs/access/events.
- Betrayal/help/reveal consequences.
- Long-horizon callbacks.

## Phase 9 — Content expansion and production hardening

Goal: grow the final game using the established systems.

- More passengers and relationship arcs.
- More routes/district identities.
- More translator packs.
- More stations/broadcasts.
- More jobs/upgrades.
- More home/garage content.
- Performance/accessibility/localization work.
- Save migration robustness.
- Browser/device compatibility.
- Release packaging and storefront work.

## Explicit non-roadmap systems

These are not hidden future milestones:

- free driving;
- open-world traversal;
- combat;
- full traffic simulation;
- police chase simulation;
- drone gameplay;
- base building.

Adding any of them requires a deliberate scope/architecture decision, not opportunistic implementation.
