# Radio System

Radio is an information and social system, not passive background audio.

## Authored station model

The canonical radio catalog defines stable `radio-station:<slug>` stations with:

- display name and frequency label;
- default language;
- public or hidden discoverability.

Public stations can be tuned immediately. Hidden stations must first be discovered through gameplay such as a future antenna/underground access hook. The radio state never special-cases a specific station ID.

## Broadcast content

Stable `broadcast:<slug>` records define:

- station;
- content type: music, talk, news, traffic, or underground;
- content/localization key;
- priority;
- schedule;
- language/register/vocabulary requirement and translation difficulty;
- structured information hooks;
- authored passenger reactions.

Schedules support recurring daily windows and absolute game-time windows. Daily schedules are based on minute-of-day and therefore work at arbitrary campaign length rather than assuming a short fixed calendar.

If several broadcasts are active on one station, higher authored priority wins; stable broadcast ID is the deterministic tie-breaker.

## Language and comprehension

A broadcast is always playable if it is scheduled and the player is listening, even when its language is not understood.

`RadioRuntime` asks the existing `TranslatorRuntime` for comprehension. Information hooks author a minimum comprehension level from 0–3.

This means the player may hear alien speech or music while extracting no useful information, then later understand the same style of broadcast after acquiring a translator pack.

## Structured information

Information hooks are typed as:

- `fact`;
- `route-intel` with a validated route target;
- `job-intel` with a validated job target.

All hooks carry a stable `fact:<slug>` ID.

`RadioListeningService` grants only hooks whose minimum comprehension is met. Granted facts enter `SocialStealthState`, so existing Ink `GAME_HAS_FACT` queries and future route/job decisions read the same persistent knowledge truth. Radio does not create a parallel information database.

## Passenger reactions

Broadcasts may author one reaction key per passenger.

When that passenger is currently in the taxi, playback returns the authored reaction key to presentation/narrative orchestration. Reaction authoring is therefore tied to real passenger IDs and validated by the production content gate.

The base radio system does not assume every reaction changes suspicion or relationship state; those consequences can be authored by the owning systems where appropriate.

## Persistent state

Production save v6 stores:

- tuned station ID;
- whether the radio is listening;
- discovered hidden station IDs;
- heard broadcast IDs.

Heard history lets content distinguish first exposure from repeats without turning the broadcast itself into mutable game truth.

Migration from v5 starts radio off and untuned with empty discovery/history.

## Current production programming

The initial production manifest includes:

- **Civic One** — public traffic programming; with sufficient general-language comprehension it reveals Docks checkpoint route intel.
- **Dockwave** — public music programming, proving radio remains useful/audible even without information extraction.
- **Underchannel** — hidden underground programming in Docks slang; after discovery and sufficient slang comprehension it reveals structured intel for the underground clinic job.

These are content examples on the production architecture, not hard-coded station behaviors.
