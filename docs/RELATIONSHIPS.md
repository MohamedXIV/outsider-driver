# Relationships and Recurring Passengers

Relationships are persistent progression, but they are not safety meters.

## Independent axes

The production relationship model separates four concepts:

- **trust** — optional 0–100 relationship dimension;
- **affection** — optional 0–100 relationship dimension;
- **attitude toward humans** — independent -100 to +100 axis;
- **suspicion** — existing per-ride/passenger social-stealth pressure in `SocialStealthState`.

A passenger may trust or love the driver while still disliking humans. Conversely, a passenger may support humans politically while personally distrusting the driver.

No system derives one axis from another.

## Optional affection

Relationship profiles author dimensions per passenger.

The official clinic rider currently authors trust but no affection.

The recurring underground rider authors trust and affection.

Calling a disabled dimension fails loudly. This prevents every recurring character from acquiring a meaningless romance meter.

## Ride history

`RelationshipStateStore` records completed ride IDs and the last completion time per passenger.

Recording the same ride twice is idempotent. This lets completion adapters retry without inflating relationship history.

## Recurring eligibility

`RecurringPassengerScheduler` evaluates authored recurrence policy against:

- prior completed rides;
- cooldown;
- current game-time window;
- required and forbidden facts;
- trust/affection thresholds when authored;
- human-attitude thresholds when authored.

This supports callbacks based on both prior rides and world state without hard-coded chapter/day numbers.

## Narrative integration

Ink can query relationship values, human attitude, and completed-ride count through typed externals.

Ink can request relationship/human-attitude changes through typed events. Social-stealth and relationship events are routed to separate authoritative stores.

A real inkjs test proves the same passenger can simultaneously satisfy a high-trust branch and a hostile-human-attitude branch.

## Jobs and access

`JobContract` supports optional relationship requirements.

Work eligibility can therefore gate authored jobs on prior rides or relationship state. Missing relationship context fails the requirement rather than granting access.

## Persistence

Production save v9 adds `relationshipState`.

Migration from v8 starts with no fabricated relationship entries or historical rides. Entries are materialized from validated passenger profiles when first used.
