# Game Design

## High concept

The player is a human living illegally in a city where humans are forbidden or heavily restricted. They survive by operating an old taxi under a false identity.

Every passenger creates a temporary social pressure chamber: the player must do a believable job, understand the city, maintain a cover story, learn what the passenger knows and believes, and decide how much to reveal.

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
