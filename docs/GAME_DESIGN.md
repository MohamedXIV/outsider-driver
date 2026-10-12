# Game Design

## High concept

The player is a human living illegally in a city where humans are forbidden or heavily restricted. They survive by operating an old taxi under a false identity.

Every passenger creates a temporary social pressure chamber: the player must do a believable job, understand the city, maintain a cover story, learn what the passenger knows and believes, and decide how much to reveal.

## Visual identity — retro-futurism (product direction)

Outsider Driver must have a **distinctive retro-futuristic identity, not the default visual language of another cyberpunk city**. This is a product-level direction, even before the project has a complete art bible or approved concept art.

The city should feel like a future with its own history. Vehicles, terminals, infrastructure, signage, domestic objects, and interfaces have recognizable generations, accumulated repairs, regional variations, and signs of everyday use. The old taxi is a recurring character-like space: its dashboard, controls, materials, visibility, and modifications should make its age and continued utility immediately legible.

- Prioritize memorable silhouettes, tactile/repairable technology, layered analog-and-digital interfaces, practical interiors, and distinct district cultures over generic sci-fi decoration.
- Advanced and alien technology can coexist with obsolete hardware; retro-futurism does **not** require choosing a specific historical decade or a uniform technology level.
- Neon, holograms, rain, and high-tech signage may appear when justified by the world. A default purple/cyan neon skyline, ubiquitous holograms, or generic cyberpunk dressing must not substitute for authored visual identity.
- Lighting, shapes, textures, typography, interfaces, and props should communicate place, social class, ownership, and risk, not just visual spectacle.
- Preserve clear legibility inside the first-person taxi, particularly at night and during conversations; visual effects should not obstruct passengers, routes, controls, or choices.

### Visual direction selected; implementation remains exploratory

The concept-level visual direction is now documented in the [Visual Style Bible v0.1](STYLE_BIBLE.md): **Hybrid Illustrative Alien Retro-Futurism** — rounded and varied non-human architecture; grounded vehicles on physically supported roads; hand-painted textured low-/mid-poly assets; soft cel lighting; selective ink; and occasional muted, **colored road surfaces** rather than universal gray asphalt.

The city was built by alien civilizations, not by humans. **Humans are prohibited**, and the player's status as a concealed illegal human is fundamental to its worldbuilding. Most of the exterior city exists as authored moving scenery viewed from the taxi, not as freely explorable streets.

These are approved **art-direction principles**, not confirmation of a finished Babylon shader, specific font, finalized district map, in-engine performance or passenger puppet technology. Keep look-development comparisons with representative matched camera/time/light captures, coherent home/garage and illustrated-passenger treatment, and measured readability/performance before adopting a production-wide material pipeline. Avoid visually unstable retro-rendering artifacts as the default aesthetic.

## World presentation architecture — 3D travel, 2D/VN destination anchors

**User-confirmed design principle (2026-10-12):** **3D for Presence & Travel — 2D/VN for Detail & Interaction.** The 3D city still delivers its street grid, roads, plazas, supported bridges, buildings and visible destinations, grounded traffic, taxi ambience and district character. The taxi and vehicles remain 3D; the **player's home and personal garage remain bounded 3D** personal places.

**Most secondary destinations do not need complete 3D interiors.** Stores, workshops other than the player's personal garage, clinics, public counters, markets, cafés and minor errands can instead become **geographically anchored 2D/VN location interactions**: an authored illustrated background, speaker portraits/expressions, Ink dialogue, service UI, item purchases or consequential choices. These can deliver rich environmental detail faster than building physical interiors for quick transactions. Important recurring people may have expressive 2D presentations, without locking them to a specific puppet technology.

A location anchor must have an authentic place in the district's road/route/arrival topology: the player can recognize a 3D roadside facade and stop there, then enter the 2D interaction. **It is not global teleportation** or a second gameplay world. Every item, cost, permission, time advance, relationship, suspicion, knowledge flag and result continues through the existing canonical application/domain state. From the anchor the player returns to the proper taxi/home/garage context.

Only use additional 3D interiors where **physical spatial gameplay** is a meaningful reason to model them; narrative importance or a shopkeeper alone does not mandate 3D.

Detailed draft integration boundary and examples: [Location Presentation Modes v0.1](world/LOCATION_PRESENTATION_MODES_V0.md). Implementation must coordinate with the existing GameSession/navigation PRs and must not introduce a separate merchant, inventory or world-state engine.

