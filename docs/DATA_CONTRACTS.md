# Data Contracts and Persistence Rules

Outsider Driver treats authored content and persistent game state as long-lived production contracts.

## Stable IDs

Persistent/content identity never comes from array position, display name, file order, object insertion order, or a temporary runtime index.

IDs use an explicit semantic kind and lowercase stable slug:

```text
passenger:mina
location:dock-7
route:outer-loop-night
translator-pack:dock-slang-v1
radio-station:civic-one
```

The prefix is part of the contract. Renaming presentation text must not change identity.

Core kinds are defined in `src/domain/ids/EntityId.ts`. New persistent entity categories should extend that canonical list rather than invent unrelated ID formats.

## Authored document schemas

Authored documents use strict runtime schemas. The production helper in `src/content/schema/ContentDocument.ts` standardizes document schema version, typed stable ID, and validated content data.

Unknown or malformed fields should fail at authoring/build time unless a schema intentionally permits them.

## Cross-references

Content references point to stable IDs. The content graph validator establishes shared invariants: IDs are unique, referenced content exists, references may declare the semantic kind they require, and invalid references fail loudly.

Concrete systems project authored documents into this validation graph so cross-system mistakes are caught before runtime.

## Save format

Every save is wrapped in a strict envelope. Current game state is schema v9 and contains:

- resumable `rideSession`;
- nullable `socialState`;
- persistent `translatorState`;
- persistent `economyState`;
- persistent `radioState`;
- persistent `personalSpaceState`;
- persistent `personalPersistenceState`;
- persistent `relationshipState`.

`relationshipState` stores only authoritative relationship progression and recurring-ride history. It does not duplicate passenger suspicion or city attention.

`schemaVersion` is independent from content document versions and subsystem-local state versions.

Production save evolution:

- v1: foundation envelope;
- v2: resumable passenger `rideSession`;
- v3: persistent social-stealth state;
- v4: translator ownership/activation;
- v5: economy/work progression state;
- v6: radio tuning, discovery, listening, and heard-broadcast history;
- v7: personal-space visit/current-space state;
- v8: taxi upgrades, maintenance, possessions, and messages;
- v9: persistent relationship dimensions, human attitude, and completed recurring-ride history.

v8 -> v9 creates an empty relationship state. Passenger relationship defaults are materialized from validated content only when that passenger first participates in the relationship system; the migration does not fabricate historical rides or retroactive affection/trust.

## Migration rules

1. Save migrations are sequential: N -> N+1.
2. The old state is validated before migration.
3. Migrated output is validated against the next version before another migration runs.
4. Missing migrations fail closed.
5. Saves from a future unsupported version fail closed.
6. Migration functions must be deterministic and must not depend on network calls, wall-clock time, random values, or mutable external data.
7. A persisted schema change requires an explicit compatibility decision. Do not silently reinterpret old state.

## Deterministic defaults

Defaults that become persistent truth must be deterministic.

Good examples include empty translator ownership, zero economy progression, or an empty relationship state for a pre-v9 save.

Bad examples include random IDs at load time, `Date.now()` inside a migration, or fabricating prior passenger rides during migration.

The caller supplies save timestamps explicitly so serialization remains testable and deterministic.

## Long-running games

No data contract may assume a seven-day campaign, fixed passenger count, fixed route count, maximum translator-pack catalog, or fixed upgrade catalog.

Recurring passenger cooldowns and availability are authored from game time and completed-ride history, not from a fixed campaign length.
