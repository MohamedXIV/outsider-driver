# World Presentation Contract — 3D City, 2D Location Anchors (v0.1)

> **Design direction confirmed by the user (2026-10-12). Draft implementation details, not shipped code.**
>
> Companion docs: [Game Design](../GAME_DESIGN.md), [City Layout](CITY_LAYOUT_V0.md), [Outer Margin](OUTER_MARGIN_DISTRICT_V0.md). This is a **division of presentation responsibilities** within one city/game state, not a second disconnected game or a license to bypass authored travel.
>
> **Rule:** **3D for Presence & Travel — 2D/VN for Detail & Interaction.**

## 1. Spatial world: what should remain 3D

The 3D city matters profoundly: it is how the driver learns its geography and social contrasts, senses scale and atmosphere, observes streets, plazas, grounded vehicles, building facades, supported overpasses, weather, districts and events, and experiences the city during authored autopilot rides. It is NOT a complete walkable open-world map and is NOT responsible for delivering detailed, fully modeled interiors for every business.

**Keep as first-class 3D spaces:**
- **Taxi** — cockpit, passenger presence, grounded vehicles and passing world, with conversation and route-event overlays as appropriate.
- **City exteriors** — streets, squares, roads, storefront/clinic/workshop **facades**, iconic landmarks, plazas, traffic and route vistas; authored route sections can be reused and staged without a 1:1 street simulation.
- **Player home and personal garage** — persistent, bounded 3D places with player identity, possessions, car maintenance and between-shift interactions. These spaces have repeated, emotionally important visits.
- **Rare exceptional locations** where *being in a 3D space materially creates gameplay*: spatial inspection, multi-object physical choice or a location-specific cinematic. An exception requires justification, not a default requirement for every important narrative conversation.

The city map should distinguish **where a place is** from **how its interaction is presented**. A shop can occupy a real known roadside facade but use a rich hand-painted 2D interior screen.

## 2. Location anchors: most secondary destinations are 2D/VN

After the driver **actually reaches** an authored destination (or is already in an adjacent permitted personal space), the player may access its **location anchor**.

An anchor is a *named, reachable, persistent city destination* whose interaction is presented as a 2D illustrated scene, VN conversation, or lightweight service interface. It is **not** a teleport button to an arbitrary point and not necessarily a separate physical interior that needs 3D geometry.

Typical examples:
- Spare parts vendor: illustrated counter/parts shelves, shopkeeper portrait, items, legal/gray origin, quotes.
- Neighborhood grocer or food stand: static interior/stall illustration, conversational purchases and gossip.
- Clinic: waiting-room 2D image, doctor portraits, medical services/flags and possible legal exposure.
- Registry office or customs desk: form/queue 2D image, document checks, contradictory ID claims and Ink choices.
- Translator/communications kiosk: illustrated terminal and a domain-backed app-like purchasing interface.
- Café, repair cooperative, transport office, landlord or community contact: illustrated VN location, with recurring characters, hours, relationships and availability.

**Art grammar — clarified user requirement:** the 2D/VN anchors should be **living animated scenes, not merely static illustrations**. Authored layered painted backgrounds support moving mechanical props, gently pulsing/flickering practical lights, ambient steam/dust/reflections, window silhouettes, controlled parallax, animated portrait idle/blinks and expression changes, together with contextual UI and Ink choices. Simple fake 2D glow/overlays are initially preferable to introducing full real-time 2D lighting. Avoid modeling full 3D interiors for brief interactions. Portrait/sprite/puppet tech remains **implementation-agnostic** (do not mandate Inochi2D).

For some anchors the 3D road environment stays visible behind a window/overlay; for others a full 2D/VN scene takes the screen. This is a presentation decision based on narrative weight and UX, not a different simulation.

## 3. The same city continues under the illustration

A 2D business is NOT a separate economy or invented shop database. Purchases, inventory, credits, permit eligibility, taxi parts, service completion, medical help, suspicion, relationships, city attention, contacts, time and persisted flags must all use the existing **canonical application/domain commands and state**.

The anchor keeps a reference to its real **location ID**, district, access requirements and business/interaction identity. The player's arrival must be valid based on authored route/navigation state and any known restrictions, not just the location existing in the catalog.

Potential design fields (names **conceptual only**, not a new TypeScript schema):
- **Destination identity:** authored `locationId`, `districtId`, nearby 3D facade or known docking/pickup point.
- **Presentation:** `3d-space`, `2d-illustration`, `vn-scene`, or `service-ui`. These should remain independent of route topology and save semantics.
- **Access:** arrival/known location, opening/availability, authorization, pressure or introduction.
- **Content:** illustration state, speakers/expressions, items and Ink story/branch or service interactions.
- **Exit:** resumes the rightful previous state (parked taxi, home, garage, next job), with time and consequences carried forward.

