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

Ink may not own authoritative relationships, economy, cover identity, persistent claims/lies, knowledge, suspicion, city attention, translator ownership, route truth, or permanent world state.

## Approved query boundary

The production query port currently exposes:

- `GAME_HAS_FACT(fact_id)`;
- `GAME_HAS_CLAIM(claim_id)`;
- `GAME_COVER_MATCHES(key, value)`;
- `GAME_CLAIM_CONTRADICTS(subject, value, context, audience)`;
- `GAME_PASSENGER_SUSPICION(passenger_id)`;
- `GAME_CITY_ATTENTION()`;
- `GAME_TRANSLATION_LEVEL(language_id, register, vocabulary_key, difficulty)`.

Stable IDs and typed social/translator fields are validated before the application query port is invoked. Ink never receives a reference to the underlying domain stores.

`GAME_CLAIM_CONTRADICTS` is audience-aware. A private claim heard by one passenger is not treated as known by every other passenger; public claims overlap every audience.

`GAME_TRANSLATION_LEVEL` returns a stable ordinal level:

- 0 = none;
- 1 = gist;
- 2 = partial;
- 3 = full.

Ink branches on comprehension, not pack IDs. An empty `vocabulary_key` means general vocabulary. Authored dialogue can therefore present partial or uncertain text without moving translator state into Ink.

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

Translator ownership/activation is intentionally not a narrative mutation event. Economy/work systems may grant or purchase packs through their owning application flow.

## Application adapters

`SocialStealthNarrativeAdapter` answers social queries and applies typed social events.

`TranslatorNarrativeAdapter` exposes deterministic comprehension assessment from `TranslatorRuntime`.

`withTranslatorNarrativeQueries` composes translator capability onto an existing narrative query port without forcing the social adapter to own translator state.

## Compile and contract verification

`compileInkSource` performs two gates:

1. `validateInkSourceContract` rejects unsupported or duplicate game external declarations;
2. the source is compiled through the real `inkjs` compiler.

Runtime tests load compiled JSON through the real `inkjs Story`, bind the typed game boundary, advance authored conversation, and assert queries/events.

Cross-ride tests prove prior knowledge/claims survive between rides. Translator tests prove real Ink can branch into partial-comprehension prose from active pack capabilities without knowing pack identity.

## Source layout

Production-authored Ink lives under `src/content/narrative/`.

Future passenger content should add or include `.ink` files while preserving the same domain boundary.

## Persistence rule

Ink story state is serialized only to resume the position inside an active conversation.

Persistent facts, cover identity, claims/lies, passenger suspicion, city attention, and translator ownership/activation are stored by their owning domain state and production save schemas. They are never reconstructed from Ink variables.
