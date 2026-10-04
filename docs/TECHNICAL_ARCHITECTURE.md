# Technical Architecture

## Architectural goals

1. Cloud agents can implement, test, and review most work directly from GitHub.
2. The repository contains the authoritative game logic and configuration.
3. Production systems are built once and expanded through content.
4. Visual authoring tools may assist asset creation but must not hide gameplay truth.
5. Runtime boundaries are explicit and testable.

## Baseline stack

### Application
- TypeScript
- Vite
- Babylon.js

### Narrative
- Ink source files
- inkjs compiler/runtime integration

### Important passenger characters
- Inochi2D puppet assets
- Inochi2D WASM/runtime
- Custom Babylon integration/renderer as needed

### UI
- HTML/CSS/TypeScript, with React only where it materially helps complex UI
- Babylon GUI may be used for world-attached UI where appropriate

### Data
- Versioned JSON or similarly Git-friendly authored content
- Runtime validation through explicit schemas
- Stable IDs
- Save-game schema with migrations

### Testing
- Unit tests for domain systems
- Schema/content validation
- Narrative compilation and path/contract tests
- Browser automation for critical flows
- Visual/screenshot checks for rendering-sensitive integration where useful

## Why Babylon.js

The game is code-first and cloud-agent-first. Babylon offers:
- strong TypeScript workflow;
- 3D lighting/material/shader support;
- WebGL/WebGPU pathways;
- direct code ownership of scenes and runtime;
- flexible custom mesh/material integration for Inochi2D;
- browser-native automated verification.

Avoid making a GUI scene editor mandatory for routine engineering work.

## Runtime layers

```text
Authored Content
  Ink / JSON / assets / .inp
          |
          v
Domain Systems
  time, jobs, identity, knowledge, lies,
  suspicion, relationships, economy, upgrades
          |
          v
Gameplay Orchestration
  shift, passenger lifecycle, ride, route events,
  home/garage state, consequences
          |
          +--------------------+
          |                    |
          v                    v
Rendering                  Narrative
Babylon.js                 inkjs
3D world                   authored flow
Inochi bridge              choices/events
          |
          v
Presentation / UI / Audio
```

## Domain ownership

The domain layer owns persistent truth.

Ink may:
- query exposed facts/state;
- select authored branches;
- emit typed narrative/gameplay events.

Ink must not become the authoritative store for:
- relationships;
- economy;
- cover identity;
- knowledge;
- lies;
- permanent world state.

## Core domain concepts

Use stable IDs and explicit models for at least:

- Passenger
- Species / culture metadata where needed
- District
- Location
- Route
- RouteSegment
- RouteEvent
- Job
- Ride
- IdentityProfile
- Claim / Lie
- Fact / Knowledge
- Relationship
- SuspicionState
- CityAttention
- Language
- TranslatorPack
- RadioStation
- Broadcast
- TaxiUpgrade
- Item / Souvenir
- HomeState
- GarageState
- TimeState

Do not force all of these into one database or giant state object. Define bounded services/models with serialized state contracts.

## Route and vehicle architecture

```text
Route definition
    |
    v
Route progression / autopilot
    |
    +--> target velocity / curvature / surface
    |
    v
Light Vehicle Dynamics
    |
    +--> taxi body transform
    +--> suspension/pitch/roll
    +--> camera motion
    +--> interior secondary motion
    +--> audio parameters
    +--> passenger secondary-motion inputs
```

The route system is not a hidden free-driving simulator. It provides deterministic travel context and event positions.

## Inochi2D integration

Treat important passengers as deforming 2D character geometry integrated with the 3D presentation.

Responsibilities:
- load puppet;
- update parameters/automation;
- map puppet draw data to Babylon rendering;
- support masks/blend modes;
- place passenger in cabin;
- expose expression/gaze/talking/performance controls;
- adapt scene/cabin lighting to stylized passenger shading;
- keep character content independent of gameplay state.

Do not block core game development on a universal character factory. A robust integration for production characters comes first.

## Lighting approach

The 3D scene owns environment lighting state.

Passenger rendering may use a stylized material rather than physically identical PBR. It should respond coherently to:
- ambient cabin light;
- passing neon;
- tunnels;
- headlights;
- emergency lights;
- time/weather changes.

The goal is visual coherence, not strict physical equivalence.

## Save architecture

Save state is versioned from the beginning.

Requirements:
- schema version;
- migration path;
- stable IDs, never array positions as identity;
- deterministic defaults;
- no fixed seven-day or demo assumptions;
- support long-running calendars and content additions.

## Content architecture

Systems are generic; authored content is data.

Adding:
- a passenger;
- route;
- translator pack;
- station;
- broadcast;
- upgrade;
- job;
- fact;
- relationship arc

should not require a bespoke runtime subsystem unless the content introduces genuinely new behavior.

## Deployment

Web is the primary development/runtime target because it maximizes cloud-agent verification.

Desktop packaging/store delivery can be added later around the same web-first codebase without changing game-domain architecture.