The exact shape must be reconciled with **the canonical location/route models**, the ordinary player flow in [PR #74](https://github.com/MohamedXIV/outsider-driver/pull/74), and session ownership in [PR #72](https://github.com/MohamedXIV/outsider-driver/pull/72). Do not implement an unrelated second `LocationManager`, fake inventory, independent UI clock, duplicate economy or new open-world navigation.

## 4. One concrete, authored transition

1. Taxi ride enters Outer Margin's **Patchworks** frontage. The shop's recognizable 3D roadside silhouette, sign and road junction orient the player in the actual city.
2. The player reaches a valid stopping point and chooses **Visit Parts Counter** when available.
3. The 3D driving presentation pauses/parks as appropriate; a **2D painted counter** appears with the shopkeeper's dialogue portrait and visible parts, prices and wear.
4. An Ink conversation can reveal the component's provenance, a repair quote or rumor. Buying/exchanging invokes an existing authorized game command; credits/inventory/relationship/attention change as one persistent state.
5. Leaving returns to the taxi or another allowed arrival context; the city/ride clock obeys the same state rules. The vendor and location remain the same entities on a later visit.

The player can **recognize places from the road** and **remember people through the 2D stories**. The latter can be richer than a costly 3D interior while remaining geographically grounded.

## 5. Production impact / scope control

| Situation | Required investment | Avoid |
| --- | --- | --- |
| New alley or plaza encountered by taxi | Reusable Babylon road/building facades and recognizable signage/landmarks | Full physical interiors for every facade |
| Ordinary shop/service stop | A location anchor, painted background + UI + optional portrait/Ink | A one-use modeled 3D shop with interactive shelves |
| Important character visit | More detailed 2D/VN scene variations and recurring portrait states | Assuming high narrative importance automatically means 3D |
| Home/garage | Bounded, repeated 3D scene with contextual 2D menus when useful | Turning personal spaces entirely into static VN backgrounds |
| Unusual spatially interactive mission | Specifically scoped 3D location if mechanics justify it | Broad 3D world exploration framework |

**The city is not less real because a shop is 2D.** Its external position, road approach, neighborhood jurisdiction, social graph and consequences are persistent. We spend 3D effort where presence and travel create value; we spend detailed illustration and writing effort where people and short transactions create value.

## 6. Street-level density without costly interiors

An especially effective way to make Outer Margin feel inhabited is to stage **many recognizable facade anchors along a small number of authored streets**. These can include a night food stall, budget electronics repair, small medical office, landlord booth, underground dispatch desk, used-parts stall and communal services.

**Important production restraint:** seeing a sign from the taxi does not mean every visible door needs a playable screen. Only **authored useful anchors** get interactions. Others remain believable scenery; accessible anchors should be visibly distinguishable and honestly represented.

The UI can show discovered anchors from a district/location screen *after the player has arrived or learned a legitimate connection*, but must not treat the map as free instant travel across the city. Availability can depend on time, who runs the shop, trust, route threats and local legal status.

## Animated 2D rendering proposal

The recommended first experiment is **lazy-loaded PixiJS for the animated scene compositor**, **existing HTML/CSS for readable dialogue/shops/choices**, and **inkjs with canonical GameSession state**. Babylon retains the 3D city, car, home and garage. Pause Babylon redraws when the Pixi anchor is active, stop Pixi on exit; the two engines may still own distinct WebGL contexts, so manage assets and measure VRAM/entry latency rather than assuming there is no overhead.

The [Animated Anchors Technical Architecture v0.1](ANIMATED_ANCHORS_TECH_V0.md) spells out the transition/lifecycle contract, stale-load cancellation, layered lighting tricks, reduced-motion/accessibility and an Outer Margin parts-shop vertical slice. This is an **architecture proposal only**; PixiJS is **not installed** on this documentation branch. Use Phaser only if a future location develops genuine 2D movement/collision gameplay that needs a game framework.

## 7. Review/implementation gates

**Locked design intent:**
- The streets, districts, plazas, bridges, architecture, vehicles and driving ambience are 3D.
- Home and garage are **still** bounded 3D spaces.
- Most destination interiors, small businesses, shops, offices, side errands and short interactions are **lively animated 2D/VN-like anchors** with high illustration/story density, practical light movement and atmosphere.
- Long-term world facts, money, routes, inventory, character relationships and legal/social risks are shared across those presentations.

**Open decisions:**
- Exact UI framing between a full-screen painted illustration and a shop panel over paused 3D.
- Whether repeatable merchants share 2D layout templates with location-specific art or each gets handcrafted bespoke framing.
- How much time a shop interaction consumes, and what counts as a permitted location arrival.
- Which few narrative exceptions earn specialized 3D interiors, if any.
- Which portrait/puppet implementation to use for recurring vendor NPCs (do not prejudge the passenger/2D tech experiment).

**No runtime work in this PR.** First implementation should extend the existing authored location/navigation and application-command pipeline with **one** anchored shop/repair/service interaction, then prove normal-route enter → transact/talk → persist → exit → return. Keep #74's navigation and other branches untouched until integration is coordinated.
