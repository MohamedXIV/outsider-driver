# Autopilot and Light Vehicle Dynamics

Outsider Driver uses deterministic authored travel. The taxi feels physically present, but the player does not steer it moment to moment.

## Source-of-truth boundary

Three layers stay separate:

```text
World route contracts
        │
        ▼
RouteProgression ──► route/segment progress
        │
        ├────────────► RouteMotionProfile sampling
        │
        ▼
VehicleDynamics ───► body/camera/secondary-motion response
        │
        ▼
TaxiMotionPresenter ─► Babylon transform roots
```

### RouteProgression owns travel truth

Route progression consumes:

- the stable route ID;
- the route's ordered stable segment IDs;
- authored segment durations;
- deterministic elapsed game time.

Its persisted/runtime identity is the stable `route-segment:<slug>` ID plus elapsed time within that segment. Array position is never persisted as identity.

Route elapsed time and total duration are derived from the authored route catalog rather than duplicated as mutable truth.

### RouteMotionProfile owns motion presentation input

Each authored route segment has one motion profile keyed by its stable segment ID.

A profile contains normalized progress samples for:

- target speed in metres per second;
- signed curvature;
- road-surface roughness.

Samples start at 0, end at 1, and increase strictly. The runtime interpolates between them deterministically.

These profiles do **not** define navigation, steering, road topology, or route completion.

### VehicleDynamics owns response, not travel

The pure dynamics function consumes the sampled motion signal plus its previous state and a time delta.

It produces:

- speed and acceleration;
- acceleration/braking pitch;
- curvature-derived roll;
- suspension/body bob;
- road-surface vibration;
- camera pitch/roll/vertical response;
- an interior secondary-motion signal for later passenger/prop animation.

The dynamics system cannot advance or change route identity. It has no steering input.

All parameters are explicit and testable. Bob/vibration are deterministic functions of elapsed simulation time; random noise is intentionally avoided so equal input sequences produce equal results.

### TaxiMotionPresenter owns Babylon transforms only

The presenter applies body response to `taxiMotionRoot` and the additional camera response to `cameraMotionRoot`.

It does not modify:

- `worldRoot`;
- yaw/steering;
- route IDs;
- route progress;
- authored motion profiles.

## Time scaling

`TaxiAutopilotController` has an explicit `gameMinutesPerRealSecond` setting. This lets authored routes have useful game-world durations without tying route truth to frame rate or wall-clock time.

The same sequence of deltas and content produces the same route/dynamics snapshots.

## Arrival

When route progression reaches the authored destination, route state becomes `arrived`.

The autopilot then feeds a zero-speed/zero-curvature/zero-roughness motion target to dynamics. Vehicle response can settle naturally without changing the already-completed route truth.

## Explicit non-goals

This system does not provide:

- player steering;
- WASD/free-driving controls;
- a tire/contact model;
- engine/transmission simulation;
- traffic AI;
- an open-world road graph;
- route-finding between arbitrary positions.

Future route scenery and event work may consume route/segment progress. It must not move travel truth into rendering.
