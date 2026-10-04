# Translator System

Translator packs are first-class progression content. The game does not store a single global “translator level”.

## Content model

The canonical translator catalog contains stable `language:<slug>` and `translator-pack:<slug>` documents.

A pack can author:

- one or more language capabilities;
- register: general, dialect, slang, or professional;
- optional vocabulary key for a specific slang/professional corpus;
- coverage;
- quality;
- uncertainty;
- legality: licensed, restricted, or illegal;
- credit cost metadata;
- risk footprint;
- pack version;
- compatible translator runtime API range.

Adding a new pack is content. It does not require a new runtime class or special-case pack ID.

## Runtime state

`TranslatorState` persists:

- owned pack IDs;
- active pack IDs.

A pack must be owned before activation. Active packs must be compatible with the current translator runtime API.

The translator subsystem does not deduct credits when a pack is granted. Cost is authored here, while actual purchase/payment belongs to the economy owner in #23.

## Comprehension assessment

Narrative/content requests translation through a typed requirement:

- language ID;
- register;
- optional vocabulary key;
- authored difficulty from 0 to 1.

For an exact matching active capability, the runtime derives a deterministic score from authored coverage, quality, uncertainty, and difficulty.

The score maps to four stable levels:

```text
0 none
1 gist
2 partial
3 full
```

Narrative consumes the level rather than pack IDs, which keeps dialogue reusable across different upgrade paths.

The current combination rule chooses the strongest exact matching active capability. Adding more content does not automatically inflate understanding merely because several overlapping packs are installed.

## Partial comprehension

Partial understanding is an authored narrative outcome, not automatic word scrambling.

Ink can call:

```text
GAME_TRANSLATION_LEVEL(language_id, register, vocabulary_key, difficulty)
```

and choose full, partial, gist, or unintelligible prose appropriate to that line.

This keeps writing intentional while making comprehension depend on real persistent translator state.

## Risk integration

`TranslatorRuntime.getActiveRiskSignals()` exposes pack ID, legality, and risk footprint for every active pack.

The translator subsystem does not itself decide police/customs consequences. Later risk/security systems can consume these generic signals without hard-coded checks for a specific illegal pack.

## Persistence

Production save v4 adds `translatorState`.

Migration from v3 creates an empty state: no packs are granted and none are active. Ownership and activation round-trip through the same versioned save codec as the rest of the game.
