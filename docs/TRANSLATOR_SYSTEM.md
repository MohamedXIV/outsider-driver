# Translator System

Translator packs are first-class progression content. The game does not store a single global “translator level”.

## Content model

The canonical translator catalog contains stable `language:<slug>` and `translator-pack:<slug>` documents.

A pack can author language/register/vocabulary capabilities, coverage, quality, uncertainty, legality, credit cost, risk footprint, pack version, and translator runtime compatibility.

Adding a new pack is content. It does not require a new runtime class or special-case pack ID.

## Runtime state

`TranslatorState` persists owned and active pack IDs. A pack must be owned before activation, and active packs must be compatible with the current translator runtime API.

Translator state owns capability and activation. It does not own money.

`TranslatorMarketplace` is the application boundary that connects authored `costCredits` to `EconomyStateStore`: a successful purchase spends credits then grants pack ownership; insufficient funds or duplicate ownership cannot silently grant/charge twice.

## Comprehension assessment

Narrative/content requests translation through language ID, register, optional vocabulary key, and authored difficulty.

The runtime deterministically derives comprehension from pack-authored coverage, quality, uncertainty, and difficulty. It exposes:

```text
0 none
1 gist
2 partial
3 full
```

Narrative consumes the level rather than pack IDs. The current combination rule chooses the strongest exact matching active capability rather than stacking overlapping packs into artificial understanding.

## Partial comprehension

Partial understanding is authored narrative, not automatic word scrambling.

Ink can call:

```text
GAME_TRANSLATION_LEVEL(language_id, register, vocabulary_key, difficulty)
```

and branch into full, partial, gist, or unintelligible prose.

## Risk integration

`TranslatorRuntime.getActiveRiskSignals()` exposes pack ID, legality, and risk footprint.

The translator subsystem does not itself decide customs/police consequences. Later risk systems consume those generic signals without hard-coded checks for a particular illegal pack.

## Persistence

Translator ownership/activation entered the production save at v4 and remains part of later versions. Migration from v3 grants no packs and activates nothing.
