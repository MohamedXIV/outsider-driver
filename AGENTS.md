# Outsider Driver — Agent Instructions

This repository is built for sustained cloud-agent execution. GitHub is the canonical engineering surface.

## Prime directive

**Build the final game architecture from day one.**

Do not create:

- vertical-slice-only systems;
- demo-only managers or schemas;
- hard-coded seven-day/demo endings;
- temporary gameplay architecture intended to be replaced later;
- editor-only configuration that cannot be reconstructed from repository state.

Early development reduces **content quantity**, not the scope or correctness of the production systems.

## Product invariants

1. Outsider Driver is a narrative social-stealth game, not a driving simulator.
2. Free/manual driving is out of scope unless a future explicit design decision reverses this.
3. Travel is automatic/route-driven, with player route/risk decisions where authored.
4. The taxi still has light vehicle dynamics: suspension/body motion, acceleration/braking pitch, turn roll, road vibration, and related camera/interior response.
5. Taxi cockpit, garage, and home/apartment are important 3D spaces.
6. Open-world city exploration is out of scope.
7. Recurring passengers, authored dialogue, relationships, knowledge, lies, identity, suspicion, translator packs, radio, jobs/economy, and persistent progression are core.
8. Runtime generative dialogue is not a foundation of the game.
9. Important passenger characters may be Inochi2D puppets rendered/integrated with the 3D world.
10. Content must be data-driven and expandable without rewriting systems.

## Technical working rules

- Prefer TypeScript and repository-visible data/configuration.
- Babylon.js scenes/systems should be reconstructible from code and versioned data.
- Avoid opaque visual-editor ownership of gameplay truth.
- Keep Ink source files as narrative source of truth; compiled output is generated runtime material.
- Game/domain state owns truth. Narrative scripts query and emit domain events; narrative files do not become the simulation database.
- Inochi assets are content; the integration layer owns rendering, scene lighting adaptation, expression/parameter control, and lifecycle.
- Use stable IDs for passengers, routes, districts, locations, language packs, upgrades, jobs, facts, lies, broadcasts, and narrative entries.
- Save data is versioned and migration-capable from the beginning.
- No system may assume a fixed maximum number of days, passengers, routes, packs, or upgrades unless documented as an intentional product limit.
- Follow `docs/ENGINEERING_RULES.md`; do not weaken strict compiler/lint settings to make a change pass.
- Domain code must remain renderer/UI/narrative-runtime independent.
- External runtime resources require explicit lifecycle ownership and disposal.

## Agent-friendly delivery

Every executable issue should aim to leave the repository in a buildable state.

Before claiming completion, run the strongest available form of:

```bash
npm run check
```

Prefer:

- small dependency-safe PRs;
- deterministic tests;
- schema validation;
- browser automation where practical;
- fixture content that exercises the real production system;
- exact acceptance criteria and evidence.

A fixture is acceptable. A parallel demo architecture is not.

## GitHub execution discipline

- Read the current issue, roadmap, `AGENTS.md`, and relevant architecture docs before implementation.
- Respect `Depends on: #...` declarations even when the Project board cannot express them as native blocked-by relationships.
- Continue an existing canonical branch/PR for an issue instead of creating competing work.
- Do not mark an issue complete based on stale or different-head verification.
- Keep acceptance evidence on the PR/issue when practical.

## Scope discipline

When considering a new feature, ask:

1. Does it strengthen conversation, knowledge, deception, relationships, work, survival, or taxi atmosphere?
2. Does it require a new system, or can it be authored as content using an existing one?
3. Can it be postponed without weakening the core?
4. Does it accidentally move the game toward open-world, driving-sim, combat, or base-building scope?

Prefer expanding content on established systems before adding optional systems.
