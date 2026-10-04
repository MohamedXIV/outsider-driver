# Passenger Ride Lifecycle

The production ride loop is one generic application state machine. Routine, recurring, and story passengers use the same lifecycle and differ through authored passenger/narrative content rather than separate managers.

## Lifecycle

```text
job
 │ accept
 ▼
assigned
 │ pickup
 ▼
active ── route events / decisions / dialogue ──┐
 │                                              │
 │ route arrives                               │
 ▼                                              │
dropoff-ready ◄─────────────────────────────────┘
 │ drop off
 ▼
completed
```

### Assigned

The job has been validated against world content and a stable passenger ID. Acceptance must occur inside the job availability window.

No route or narrative runtime exists yet.

### Active

Pickup creates:

- one `RouteFlowController` for the authored route;
- one `InkNarrativeRuntime` for the passenger's authored story;
- an application-facing dialogue/choice presentation snapshot.

Route events and narrative consequences remain typed through their existing boundaries.

### Dropoff-ready

When route progression reaches `arrived` and no blocking route event remains, the ride becomes dropoff-ready.

Narrative may still be at a choice boundary; route arrival does not silently mutate or discard narrative state.

### Completed

Drop-off derives a normal completed `RideContract` and invokes `RideCompletionCommitPort` **before** marking the ride completed.

That port is the atomic hand-off for systems that own final effects such as fare resolution and persistent passenger/world changes. Issue #19 defines the orchestration point; social-state implementation belongs to #20 and economy implementation belongs to #23.

If the completion port throws, the ride remains dropoff-ready and can be retried. The orchestrator never claims completion before the owning systems accept the commit.

## Passenger contract

Every passenger uses the same strict content document:

- stable `passenger:<slug>` ID;
- display name;
- lifecycle kind: `routine`, `recurring`, or `story`;
- stable narrative story ID.

Lifecycle kind is classification/content metadata. It does not select a different ride controller.

## Dialogue/choice presentation

`RidePresentation` exposes a renderer/UI-neutral view:

- ride phase;
- passenger identity/display metadata;
- current `NarrativeTurn` lines and choices;
- current blocking route event if any;
- normalized route progress;
- whether drop-off is currently permitted.

Presentation code does not own ride state.

## Supported resume boundaries

Ride session state is JSON-serializable at application command boundaries:

- after job acceptance;
- after pickup and initial narrative turn;
- after a dialogue choice;
- after route advancement;
- while paused at a checkpoint/decision;
- after route-event resolution;
- after arrival;
- after completion.

Active saves contain:

- stable ride/job/passenger/location IDs;
- accepted/pickup game times;
- route-flow state using stable route/segment/event IDs;
- inkjs narrative state JSON;
- the current dialogue presentation snapshot.

Route dynamics are intentionally **not** persisted. They are presentation response and restart from a neutral state when a route session is restored; route truth resumes from the persisted route-progress contract.

Ink runtime state is persisted only to resume conversation position. Domain facts, claims/lies, relationships, suspicion, city attention, economy, and world state remain owned by their respective domain systems.

## Diversions

A route decision may request an authored diversion, but the ride orchestrator validates that the diversion has the same pickup and destination endpoints as the ride contract.

This prevents narrative/presentation route choices from changing the semantic destination of an accepted job.

## No demo passenger manager

There is no special foundation/demo passenger controller. Test fixtures use the same passenger catalog, route flow, Ink runtime, ride session schema, and orchestrator intended for production content.
