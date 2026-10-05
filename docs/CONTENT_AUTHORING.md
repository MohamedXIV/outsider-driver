# Production Content Authoring

Outsider Driver is authored from repository-visible files. A proprietary editor is never required to create, validate, review, or merge gameplay content.

## Canonical production manifest

`src/content/production/ProductionContent.ts` is the composition point for authored production content.

It currently registers world/routes, passengers, passenger performance, relationship profiles/recurrence policies, jobs, translator content, radio programming, 3D personal spaces, personal persistence content, narrative sources, and the taxi scene.

Small content quantity is not a separate demo architecture. The same manifest, schemas, validators, and runtime boundaries grow into the complete game.

## Relationship authoring

Each passenger relationship profile may enable:

- `trust`;
- `affection`;
- neither, one, or both;
- an independent initial attitude toward humans.

Affection is therefore opt-in content, not a global romance meter.

Recurring passengers additionally author recurrence policy:

- minimum completed rides;
- cooldown in game minutes;
- optional daily availability;
- required/forbidden facts;
- optional trust/affection thresholds;
- optional minimum/maximum human-attitude thresholds.

A recurring lifecycle passenger without recurrence policy fails `content:check`. A recurrence policy cannot gate on trust/affection unless that passenger enables the corresponding dimension.

## Job authoring

Jobs may optionally add relationship requirements such as minimum completed rides, trust/affection, and human-attitude range.

Those gates are evaluated independently. High trust never satisfies a hostile/sympathetic-human-attitude requirement by implication.

## Validation command

```bash
npm run content:check
```

Validation includes relationship-profile passenger references, recurrence policy coherence, authored dimensions, job references, narrative externals, all existing content graphs, and save round-trip contracts.

## Same content as runtime

Relationship systems consume `productionContent.relationships`; recurring scheduling reads the same validated catalog plus authoritative relationship/social state. Tests may mutate production-shaped data, but fixtures never become alternate production truth.
