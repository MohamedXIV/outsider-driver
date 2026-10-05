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

Ink may not own authoritative relationships, human attitude, economy, cover identity, persistent claims/lies, knowledge, suspicion, city attention, translator ownership, route truth, or permanent world state.

## Approved query boundary

The production query port currently includes:

- social-stealth queries such as `GAME_HAS_FACT`, `GAME_HAS_CLAIM`, `GAME_PASSENGER_SUSPICION`, and `GAME_CITY_ATTENTION`;
- `GAME_TRANSLATION_LEVEL(...)`;
- personal-persistence queries for taxi capabilities/items/condition/messages;
- `GAME_RELATIONSHIP(passenger_id, dimension)`;
- `GAME_HUMAN_ATTITUDE(passenger_id)`;
- `GAME_COMPLETED_RIDES_WITH(passenger_id)`.

Relationship dimensions are authored per passenger. Querying `affection` for a passenger who does not author that dimension fails loudly rather than silently inventing a romance meter.

Human attitude is always separate from trust/affection. A story can therefore branch on a passenger trusting the player while still being hostile toward humans.

## Approved event boundary

The typed narrative event set includes:

- social-stealth events: knowledge, claims, suspicion, city attention;
- `relationship.adjust`;
- `human-attitude.adjust`.

Ink uses explicit functions:

- `GAME_ADJUST_RELATIONSHIP(passenger_id, dimension, delta, reason)`;
- `GAME_ADJUST_HUMAN_ATTITUDE(passenger_id, delta, reason)`.

`RelationshipNarrativeAdapter` owns relationship mutations. `SocialStealthNarrativeAdapter` owns social-stealth mutations. `withRelationshipNarrativeEvents` routes the two event families explicitly so relationship changes cannot disappear into the wrong store.

## Persistence rule

Ink story state is serialized only to resume the position inside an active conversation.

Persistent facts, claims, suspicion, city attention, relationship dimensions, human attitude, completed recurring rides, translator ownership, personal progression, and economy live in their owning domain/save state. They are never reconstructed from Ink variables.
