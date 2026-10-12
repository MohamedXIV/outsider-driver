# City Foundation — Political Economy, Society and Law (v0.1)

> **DRAFT — for design discussion.** This is a proposed *fictional city constitution*, not approved canon and not a runtime schema/migration. Keep it separate from code/ongoing PRs. Change it freely by Git versioning.
>
> Source of existing rules: [Game Design](../GAME_DESIGN.md), [Roadmap](../ROADMAP.md) and current `src/content/production/ProductionContent.ts`. Geography companion: [City Layout](CITY_LAYOUT_V0.md) and the [top-down schematic SVG](CITY_PLAN_V0.svg).

## A. What is already established versus proposed

**Established product constraints:** This is an alien-built city where humans are barred or heavily restricted; the player is a concealed illegal human working in an old taxi. Travel is authored and automatic with route/event/choice agency, **not free driving or open-world walking**. Distinct cultural languages and incomplete/illegal translator packs matter. The taxi, garage and home are real bounded 3D stages. Districts, locations, laws, jobs, radio and passenger memory matter. Vehicles are wheel/road grounded; elevated highways have supports, and tunnels/roads are physical.

**Existing production content (NOT a complete city map):** The current `main` world has `district:docks`, `location:docks-taxi-rank`, `location:docks-clinic`, `route:docks-night` (one 8-minute route segment) and `route-event:docks-checkpoint`, plus official and underground clinic ride fixtures. It also has the Dock Common language, civic/dock/hidden radio examples, and credit-denominated fares and expenses. Do not silently rename these IDs or mistake the scene's approximate 36-meter authored scenery strip for full city-map scale.

**Everything below is an exploration, not a retcon.** Provisional names like Civic Core, Worker Belt and Upper Terraces are English developer names, not necessarily literal in-world signage or alien place-names.

## B. Recommended political identity — a chartered autonomous port city-state

**Working hypothesis:** The city is a **self-governing charter port — effectively a city-state**, but dependent on a wider inter-polity transport/trade accord. It can legislate local residence, work permits, ride licenses, commercial districts and public security. It does **not** command the entire planet or galaxy. Customs/outer entry obligations are constrained by external partners, lenders and cargo treaties.

This balances worldbuilding and narrative gameplay:
- A believable hard boundary explains why a human can be *inside the city illegally*; entry and work/status are distinct legal questions.
- Economic dependence on trade, migrants, strangers and contractors clashes with the anti-human ban.
- Ward law, port customs and privileged private security can disagree without requiring separate nation-scale simulations.
- The ban is political and socially contested: individual aliens and groups are not uniformly hostile, compassionate or corrupt.

**Three overlapping institutions (draft):**
1. **Charter Council** — sets city-wide permit policy, budget, public health, policing mandates and transit licenses. Members may be selected by wards, trade associations or negotiated seats; exact constitutional form still open.
2. **Port/Customs Authority** — controls cargo, entry, licenses, manifests and inspection gates; nominally a city body but subject to external trade treaties. Its enforcement tools are procedural and bureaucratic, not all-seeing magical scanners.
3. **Ward Compacts** — historical neighborhood and industrial administrations with their own permit practices, service fees, working arrangements and local protection. They can be more permissive or more aggressive than the city center, but cannot negate the whole border law.

**Optional private influence:** freight syndicates, landlords, dispatch firms, maintenance guilds and lenders purchase favors, build infrastructure or lobby the council; they are not a fourth sovereign government.

## C. The central contradiction: illegal human / legal alien city

- The **human exclusion rule** is a city-wide statutory/charter gate, not evidence that every alien wants it or believes its official justification.
- **Why** humans were excluded remains deliberately unresolved: conflicting public stories could cite a transport-era catastrophe, biosecurity panic or an old diplomatic confrontation. None is canon yet and no single species/alien bloc gets defined as inherently evil.
- Compliance is uneven: a trusted doctor might shield someone; a working-class passenger may be openly xenophobic; a senior official may quietly use black-market labor.
- Fake credentials, vehicle registration, passenger recollections and language mistakes matter separately. A player does not instantly lose merely by entering a district; risk depends on *what happened, who noticed, which jurisdiction and what records now exist*.
- Hiding an illegal resident has costs for helpers. Not every friendly NPC should become a risk-free sanctuary.

## D. What makes the city economically viable?

**Economic backbone (proposal):**
- **Transshipment and port logistics:** cargo docks, bonded warehouses, inspection and forwarding; the reason a settlement originally grew.
- **Fabrication, refit and salvage:** workshops, spare-parts economy and several generations of repairable transport machinery.
- **Distribution and mobility services:** markets, local delivery, taxi networks, passenger terminals and freight routing.
- **Administration, finance and health:** licensed institutions concentrated where enforcement is stronger.
- **Domestic and informal labor:** cleaning, nighttime deliveries, off-record clinics, unlicensed dispatch, housing sublets and gray-market translation/data work.

**Core tensions:**
- The port moves valuable goods but its workers often live far from the polished civic terraces.
- Commercial licenses may be expensive because access is rationed. A legal dispatch app favors registered firms; the player usually finds early work through street pickups and informal referrals, while forged credentials or illegal dispatch channels expose them differently.
- Customs hold-ups and district closure can ripple into fares, passenger demand, food/parts costs, job availability and radio stories.
- Colored paving, billboard generations, repair materials and street furniture can signal different *funding eras* and who controls a road; not simply aesthetic biomes.

