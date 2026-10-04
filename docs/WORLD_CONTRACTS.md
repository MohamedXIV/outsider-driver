# World, Time, Job, and Ride Contracts

These contracts define the production vocabulary used by later gameplay systems. They intentionally describe authored taxi travel rather than an open-world road simulation.

## Calendar

Game time is represented by:

- an unbounded gameplay day number starting at 1;
- a minute within that day from 0 through 1439.

There is no seven-day, chapter-length, or campaign-length assumption. The only implementation ceiling is JavaScript safe-integer precision when converting a date to a linear minute index.

Time advancement is explicit and deterministic. Domain logic does not read the wall clock.

## World hierarchy

The world contract is deliberately small:

```text
District
  └─ Location

Route
  └─ ordered stable RouteSegment IDs
       └─ stable RouteEvent IDs
```

A route is an **authored travel sequence** from one location to another. It is not a navigation graph and does not imply that the player can freely drive streets between arbitrary nodes.

### District

A district is a stable authored region used by locations and route segments.

### Location

A location is a stable named place inside one district. Jobs use location IDs for pickup and destination.

### Route

A route explicitly names its origin, destination, and ordered segment IDs. Segment order is authored presentation/gameplay order; segment identity is still the stable ID, never its array index.

### Route segment

A segment has an authored duration, district context, and zero or more route-event IDs. Later rendering/dynamics systems can attach visual path data without changing the domain identity contract.

### Route event

A route event exposes a stable `hookId` and normalized progress point. The hook is intentionally generic so later systems can implement checkpoints, decisions, narrative triggers, radio interruptions, or other behavior without turning the route contract into a giant union.

## Jobs

A job references:

- a stable job ID;
- passenger ID;
- pickup location;
- destination location;
- route;
- availability window.

Reference validation guarantees that the route exists and its authored endpoints match the job.

Fare/economy fields are intentionally deferred to the economy system rather than prematurely embedding money rules here.

## Rides

A ride is runtime/domain state, not authored content.

The current contract supports accepted, active, completed, and cancelled states. Active route progress stores the **route-segment ID plus normalized progress**. It never persists a segment array index.

The passenger, route, pickup, and destination are copied into the ride contract so the ride retains explicit semantic references even if a job-offer collection is later rotated or removed from memory.

## Passenger boundary

Passenger content is implemented in a later workstream. This foundation therefore owns only the typed `passenger:<slug>` reference and accepts a caller-provided set of known passenger IDs for cross-reference validation.

That is a deliberate dependency boundary, not a placeholder passenger model.
