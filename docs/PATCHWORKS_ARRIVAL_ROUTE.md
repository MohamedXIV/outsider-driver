# Patchworks Roadside Arrival — Authored Route Slice (#86)

> **Draft / stacked on PR #89:** A real two-leg taxi job and an authored 3D frontage, not the finished Pixi interior or a shop transaction. The sole canonical state owner is `GameSession`.

## Provenance and reachability

The existing first shift starts from the Docks Taxi Rank and takes the underground rider to the Night Clinic. Only completing that ride grants `undergroundAccess +3` and a completed relationship ride with that passenger. A new job `job:clinic-to-patchworks` then becomes eligible **only at** `location:docks-clinic`. It is explicitly not an instant route option from the starter rank or the player's personal home.

`GameSession` checks the requested job pickup against the current saved taxi stop on both work-offer projections and the final `ride.accept` command. With no valid stop, only the legacy first-shift Docks rank is the staging pickup. Completing the new ride commits the saved location `location:outer-margin-patchworks`, its 11-game-minute drive, fare, and relationship effects in one authoritative save. Parking at the garage revokes the stop; a cached receipt cannot authorize a shop visit.

### Location topology

| Area | Authored ID | Purpose |
| --- | --- | --- |
| The Docks | `location:docks-clinic` | Real previous trip's drop-off; pickup of follow-up |
| Arterial transition | `route-segment:docks-outer-arterial` | First 4 game minutes; bridge with an actual supporting column |
| Outer Margin | `route-segment:outer-margin-patchworks-approach` | Last 7 game minutes; occupied repaired buildings |
| Outer Margin | `location:outer-margin-patchworks` | Final validated parked stop beside Patchworks frontage |

### Visual placement

The production `RouteSceneryPresenter` uses the existing Babylon taxi scene and the authored route segment module list. At the final stop, the exterior right of the taxi consists of a repaired brick workshop facade, copper awning, warm lit sign **shape**, parts rack, pole marker and lamp; nearby row housing and community lights signal a lived-in poor district, not an abandoned wasteland. **No sign text, fully modelled shop interior or finished hand-painted facade is claimed.** All geometry is grounded (no flying vehicles or unsupported overpasses).

The renderer's route scenery is a **read-only subscriber** to the already-committed GameSession state and is disposed on home/garage transitions and HMR. It cannot grant access, mutate wallet/time, write saves or advance autopilot by itself. The driving presentation currently steps forward only on the player's explicit existing autopilot command, not continuous realtime simulation.

## Proof and remaining gates

- Validate linked district/location/route/segments/job, exact route-motion/scenery coverage and destination references.
- Prove two genuine rides, insufficient access before the first, exact pickup gating, save/reload mid-sequence and refusal to use historical/wrong stops.
- NullEngine proof creates the roadside sign/parts stand in Babylon on the final segment and disposes them.
- Chromium browser UI proof takes a real first shift through the clinic checkpoint, reloads, accepts only the valid clinic pickup, drives to Patchworks, verifies persisted location and screenshots the actual 3D stage.
- Bundle budgets, strict Node24 CI and review of stacked predecessors still gate merge.
- **Next vertical slice:** reconcile the existing #87 transition port with this route's `GameSession.requireArrivedTaxiStop`, and lazy-enter #88's Pixi shop only after arrival. Still requires an actual Ink/service command before any purchase/repair UI can claim success. Do not expose a fake Visit/Buy button.
