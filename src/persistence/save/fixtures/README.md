# Historical save compatibility fixtures

These files are committed compatibility evidence for every supported production save schema.

Rules:

- one fixture exists for every schema version from v1 through the current version;
- fixtures are immutable historical shapes once a version has shipped into this matrix;
- each fixture carries representative stable IDs for the systems available in that version;
- adding save schema vN requires adding `vN.json` and extending the production migration path;
- fixtures use fixed timestamps and deterministic data only;
- do not rewrite old fixtures to match a newer schema.

Run `npm run save:compat` to verify the complete matrix.