**Game-economy implications, not yet numbers:** preserve existing `credits` fixtures until a considered economy pass. Distinguish fare, commission, route cost, permit/repair expenses and premium for sensitive jobs. No exact tariffs, salaries, population, annual GDP or exchange rate is canon at this stage.

## E. Security: jurisdictional pressure instead of a police-chase game

| Actor | Where it concentrates | Typical power | Story/game pressure |
| --- | --- | --- | --- |
| Civic Ward Patrol | Old Junction and civic streets | street stops, incident reports, local citations | gossip, suspicion, permits, inconsistent behavior |
| Port/Customs Inspectors | docks, bonded roads, entry corridors | cargo scans, driver/license checks, border investigation | route choice, cargo/passenger questions, forged documents |
| Transit/Dispatch Compliance | taxi ranks and main arteries | operator credentials, plate/permit cross-checks | lost access to official rides or restricted corridors |
| Private Estate/Industrial Security | Upper Terraces and high-value factories | private road access, camera logs, contractual blacklists | who will admit or recommend the driver |
| Informal Protection Networks | Outer Margin, Old Junction, Docks | local favors, warnings and coercion | useful cover at a cost, betrayal or shifting allegiances |

A **checkpoint is a designed route event** with discoverable alternatives and persistent consequences, not a high-speed chase/combat system. Enforcement varies by time, event, neighborhood and publicity. A clandestine route may lower permit checks but increase robbery, blackmail, or unreliable pay. Officer/personnel attitudes can differ from policies.

## F. Social fabric and everyday institutions

The city contains several non-human populations with **unequal histories**, not one alien monoculture. Design species traits *after* determining practical needs (door scale, hearing, eye levels, seating, hand grips, air/lighting), and give them social, economic and personal variation. Never reduce factions to a species alignment chart.

Language is political. **Dock Common** already exists in production, but it need not be everybody's native tongue. Official public broadcasts, ward slang, old trader registers, family languages and restricted channels can coexist; a radio station playing music the player cannot understand is still useful worldbuilding. Translation is partial knowledge, not subtitles that auto-solve identity.

**Recurring street-level life:** shift changes, night clinics, repair queues, shipping arrivals, labor disputes, student fares, festival street closures, tenants moving, private parties, food distribution, weather hazards and civic election/charter debates. Each event should generate *rides and opinions*, not only a lore article.

## G. How this becomes taxi gameplay

1. **Information → route:** a Dockwave broadcast hints an inspection surge; player changes the known path before picking up an undocumented patient.
2. **Economic event → demand:** a freight lockout means more stranded workers, lower legal taxi supply and more risky night fares.
3. **Institution → consequence:** the driver earns a ward's trust but a port license anomaly still exists; popularity does not erase paperwork.
4. **Cultural pressure → dialogue:** official vocabulary differs from dock slang; choosing the wrong explanation of a road or job exposes unfamiliarity.
5. **Passenger contradiction:** a customs worker distrusts humans but needs an illegal medical ride for family. Relationship and human attitude remain independent.
6. **Physical infrastructure → authored shot:** entering a supported upper viaduct gives a panoramic view of the port and Civic Core while a high-security checkpoint comes into view.

These are **example hooks**: do not implement or treat them as shipped quests until content and domain contracts are reviewed.

## H. Canon-lock candidates vs open decisions

**Strong provisional recommendation:** chartered port city-state; six intertwined urban districts on an old basin; mixed transit heights on physical ground/bridges; institutionally uneven law enforcement; trade/logistics and refit driving inequality; city-wide anti-human exclusion disputed by residents.

**Intentionally undecided:**
- In-world alien city name, endonym/exonym and administrative title.
- Whether the wider trade accord is a confederation, league, compact or set of bilateral treaties.
- Origins and truth of the anti-human ban, diplomatic relationship with human societies.
- Number/physiology/history of species; constitution and form of council elections.
- Exact city geography dimensions, population, climate, compass orientation, coast type and calendar.
- Whether the port is maritime, inland-water basin or another *physical* cargo waterway; diagram currently draws a coastal tidal basin for spatial clarity.
- Exact ward boundaries, local rules, rent, taxes and enforcement thresholds.

## Next decisions in order

1. Agree on **jurisdiction**: full independent city-state vs autonomous charter city constrained by outside treaties (recommended latter).
2. Agree on macro-topology: **old cargo basin + inland civic terraces**, and whether the settlement expands in a crescent or a full ring around water.
3. Confirm or revise the **six provisional districts**, then give each two landmarks, one economic dependence, one security actor and one meaningful taxi transfer.
4. Define 2–3 historical founding ruptures; write their visible scars into infrastructure and neighborhoods.
5. Only then name the city and convert approved road/district/location links into additional typed authored production content.

**Guardrail:** the geographical graph should serve ride routes and narrative decisions. No open-world traversal, taxi steering, 1:1 street GIS simulation, new rendering framework or parallel city-state gameplay model is implied.
