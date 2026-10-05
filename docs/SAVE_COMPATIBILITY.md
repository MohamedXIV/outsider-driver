# Save Compatibility Matrix

Production saves are compatibility contracts, not disposable development snapshots.

## Canonical evidence

`src/persistence/save/fixtures/v1.json` through the current schema version are committed historical envelopes.

Each fixture:

- uses the exact state shape that version accepted;
- uses a fixed UTC timestamp;
- carries representative stable IDs for systems available in that version;
- is never rewritten merely because the current schema changed.

The fixture list is intentionally explicit in `SaveCompatibility.test.ts`. The test requires fixture versions to equal every integer from 1 through `CURRENT_SAVE_SCHEMA_VERSION`. Bumping the current version without adding the next fixture therefore fails CI.

## Required workflow for a new save version

When adding vN:

1. add the vN schema and sequential v(N-1) -> vN migration;
2. add `fixtures/vN.json` representing the real new version;
3. preserve all existing historical fixtures unchanged;
4. run `npm run save:compat`;
5. run the full `npm run check`.

A new version is not complete until every historical fixture can still decode to the new current schema.

## What the matrix proves

For every supported version the automated matrix verifies:

- decode succeeds through every required migration step;
- two independent decodes produce identical output;
- current serialization of the migrated state is deterministic for the same timestamp;
- stable semantic IDs already present in the historical save remain present after migration;
- adding an unknown field to historical state fails closed at that historical schema boundary.

Additional corruption checks verify malformed envelopes, malformed JSON, and unsupported future versions fail explicitly.

## Error boundary

`VersionedSaveCodec` wraps envelope/state validation failures with save-specific context:

```text
Save envelope is invalid: ...
Save state for version 6 is invalid: ...
Save data is not valid JSON.
```

The original validation error remains attached as the error cause.

The codec never repairs malformed historical state, guesses a missing migration, uses mutable content ordering, reads wall-clock time, or generates random values during migration.
