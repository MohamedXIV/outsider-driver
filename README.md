# Outsider Driver

**Outsider Driver** is a narrative social-stealth game about an illegal human living in a city where humans are not allowed, surviving by working as a taxi driver while pretending to belong.

The taxi is the game's primary social space. The player does **not** manually drive moment-to-moment. Travel is handled by an autopilot/route system while the player reads passengers, talks, lies, learns the city, reacts to risk, manages work, and builds relationships.

## Product direction

- Narrative social stealth, not a driving simulator.
- Final-game architecture from the first commit: **no disposable prototype or vertical-slice systems**.
- 3D taxi, garage, and home/apartment are core spaces.
- Routes are authored/data-driven travel sequences rather than an open world.
- Light vehicle dynamics preserve weight, suspension, braking, road vibration, and motion.
- Recurring passengers, relationships, lies, memory, suspicion, and knowledge are core gameplay.
- Translator hardware + language/dialect packs are a first-class progression system.
- Radio is a gameplay/world-information system.
- Legal and underground work/economies coexist.
- Important passengers use expressive 2D puppet characters integrated into the 3D scene.
- Cloud-agent-friendly, Git-first development is a primary technical constraint.

## Current technical baseline

- TypeScript
- Vite
- Babylon.js for 3D/rendering
- Inochi2D/WASM for important passenger puppets
- Ink + inkjs for authored narrative
- Data-driven content with versioned schemas
- Automated tests and browser verification suitable for cloud agents

The technical baseline may evolve only through explicit architectural decisions; editor-only state must never become the sole source of truth.

## Development

Use Node 24 when available (`.nvmrc` is provided). Node 22.13+ is also supported.

```bash
npm install
npm run check
npm run dev
```

`npm run check` is the local quality gate: lint, deterministic tests, typecheck, and production build.

The repository is intentionally code-first. Babylon.js is an adapter behind an application rendering port rather than the owner of game state.

See:

- [Game Design](docs/GAME_DESIGN.md)
- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Engineering Rules](docs/ENGINEERING_RULES.md)
- [Roadmap](docs/ROADMAP.md)
- [Scope](docs/SCOPE.md)
- [Agent Instructions](AGENTS.md)
