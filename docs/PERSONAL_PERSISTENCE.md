# Personal Persistence: Upgrades, Maintenance, Possessions, and Messages

This system owns the persistent between-shifts progression that sits behind the authored garage and home spaces.

It is intentionally not a vehicle-tuning simulator or apartment-decoration sandbox.

## Canonical authored content

`productionContent.personalPersistence` defines:

- taxi upgrades;
- personal items and souvenirs;
- messages/callbacks;
- maintenance issue definitions.

### Taxi upgrades

Each `taxi-upgrade:<slug>` authors:

- one installation slot;
- purchase cost;
- installation cost;
- legality;
- risk footprint;
- stable capability keys.

Current slots are partition, radio, sensor, utility, and translator-support.

Only one upgrade can occupy a slot at a time. Ownership and installation are separate persistent facts.

Capabilities are generic keys such as `cabin.protection` or `radio.hidden-band`; jobs and narrative query capabilities rather than hard-coded upgrade IDs.

### Maintenance

Maintenance stays narrative-scale.

Persistent state stores:

- taxi condition from 0–100;
- active authored maintenance issue IDs.

An issue defines severity, repair cost, and condition restored. The system does not simulate individual mechanical components, tire wear, drivetrain tuning, or repair minigames.

### Possessions

Items use stable `item:<slug>` IDs and are unique collectibles in the current model.

Kinds are:

- souvenir;
- utility;
- document.

Items may expose stable capability keys for future gating, while presentation uses authored keys to decide how a possession is shown.

### Messages and callbacks

Messages use stable `message:<slug>` IDs.

Authored data distinguishes message vs callback, sender key, optional passenger reference, and subject/body localization keys.

Persistent state separates:

- delivered messages;
- read messages.

Reading cannot occur before delivery. Re-delivery and repeated reads are idempotent.

## Economy ownership

`PersonalPersistenceEconomyService` owns paid operations:

- buy upgrade;
- install upgrade;
- repair an active maintenance issue.

Money is deducted through `EconomyStateStore` before state is granted or repaired. Failed affordability/slot/ownership checks do not partially mutate personal progression.

## Job gating

Jobs may optionally author personal requirements:

- minimum taxi condition;
- required taxi capabilities;
- required item IDs.

`WorkNetwork` and ride acceptance use the same eligibility contract. Presentation cannot bypass these gates.

Existing jobs need no personal requirements, so the feature expands the production contract without retroactively changing current job access.

## Narrative gating

Ink may query:

```text
GAME_HAS_TAXI_CAPABILITY(capability)
GAME_HAS_ITEM(item_id)
GAME_TAXI_CONDITION()
GAME_HAS_UNREAD_MESSAGE(message_id)
```

Ink receives read-only answers through `PersonalPersistenceNarrativeAdapter`. It does not own upgrade, item, maintenance, or message state.

## Garage and home presentation

`PersonalSpacePersistenceProjection` maps authoritative state onto existing authored flags:

- maintenance attention -> garage inspection light;
- unread messages -> home message indicator.

These flags are presentation projections only. Gameplay gating always reads `PersonalPersistenceStateStore`.

The upgrade bench, possessions shelf, and message terminal remain typed interaction anchors in the generic personal-space system.

## Persistence

Production save v8 adds `personalPersistenceState`.

Migration from v7 creates:

- taxi condition 100;
- no owned/installed upgrades;
- no active maintenance issues;
- no possessions;
- no delivered/read messages.

Populated personal state round-trips through the same versioned production save codec.

## Current production content

The initial catalog proves the architecture with:

- reinforced partition — licensed, `cabin.protection`;
- covert radio antenna — illegal, `radio.hidden-band`;
- passenger observation camera — restricted, `passenger.observation`;
- Docks Clinic Token souvenir;
- first-shift callback message;
- worn brake pads and clogged cabin filter maintenance issues.

These are authored examples on the production system, not special-case runtime branches.
