# Engineering Rules

These rules exist to keep Outsider Driver maintainable under sustained cloud-agent development.

## 1. One production architecture

There is no prototype, demo, vertical-slice, or seven-day architecture beside the final game architecture.

Small fixtures are allowed to exercise production systems. Parallel temporary systems are not.

## 2. Dependency direction

The intended dependency direction is:

```text
content data ---> content adapters ---+
                                      |
domain <--- application orchestration +--- narrative adapter
                                      |
                                      +--- rendering adapter (Babylon)
                                      +--- UI adapter (browser)
```

Rules:
- `domain` must not depend on Babylon.js, DOM/browser UI, or Ink runtime packages.
- `rendering` may implement application-facing ports but must not own gameplay truth.
- `ui` presents state and emits user intent; it must not become the save-game model.
- `narrative` queries domain/application state and emits typed events; Ink variables are not the canonical simulation database.
- the composition root (`src/main.ts` now, a dedicated bootstrap module later if needed) is where concrete adapters are wired together.

## 3. Lifecycle ownership

Every runtime resource with external state must have explicit ownership and disposal.

Examples:
- Babylon engines/scenes;
- event listeners;
- animation/render loops;
- audio contexts;
- workers/WASM resources;
- Inochi puppets/textures;
- subscriptions/timers.

Repeated `start`/`dispose` calls must be safe where lifecycle APIs are intended to be idempotent.

## 4. Strict TypeScript

The repository uses strict TypeScript and intentionally enables additional correctness flags. Do not weaken compiler or lint rules to land a feature.

If a third-party package forces an exception, isolate it at an adapter boundary and document the reason.

## 5. Tests target contracts, not implementation trivia

Prioritize deterministic tests for:
- domain rules;
- save migrations;
- content/schema validation;
- narrative contracts;
- route/dynamics math;
- adapter lifecycle;
- regressions.

Rendering behavior that cannot be proven in unit tests should receive focused browser/visual verification rather than fake assertions.

Every production PR must keep the automated quality gate green. Rendering/bootstrap changes must preserve the browser smoke contract unless the contract itself is deliberately revised.

## 6. Content is data, behavior is code

Passengers, routes, jobs, translator packs, broadcasts, upgrades, facts, and similar authored content should scale through validated data and Ink rather than bespoke conditionals in runtime systems.

New code is justified when new **behavior** is required, not merely because new content was authored.

## 7. Stable identity and persistence

Persistent entities use stable IDs. Never use array positions, display names, or object insertion order as saved identity.

Save formats are versioned. Schema changes that affect persisted state require migrations once that subsystem lands.

## 8. Fail loudly at authoring/build time

Prefer build/validation failures for invalid content, impossible cross-references, malformed narrative contracts, and unsupported states.

Do not silently repair authored data at runtime unless the behavior is an explicitly documented migration/recovery strategy.

## 9. No hidden editor truth

Blender, Inochi Creator, visual inspectors, and other editors may author assets, but game rules and wiring must be reconstructible from repository-visible files.

If an editor emits a binary asset, its integration metadata and semantic identity must remain versioned and reviewable.

## 10. Online verification first

GitHub CI is the canonical merge gate. Vercel previews are review surfaces, not alternative truth.

Prefer exact-head online evidence over asking for local verification when CI/browser automation can prove the requirement. See `docs/DEPLOYMENT.md`.

## 11. Issue and PR discipline

- Continue the canonical branch/PR for an issue instead of creating competing implementations.
- Respect explicit issue dependencies even when GitHub Projects cannot represent them natively.
- Keep PRs dependency-safe and buildable.
- Record verification evidence in the PR/issue.
- Do not mark acceptance criteria complete without evidence.
