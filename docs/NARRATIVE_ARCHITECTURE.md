# Narrative Architecture: Ink as Authored Story, Domain as Truth

Ink is the narrative source of truth for authored conversation flow and prose. It is not authoritative game-state storage.

The production boundary uses `inkjs` to compile and run repository-visible `.ink` source. Ink source remains ordinary text in Git so humans and coding agents can author, review, diff, and test it.

## Ownership split

```text
Domain state
  │
  ├─ NarrativeQueryPort ──► Ink conversation
  │
  ◄─ NarrativeDomainEvent ─ Ink conversation
  │
  ▼
Application/domain event handlers
```

Ink may:

- author dialogue, knots, stitches, choices, and narrative-local temporary state;
- query approved game facts through narrow typed external functions;
- request approved consequences by emitting typed domain events.

Ink may not:

- write relationship state directly;
- write economy/balance state directly;
- own identity or persistent claims/lies;
- own knowledge/fact truth;
- own passenger suspicion;
- own city attention;
- mutate route/world truth.

Those systems remain in the domain/application layers and will consume narrative events as their implementations arrive.

## Approved query boundary

The first production query port exposes only:

- `GAME_HAS_FACT(fact_id)`;
- `GAME_HAS_CLAIM(claim_id)`;
- `GAME_PASSENGER_SUSPICION(passenger_id)`;
- `GAME_CITY_ATTENTION()`.

Arguments cross a strict stable-ID boundary. For example, `GAME_HAS_FACT` accepts only a `fact:<slug>` ID.

The runtime adapter calls `NarrativeQueryPort`; Ink never receives a reference to a game-state object or repository.

## Approved event boundary

The first typed narrative event set is:

- `knowledge.reveal`;
- `suspicion.adjust`;
- `city-attention.adjust`.

Ink invokes explicit external functions rather than an unrestricted generic mutation function:

- `GAME_REVEAL_FACT(fact_id)`;
- `GAME_ADJUST_SUSPICION(passenger_id, delta, reason)`;
- `GAME_ADJUST_CITY_ATTENTION(delta, reason)`.

The runtime validates stable IDs, bounded adjustments, and stable reason tokens before emitting a domain event.

The narrative runtime does not apply the event itself.

## Compile and contract verification

`compileInkSource` performs two gates:

1. `validateInkSourceContract` rejects unsupported or duplicate game external declarations;
2. the source is compiled through the real `inkjs` compiler.

Runtime tests then load the compiled JSON through the real `inkjs Story`, bind the typed game boundary, advance authored conversation, choose a response, and assert emitted consequences.

This catches several classes of mistakes early:

- invalid Ink syntax;
- unsupported game capabilities;
- invalid stable IDs passed by narrative;
- invalid event payloads;
- mismatches between authored external calls and the game adapter.

## Source layout

Production-authored Ink lives under `src/content/narrative/`.

The foundation story is intentionally small. It demonstrates the production pipeline rather than becoming a parallel prototype narrative.

Future passenger content should add or include `.ink` files while preserving the same domain boundary.

## Persistence rule

Ink story state may eventually be serialized to resume the position inside an active conversation. That serialization is narrative runtime state only.

Persistent game facts, relationships, lies/claims, economy, identity, suspicion, and world state must be persisted by their owning domain systems, never reconstructed from Ink variables.
