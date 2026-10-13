# Canonical Taxi Arrival State — Gate for Animated Anchors (#86)

**Scope:** authenticated route stop state and save compatibility. This feature is staged above the canonical #64/#65/#67/#77 stack, *not* an arbitrary navigation button. The current built-in completed route still ends at `location:docks-clinic`; **Patchworks is not yet an authored reachable route stop**.

## Runtime contract

- A successfully committed `ride.drop-off` is the **only** operation that writes `GameState.arrivedLocationId`. The value comes from the ride's validated destination ID; it is not read from URL parameters, UI input, query fixtures or a presentation component.
- The verified arrival is persisted by `GameSession.execute` in the **same transaction** as fare, relationship, ride history and game time. If persistence fails, every field (including arrival) rolls back.
- `GameSession.requireArrivedTaxiStop(locationId)` rejects missing stops, incomplete rides, other locations, personal spaces and mismatches between completed final route, destination and authored world content. On success it reports the route-linked `locationId`, `districtId` and `rideId` for presentation *authorization*, not a new mutable location manager.
- Beginning another ride clears the previous stop. Entering home or the personal garage also clears it. Merely returning from garage to taxi cannot resurrect a stale stop through an old ride receipt. Browser reload while legitimately stopped keeps the authenticated location.
- Save schema **v12** adds a nullable `arrivedLocationId`; v1–v11 migrations still work. Upgrading a historical v11 completed ride **deliberately sets arrival to null**, because the driver might have subsequently parked somewhere else. The v12 schema rejects an arrival that conflicts with the current personal-space/ride phase.
- No additional transaction, inventory, teleport, routing system, 2D render loop, Pixi instance or fallback economy is introduced.

## Explicit remaining work

1. Author `district:outer-margin`, `location:outer-margin-patchworks`, a legitimate route that ends at the shop's 3D facade, a way for the player's actual shift to take that route and final-location availability rules.
2. Adapt the existing `LocationAnchorAccessPort` from #87 to `requireArrivedTaxiStop` with a domain-owned opaque return/parking token (and safe invalidation on competing commands); no fake fixture authorization in the main app.
3. Reconcile #88's lazy illustrated stage and reason-scoped Babylon pause policy with the actual renderer. Keep the startup import and JS budgets explicit.
4. Wire one authored shop Ink story and a canonical purchase/repair service command with atomic persisted credit/item/time consequences; test reload and disallowed access.
5. Prove normal route/3D-facade → Pixi → return with browser tests; inspect actual-device frame-time and WebGL budgets separately.

**Status:** stop-authorization substrate only; do not imply Patchworks is playable or change the Draft merge gates.