## Core fantasy

**Survive by learning how to belong somewhere you do not belong.**

The player progresses primarily through knowledge, relationships, access, equipment, and credibility rather than combat statistics.

## Core loop

1. Prepare for a shift at home/garage.
2. Choose or receive available work.
3. Pick up a passenger.
4. Travel automatically along a route.
5. Converse, observe, listen, bluff, use tools, and make occasional route/risk decisions.
6. Drop off the passenger.
7. Resolve payment, suspicion, relationships, knowledge, jobs, and world consequences.
8. Return home/garage, maintain the taxi, review information/messages, manage upgrades, and continue.

Travel is active as a **social and decision context**, not through continuous steering.

## Design pillars

### 1. Knowledge is progression

The player learns:
- districts and locations;
- customs;
- history;
- slang and languages;
- institutions;
- people;
- local events;
- legal restrictions;
- rumors;
- dangerous questions;
- useful lies.

Knowledge must be usable later, not just collectible lore.

### 2. Lies have memory

Identity claims are persistent facts about what the player has said.

A believable answer today can become a contradiction later. Systems must support:
- claim recording;
- audience/source;
- specificity;
- contradiction relationships;
- later callbacks.

### 3. Relationships are not safety meters

Affection/trust and attitudes toward humans are distinct.

A passenger may:
- like the player but hate humans;
- distrust the player but oppose immigration enforcement;
- love the player and still reject the deception;
- be fascinated by humans for unhealthy reasons.

Relationships unlock access and consequences, not guaranteed safety.

### 4. The taxi is a moving social room

The taxi is the recurring stage:
- passenger;
- road;
- dashboard;
- radio;
- translator;
- route information;
- mirrors/camera if equipped;
- lighting/weather;
- vehicle motion.

The player should feel in a moving vehicle without needing driving gameplay.

### 5. Capability creates exposure

Many upgrades should create tradeoffs.

Examples:
- an illegal translator pack understands more slang but may be traceable;
- a modified identity opens better work but raises scan consequences;
- restricted radio access reveals useful information but creates legal risk.

Not every upgrade needs risk, but upgrades should avoid becoming automatic “better in every way” ladders.

## Taxi movement

The route system controls forward travel. Light vehicle dynamics provide:
- acceleration/braking pitch;
- turn roll;
- suspension response;
- road vibration;
- speed-dependent camera movement;
- interior secondary motion;
- optional reactions from passenger puppets/props/audio.

There is no player free-driving mode in the current product scope.

## Route gameplay

Player agency can include:
- choosing between known routes;
- obeying or avoiding a checkpoint;
- accepting a passenger-requested diversion;
- stopping early;
- taking a known risky district;
- using information learned from radio/passengers;
- deciding whether to continue a suspicious job.

Routes are graph/data-driven, not an open-world road network.

## Passenger classes

### Routine
Short, reusable worldbuilding and economic rides.

### Recurring
Characters whose stories, relationships, opinions, and memories develop over many rides.

### Story
Rides/events with strong narrative or world consequences.

These categories are content roles, not incompatible runtime implementations.

## Translator system

Translation is a first-class information system.

The player owns or obtains translator hardware; capability comes from packs such as:
- common city language;
- species language;
- district dialect;
- street slang;
- administrative/legal vocabulary;
- medical/professional vocabulary;
- illegal/modified packs.

Translation may be incomplete. Packs can differ in coverage, quality, legality, cost, and risk.

## Radio

Radio is both atmosphere and information.

Stations may provide:
- music;
- public news;
- propaganda;
- talk;
- traffic;
- underground broadcasts;
- restricted/human signals.

Broadcasts can influence decisions and trigger passenger reactions.

## Home and garage

These spaces give the player a life outside individual rides.

### Garage
- see and maintain the taxi;
- install/inspect upgrades;
- deal with repair/access/illegal hardware;
- ground the taxi as a persistent object.

### Home
- sleep/advance time where appropriate;
- review messages;
- store/show souvenirs and possessions;
- manage personal/identity-related items;
- receive narrative callbacks.

They are 3D authored spaces, not menu-only abstractions and not base-building systems.

## World structure

The city should feel much larger than the playable geometry.

Use:
- modular route environments;
- strong district identities;
- lighting/weather/time variations;
- radio/news;
- passenger stories;
- destination establishing shots;
- reusable route segments with authored composition.

The objective is a convincing city, not a traversable open world.
