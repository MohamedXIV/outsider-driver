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

Every save is wrapped in a strict envelope. Current game state is schema v8 and contains:

- resumable `rideSession`;
- nullable `socialState`;
- persistent `translatorState`;
- persistent `economyState`;
- persistent `radioState`;
- persistent `personalSpaceState`;
- persistent `personalPersistenceState`.

`economyState` stores credits, lifetime earnings/expenses, official standing, underground access, and settled ride IDs so a retry cannot pay the same ride twice.

`schemaVersion` is independent from content document versions and subsystem-local state versions.

Production save evolution:

- v1: foundation envelope;
- v2: resumable passenger `rideSession`;
- v3: persistent social-stealth state;
- v4: translator ownership/activation;
- v5: economy/work progression state;
- v6: radio tuning, listening, discovery, and heard-broadcast history;
- v7: personal-space current/visited state and authored flag overrides;
- v8: owned/installed taxi upgrades, taxi condition/maintenance, possessions, and delivered/read messages.

The social slot remains nullable because historical saves must not fabricate a cover identity that the player never selected.

v3 -> v4 creates empty translator ownership. v4 -> v5 creates a deterministic empty economy state: zero credits, zero official standing, zero underground access, and no settled rides. v5 -> v6 creates radio off, untuned, with no hidden stations discovered and no broadcasts marked heard. v6 -> v7 creates personal-space state outside every space with no fabricated visits and no flag overrides. v7 -> v8 creates a fully maintained taxi with no owned/installed upgrades, possessions, maintenance issues, or delivered messages.

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

Good examples include empty translator ownership, zero economy progression, or a fixed starting amount when product rules explicitly define one.

Bad examples include random IDs at load time, `Date.now()` inside a migration, or choosing a fallback route based on current catalog order.

The caller supplies save timestamps explicitly so serialization remains testable and deterministic.

## Long-running games

No data contract may assume a seven-day campaign, fixed passenger count, fixed route count, maximum translator-pack catalog, or fixed upgrade catalog.

Limits are allowed only when they are intentional product rules and documented as such.
