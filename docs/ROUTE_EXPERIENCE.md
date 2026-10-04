# Route Experience: Scenery, Atmosphere, Decisions, and Events

Route experience sits above deterministic route progression. It makes authored taxi travel feel like a place without turning the city into an open world.

## Separation of concerns

```text
World route contracts + RouteProgression
                │
                ├─► VehicleDynamics
                │
                └─► Route experience
                     ├─ typed event timeline
                     ├─ decisions/checkpoints/annotations
                     ├─ modular scenery
                     └─ district atmosphere
```

Changing scenery or atmosphere must not require changes to `VehicleDynamics`.

## Typed route events

The base world contract owns event identity and position:

- stable `route-event:<slug>` ID;
- stable hook ID;
- normalized progress inside a route segment.

`RouteExperienceCatalog` gives every authored route event exactly one typed behavior:

### Annotation

Emits a typed `route.annotation` event and travel continues.

Use this for non-blocking world/narrative hooks such as entering a monitored area, passing a landmark, or notifying another system.

### Checkpoint

Emits `route.checkpoint` and pauses route flow exactly at the authored event position.

Checkpoint resolution is explicit. Route progress does not resume until the caller resolves it with `continue`.

The checkpoint contract is deliberately generic; immigration/security gameplay can build on it later without moving checkpoint logic into vehicle dynamics.

### Decision

Emits `route.decision` with stable authored choices and pauses route flow.

A choice command is either:

- `continue`: remain on the current route;
- `divert`: replace the remaining route with another validated authored route.

The route is replaced only after explicit resolution. Rendering does not choose routes.

## Event crossing

`RouteEventTimeline` converts segment-local normalized event positions into deterministic elapsed-route minutes.

`RouteFlowController` uses the timeline to clamp advancement to the next blocking event. A large frame/update cannot silently skip a checkpoint or decision.

Already-emitted stable event IDs are tracked by the flow controller so the same event does not fire repeatedly while paused.

## Modular route scenery

Each route segment has exactly one scenery profile keyed by its stable segment ID.

A scenery profile owns:

- a presentation travel distance;
- reusable presentation modules;
- no route truth and no physics parameters.

`RouteSceneryPresenter` creates those modules beneath `worldRoot` and moves only its own scenery root from normalized segment progress.

It never moves `taxiMotionRoot`, changes route progress, or writes vehicle-dynamics state.

The initial module type is a deterministic box primitive. Future schema versions can add glTF/GLB module references while retaining the same segment-scoped presentation contract.

## District visual identity

Every district has an explicit visual profile containing:

- clear/background color;
- ambient color and base intensity;
- fog color and dry/rain fog densities;
- day/night ambient multipliers;
- precipitation ambient multiplier.

Runtime environment input currently contains `daylightFactor` and `precipitation`. Resolution is deterministic and affects scene presentation only.

This gives future time/weather systems a stable input boundary without making route content own calendar or weather simulation.

## Scope guardrails

This system does not add:

- open-world streaming;
- road-network navigation;
- traffic simulation;
- steering;
- procedural route generation;
- physics-driven branching.

Distinct routes come from authored combinations of segments, scenery, atmosphere, and events.
