# Social-Stealth State

Social stealth is authoritative domain state. Ink can query it and request typed changes, but Ink variables never become the source of truth for identity, claims, knowledge, suspicion, or city attention.

## State model

SocialStealthState contains a cover identity, persistent claim ledger, learned fact IDs, per-passenger suspicion entries, and a separate city-attention meter. The whole structure is strict, versioned, JSON-serializable, and persisted through the production game save.

## Cover identity

A cover identity has a stable identity ID, display name, and unique stable key/value attributes. The attribute model is data-driven: content can define concepts such as origin, occupation, species, permit class, or future cover details without making every one a TypeScript property.

Narrative can ask whether a cover attribute matches an expected value with GAME_COVER_MATCHES(key, value). It cannot directly rewrite the identity.

## Persistent claims / lies

A claim is a first-class record, not a boolean narrative flag. Each claim contains a stable claim ID, subject, canonical string value, context, audience, and source metadata.

Audience is either public or one specific passenger. Source kind is player, narrative, identity, or system. Re-recording the same claim ID with identical data is idempotent; reusing that ID for different data fails closed.

## Contradiction model

A proposed claim contradicts a prior claim when subject and context match, value differs, and audiences overlap. Public claims overlap every audience; two passenger-private claims overlap only for the same passenger.

This supports recurring-passenger memory now without pretending every private lie is globally known. Narrative queries it through GAME_CLAIM_CONTRADICTS(subject, value, context, audience), where audience is public or a stable passenger ID.

## Knowledge

Known facts are stable fact IDs. knowledge.reveal is idempotent. Later Ink runtimes can query GAME_HAS_FACT and alter lines or choices without reconstructing knowledge from Ink variables.

## Suspicion versus city attention

Passenger suspicion is stored per passenger and starts at 0 when absent. City attention is one longer-term authority/city meter. They are independent values, both clamped to 0–100, and each retains the stable reason token from its latest adjustment.

## Narrative boundary

Approved social-state queries now include GAME_HAS_FACT, GAME_HAS_CLAIM, GAME_COVER_MATCHES, GAME_CLAIM_CONTRADICTS, GAME_PASSENGER_SUSPICION, and GAME_CITY_ATTENTION.

Approved social-state events include knowledge.reveal, claim.record, suspicion.adjust, and city-attention.adjust. SocialStealthNarrativeAdapter is both query adapter and event sink; it delegates to SocialStealthStateStore, while the Ink runtime never receives the store itself.

## Save compatibility

Game save schema v3 adds nullable socialState. Migration stays sequential: v1 empty state -> v2 rideSession -> v3 socialState. Existing saves migrate without fabricated identity data; new-game/setup code can create social state when a cover identity is chosen or assigned.

When social state exists, cover identity, claims, knowledge, passenger suspicion, and city attention all round-trip through the production save codec.
