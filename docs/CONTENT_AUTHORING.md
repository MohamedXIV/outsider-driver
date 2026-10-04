# Production Content Authoring

Outsider Driver is authored from repository-visible files. A proprietary editor is never required to create, validate, review, or merge gameplay content.

## Canonical production manifest

`src/content/production/ProductionContent.ts` is the composition point for authored content that belongs to the production game.

It currently registers:

- world districts, locations, route events, route segments, and routes;
- route motion profiles;
- route experience/scenery/visual profiles;
- passenger catalog;
- job catalog;
- narrative story sources;
- taxi scene definition.

The catalog is intentionally allowed to be small while systems are being built. Small content quantity is not a separate demo architecture: the same manifest, schemas, validators, and runtime boundaries are meant to grow into the complete game.

Do not create a second “prototype”, “sample game”, “vertical slice”, or editor-only content database.

## Validation command

Run:

```bash
npm run content:check
```

The command runs production-content contract tests through the same Vite/Vitest environment that understands repository Ink imports. It is also part of `npm run check`, which is the GitHub CI gate.

A PR with structurally invalid canonical content must fail CI before merge.

## What is validated now

`validateProductionContent` aggregates authoring failures across independent scopes instead of stopping at the first unrelated error.

Current checks include:

- strict schema and enum validation;
- duplicate stable IDs inside catalogs;
- missing world cross-references;
- route endpoint/segment/event references;
- route segments that are not reachable from any route;
- route events that are not used by any segment;
- exact route-motion coverage;
- exact route-event/district/scenery experience coverage;
- invalid diversion route references;
- duplicate jobs;
- job passenger/location/route references;
- duplicate narrative story IDs;
- passenger narrative-story references;
- approved Ink external-function contract;
- real Ink compilation through `inkjs`;
- taxi scene definition validation;
- current save defaults and codec round-trip.

## Same content as runtime

Validation is not maintained against a hand-copied validation fixture.

The Babylon production runtime takes its taxi scene from `productionContent.taxiScene`. Other gameplay composition should consume the same canonical manifest as those systems are wired into the runtime.

Tests may use fixtures to create malformed variants or focused domain scenarios. Fixtures are test inputs only and must not become alternate production truth.

## Adding a new content system

When a production system such as translator packs, broadcasts, upgrades, or authored jobs lands:

1. define its strict versioned content schema;
2. use stable semantic IDs for persistent/cross-system identity;
3. add its production catalog to `ProductionContent.ts`;
4. add cross-reference validation to `ProductionContentValidator.ts`;
5. add negative tests proving bad references/options fail;
6. expose it to runtime through the production manifest or an adapter derived from it;
7. keep `npm run content:check` green.

If a new content type cannot be validated from repository-visible files, its authoring architecture is incomplete.

## Error behavior

Production validation fails loudly and reports scopes such as:

```text
[world] ...
[passengers] ...
[narrative] ...
[jobs] ...
[route-motion] ...
[route-experience] ...
[passenger-narrative] ...
[taxi-scene] ...
[save-contract] ...
```

Independent errors are accumulated where possible so agents and humans can fix several authoring mistakes in one pass.

The validator never silently invents missing content or repairs broken references at runtime.
