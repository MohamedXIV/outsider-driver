# Content boundary

Versioned authored-data loading, schemas, registries, production manifests, and validation live here. Content data is not game-state authority.

Core rules:
- authored documents have explicit schema versions;
- persistent references use typed stable IDs;
- cross-references are validated before runtime;
- canonical shipped/production content is registered through `src/content/production/ProductionContent.ts`;
- `npm run content:check` validates that canonical content, including real Ink compilation;
- content quantity may grow without replacing the runtime architecture;
- fixtures may mutate or extend production-shaped data for tests, but fixtures are never a second game database.

See `docs/DATA_CONTRACTS.md` and `docs/CONTENT_AUTHORING.md`.
