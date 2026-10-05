# Personal Spaces: Garage and Home

The garage and home are small persistent 3D authored spaces in the same web/Babylon runtime as the taxi.

They are deliberately not menu replacements, but they are also not the beginning of an open-world walking game.

## Shared production contract

Both spaces are entries in `productionContent.personalSpaces`.

Each entry owns presentation/layout data:

- geometry primitives and materials;
- collisions;
- practical lighting;
- first-person camera spawn and movement bounds;
- interaction anchors;
- persistent presentation flags.

The generic `createPersonalSpaceScene` renders either space. A new authored room can use the same path if its behavior fits the existing contract.

## Persistent truth

`PersonalSpaceStateStore` owns:

- current personal space, or null while elsewhere;
- visited personal-space IDs;
- explicit flag overrides.

Flag defaults live in authored content. Saves persist overrides only, so adding a new authored flag later does not require rewriting old saves or fabricating historical state.

## Application flow

`PersonalSpaceOrchestrator` is the application boundary:

- enter an authored space;
- mark the visit persistently;
- expose current flag values to presentation;
- update a flag and refresh the active scene;
- leave back to taxi presentation.

Rendering never owns these values.

## Current production spaces

### Garage

The initial garage provides:

- taxi-access anchor;
- upgrade-bench anchor;
- exit anchor;
- collidable workbench/walls/floor;
- taxi bay presentation;
- persistent inspection-light flag.

### Home

The initial room provides:

- messages anchor;
- possessions anchor;
- sleep anchor;
- exit anchor;
- collidable bed/terminal/shelf/walls/floor;
- persistent message-indicator flag.

Upgrades, maintenance, possessions, and messages now use these anchors/state hooks instead of introducing parallel scenes or menu-only replacements.

`PersonalSpacePersistenceProjection` maps authoritative personal state to the existing presentation flags:

- maintenance attention -> garage inspection light;
- unread messages -> home message indicator.

Those flags remain presentation projections only. Upgrade capabilities, item ownership, taxi condition, and message read state are queried from `PersonalPersistenceStateStore`.

## Movement scope

Personal spaces use a bounded Babylon `FreeCamera`:

- WASD + arrows;
- authored movement speed/look sensitivity;
- mesh collisions;
- authored XYZ camera bounds.

This is enough for close first-person inspection and interaction without expanding scope into city traversal or a general character controller.

## Persistence

Save v7 adds `personalSpaceState`.

Migration from v6 starts outside every personal space, with zero visited spaces and zero overrides.

Browser smoke verifies both garage and home render in the production build through the real Babylon runtime and that a persistent flag can be changed while the scene is active.
