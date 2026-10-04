# Roadmap

## Roadmap rule

This is **not a vertical-slice roadmap**.

Every phase lands production architecture intended to remain in the final game. Early milestones use small fixture/content sets to prove systems, but no phase creates a throwaway demo layer.

Content breadth grows continuously after the system spine exists.

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
