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

Ink may author dialogue/choices and narrative-local temporary state, query approved game state through typed external functions, and request approved consequences through typed events.

Ink may not own authoritative relationships, economy, cover identity, persistent claims/lies, knowledge, suspicion, city attention, route truth, or permanent world state.

## Approved query boundary

The production query port currently exposes:

- `GAME_HAS_FACT(fact_id)`;
- `GAME_HAS_CLAIM(claim_id)`;
- `GAME_COVER_MATCHES(key, value)`;
- `GAME_CLAIM_CONTRADICTS(subject, value, context, audience)`;
- `GAME_PASSENGER_SUSPICION(passenger_id)`;
- `GAME_CITY_ATTENTION()`.

Stable IDs and social keys are validated before the application query port is invoked. Ink never receives a reference to the underlying domain store.

`GAME_CLAIM_CONTRADICTS` is audience-aware. A private claim heard by one passenger is not treated as known by every other passenger; public claims overlap every audience.

## Approved event boundary

The typed social/narrative event set currently includes:

- `knowledge.reveal`;
- `claim.record`;
- `suspicion.adjust`;
- `city-attention.adjust`.

Ink invokes explicit external functions rather than a generic mutation API:

- `GAME_REVEAL_FACT(fact_id)`;
- `GAME_RECORD_CLAIM(claim_id, subject, value, context, audience, source_id)`;
- `GAME_ADJUST_SUSPICION(passenger_id, delta, reason)`;
- `GAME_ADJUST_CITY_ATTENTION(delta, reason)`.

The runtime validates IDs, keys, claim values, audience tokens, bounded adjustments, and reason tokens before emitting a domain event. The narrative runtime never applies those events itself.

`SocialStealthNarrativeAdapter` is the application-side bridge that answers queries from `SocialStealthStateStore` and applies typed social events to that store.

## Compile and contract verification

`compileInkSource` performs two gates:

1. `validateInkSourceContract` rejects unsupported or duplicate game external declarations;
2. the source is compiled through the real `inkjs` compiler.

Runtime tests load compiled JSON through the real `inkjs Story`, bind the typed game boundary, advance authored conversation, and assert queries/events.

Cross-ride tests additionally prove that a later Ink runtime can use knowledge learned earlier and detect a contradiction in a prior audience-visible claim.

## Source layout

Production-authored Ink lives under `src/content/narrative/`.

The foundation story is intentionally small. It demonstrates the production pipeline rather than becoming a parallel prototype narrative.

Future passenger content should add or include `.ink` files while preserving the same domain boundary.

## Persistence rule

Ink story state is serialized only to resume the position inside an active conversation.

Persistent facts, cover identity, claims/lies, passenger suspicion, and city attention are stored in `SocialStealthState`, which is part of the versioned production save. They are never reconstructed from Ink variables.
