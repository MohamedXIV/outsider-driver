# Production Content Authoring

Outsider Driver is authored from repository-visible files. A proprietary editor is never required to create, validate, review, or merge gameplay content.

## Canonical production manifest

`src/content/production/ProductionContent.ts` is the composition point for authored production content.

It currently registers:

- world districts, locations, route events, route segments, and routes;
- route motion profiles;
- route experience/scenery/visual profiles;
- passenger catalog;
- passenger semantic performance profiles;
- official and underground jobs;
- translator languages and packs;
- radio stations, schedules, broadcasts, information hooks, and passenger reactions;
- 3D personal spaces: garage/home layouts, lighting, movement bounds, persistent flags, and interaction anchors;
- narrative story sources;
- taxi scene definition.

Small content quantity is not a separate demo architecture. The same manifest, schemas, validators, and runtime boundaries grow into the complete game.

Do not create a second prototype/sample/editor-only content database.

## Validation command

```bash
npm run content:check
```

This is part of `npm run check` and GitHub CI. Structurally invalid canonical content must fail before merge.

## What is validated now

`validateProductionContent` aggregates independent authoring failures.

Current checks include:

- strict schema/enum validation;
- duplicate/missing stable IDs;
- world and route cross-references;
- unreachable route segments/events;
- exact route motion/experience coverage;
- job passenger/location/route references;
- official/underground job source terms, fare, expenses, and completion hooks;
- translator language/pack references and compatibility;
- radio station/language references;
- radio route/job intel targets and reacting passengers;
- personal-space IDs, local asset/anchor/flag uniqueness, and visibility-flag references;
- passenger narrative references;
- passenger performance profile references;
- Ink `performance:<cue>` tags against each passenger's authored cue catalog;
- approved Ink externals + real Ink compilation;
- taxi scene schema;
- current save defaults and codec round-trip.

## Passenger performance authoring

Narrative requests passenger acting through semantic Ink tags:

```ink
Passenger: Keep moving. # performance:firm
```

The tag names a cue from that passenger's production performance profile. Narrative never names Inochi parameters such as mouth, gaze, or rig-specific controls.

A performance profile maps reusable semantic channels to a specific puppet:

- talk;
- blink;
- gaze;
- head pose;
- body pose;
- named expressions;
- named cues combining those controls.

`content:check` fails when a narrative requests a cue missing from the passenger's profile.

When a real puppet asset is bound, `PassengerPerformanceController` validates every authored parameter name and dimensionality against the actual Inochi runtime parameter descriptors before applying a cue.

## Job authoring

A job is data, not a hard-coded button.

Every job authors:

- source channel: `official` or `underground`;
- availability;
- passenger + route endpoints;
- fare terms;
- expense terms;
- completion progression effects.

Official jobs can require minimum official standing plus arbitrary cover-identity key/value requirements.

Underground jobs can require underground access and carry a risk footprint.

`WorkNetwork` applies those rules to the same production jobs. `PassengerRideOrchestrator.acceptJob` rechecks eligibility so bypassing presentation/UI cannot bypass the work gate.

## Same content as runtime

Validation is not maintained against a hand-copied validation fixture.

Babylon consumes `productionContent.taxiScene` and `productionContent.personalSpaces`; passenger acting consumes `productionContent.passengerPerformance`; translator systems consume `productionContent.translator`; work/economy systems consume `productionContent.jobs`; radio systems consume `productionContent.radio`.

Tests may mutate production-shaped data for negative/focused scenarios, but fixtures never become alternate production truth.

## Adding a new content system

When broadcasts, upgrades, or other authored systems land:

1. define a strict versioned schema;
2. use stable semantic IDs;
3. register production content in `ProductionContent.ts`;
4. add cross-reference validation;
5. add negative tests;
6. expose it through the production manifest/application adapter;
7. keep `npm run content:check` green.

If a content type cannot be validated from repository-visible files, its authoring architecture is incomplete.


## Personal-space authoring

Garage and home are authored through the same `PersonalSpaceCatalog`. They are not bespoke scene-code islands.

A personal space defines:

- stable `personal-space:<slug>` identity;
- garage/home kind and display name;
- first-person camera spawn, movement speed, look sensitivity, and movement bounds;
- environment + practical lighting;
- collidable 3D assets;
- persistent boolean flags with deterministic authored defaults;
- assets whose visibility can depend on those flags;
- typed interaction anchors.

Current anchor kinds are:

- taxi access;
- upgrades;
- messages;
- possessions;
- sleep;
- exit.

Later systems such as #27 attach behavior to those typed anchors. They must not hard-code object positions or rebuild the garage/home renderer.

Persistent flags are intentionally generic presentation/state hooks. They may show or hide an authored asset, but domain systems remain responsible for deciding when a flag changes.
