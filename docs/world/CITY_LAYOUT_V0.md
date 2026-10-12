# City Layout v0 — Top-Down Urban Logic

> **DRAFT SCHEMATIC.** [View top-down map](CITY_PLAN_V0.svg) · [Political/economic foundation](CITY_FOUNDATION_V0.md). This is spatial preproduction lore, NOT geodetic GIS, an open-world promise, a finalized naming system or committed route data.

## What the map must answer

The driver understands the city through **connected corridors and social boundaries**, not free exploration. Every long taxi ride should have a plausible origin, a street-level route, a changed skyline/landmark profile, and a place where rules or passengers' attitudes change.

The existing production content proves only **The Docks**, `Docks Taxi Rank → Night Clinic` via `route:docks-night`, with `route-event:docks-checkpoint` on a single 8-minute route segment. The drawn other neighborhoods, new streets and checkpoint sites **do not yet exist in runtime authored content**.

## Macro-shape: old cargo basin + inland rises

**Working geometry:** built around a cut-in tidal cargo basin on the **west/southwest**, expanding inland in a loose crescent. The city grew in *layers*, not from a perfect circular master plan: bonded wharves → older shops/worker wards → trunk roads and civic monuments → expensive high terraces → informal edge settlement.

The physical terrain is important. The Docks are at low water level. Older work areas and Old Junction rise gradually inland. Civic Core sits on a slightly raised built platform, not a magic floating island. Upper Terraces climb a stepped escarpment. Outer Margin lies by a dry drainage channel and the external land-access road, with lower infrastructure quality.

**Map orientation:** north is up only to help us sketch and communicate; it is not a locked in-world compass, scale, planet, ocean, city size or geography.

## Six proposed districts

| ID (design only) | Position | Landmarks/streets | Economic role and social tension | Jurisdictional friction |
| --- | --- | --- | --- | --- |
| The Docks | SW, against the basin | Cargo quays; Docks Taxi Rank; Night Clinic; covered weigh-gate | transshipment, migrant labor, warehouses, night patients | customs authority and informal dock protection overlap |
| Worker Belt | NW of the junction | Refit furnaces; maintenance arcades | repairs, fabrication, dense worker flats, transport unions | worksite access cards and guild/patrol inspections |
| Old Junction | central | old arterial knot; multilingual market concourse | commercial mixing, dispatch swaps, families and street trades | crowded jurisdiction overlap, local favoritism |
| Civic Core | central-east | charter square; registry halls; official transit exchange | administration, courts, registered health, civic media | public ID scans, formal taxi rules |
| Upper Terraces | NE high slope | arc terraces; research/estate gates | finance, private research, influence, premium fares | private access and public license restrictions |
| Outer Margin | SE edge | dense lived-in flats; local street market and clinics; Patchworks repair frontage; reclaimed drainage corridor | severely poor residents, migrants, fugitives and outcasts; functioning informal services; **player lives here** | neighborhood mutual aid and protection rackets, blackmail, intermittent ID sweeps; not a ruined no-go zone |

**Player geography (user direction):** the protagonist **lives inside Outer Margin**, the dangerous but thriving low-income district, rather than on an Old Junction border. The current draft places a modest inhabited room in the Lantern Row residential interior and a repair garage at the Patchworks frontage, close to a legal feeder road toward Old Junction. These subareas and garage details remain draft; neither home nor garage coordinates are live #65/PR #74 navigation data. The district's social fabric, physical services and risk asymmetry are developed in [Outer Margin v0.1](OUTER_MARGIN_DISTRICT_V0.md).

## How destinations use 3D streets and 2D location anchors

**Confirmed presentation rule:** the **streets, plazas, buildings, bridges, vehicles and taxi travel remain 3D**, as do the player's bounded **home and garage**. The layout also maps **shops, offices, cafés, clinics, parts counters and small services** as reachable geographic points, but most such interiors are **2D illustrated or VN-style anchors**, not costly 3D explorable rooms. Their exterior architecture can remain visible on the real 3D taxi route; reaching the destination permits a service screen or conversation and returns to the valid city/vehicle state afterward.

**The map is a location/connectivity graph, not a renderer specification:** a detailed Shop `locationId` can refer to a simple but recognizable 3D facade and a rich 2D interaction. This raises social/commercial density without demanding one 3D scene per address. Anchors are not instant travel between unseen neighborhoods, and do not create independent currencies, inventory or suspicion. See [Location Presentation Modes](LOCATION_PRESENTATION_MODES_V0.md) for the production boundary. This new rule does not mean every illustrated building needs a playable door.

## Ground transport hierarchy (not separate playable floors)

- **Lower Streets:** continuous road contact from quay loading ramps and crowded historic streets. Narrow, low clearance and prone to closure.
- **Main Arteries:** primary supported roadbeds that connect taxi ranks, market junctions, civic exchange and outer land approach. At-grade where possible.
- **Restricted Transit:** certain elevated **supported viaducts**, service tunnels and permit-controlled industrial/estate access ways. They are ordinary physical roads with piers, ramps, parapets and grade changes; **never hover/fly-only lanes**.
- **Freight Spine:** visually distinct industrial road from the quay to Worker Belt and an external land gate; freight delays change other routes.
- **Civic Ramp:** a heavily supervised rising causeway from Old Junction to Civic Core/Upper Terraces. The player can see where the expensive streets begin.

A visible harbor bridge is not automatically the fastest route: toll/permit risk, passenger class, surveillance, closure and time can outweigh distance. Add subway/rail as background infrastructure later only with authored world justification; no new train gameplay is implied.

## Topology sketch (not chronological routes)

```text
                        [UPPER TERRACES]
                              || supported uphill/ramp
[WORKER BELT] ======= [OLD JUNCTION] ======== [CIVIC CORE]
     ||                   ||                      ||
  industrial             || older market       upper permit gate
  freight spine          ||                      ||
     ||                   ||                      ||
[THE DOCKS] ---------- [basin ring] ------- [OUTER MARGIN]
     || customs quay                                ||
 [PHYSICAL HARBOR]                         external land gate
```

The map's colored curves are **corridor concepts**. All six areas should be reachable in the city fiction; the game implements only select authored point-to-point routes where there is story/job content.

## Permanent geography and vantage points

- **Cargo Basin:** irregular sea/water inlet with breakwaters, cranes and quays; the industrial economy's original reason to exist.
- **Old Junction:** a visibly tangled interchange and noisy multilingual market; crossroads for shift changes and taxi queues.
- **Charter/Registry Terrace:** vertical public architecture above older streets; good view across the harbor from certain supported roads.
- **Upper Escarpment:** physical steps, terraced structures and uphill highway sections create a credible socioeconomic gradient.
- **Outer Drainage Course:** old flood/utility cut following settlement margins. Can host cheap dwellings and illicit access paths, but not a teleporting secret tunnel across the whole city.
- **Port-to-Worker Cargo Spine:** unavoidable heavy cargo geometry ties industrial roads to the docks and explains traffic peaks.

## Security map, not a global heat number

The diagram marks **candidate** nodes, not preexisting playable encounters:
- **Bonded Dock Gate:** paperwork and cargo/driver checks; the existing `route-event:docks-checkpoint` may ultimately be placed along the Docks Taxi Rank → Night Clinic corridor once chronology and exact geometry are reviewed.
- **Civic Permit Filter:** license checks along the legitimate high-status interchange.
- **Terrace Estate Access:** private permission from a client, distinct from public traffic regulation.
- **Outer Land Entry Gate:** external charter/border access, not arbitrary internal patrol.

A district never becomes fully safe/unsafe just because it has a label. Routes, time, contacts, jobs and information determine exposure.

## Economy and city composition should be visible in a drive

**Docks → Old Junction:** salt-worn port materials become patched everyday walls; radio vocabulary shifts; worker crowds and price-sensitive riders increase.

**Old Junction → Civic Core:** road paint is cleaner, archive facades dominate, civic lanes are monitored, formal dispatch eligibility matters.

**Worker Belt → Upper Terraces:** machines and congested workforce roads give way to cleaner, slower permit roads; differences in labor/housing and class become physical.

**Old Junction → Outer Margin:** a busy mixed-income junction gradually narrows into **compact but inhabited housing**, repaired old enamel road patches, community utility kiosks, improvised storefronts, bus queues and local food markets. The district is severely poor and dangerous because of **precarious rights, extortion, informal obligations and inconsistent enforcement** — not because every street is rubble or every resident is a criminal. The taxi approaches the garage from the Patchworks repair frontage and eventually the player's modest rental deeper in Lantern Row; neither route is yet implemented.

## Outer Margin in the spatial plan — inhabited risk

The eastern/southeastern patch of the overhead diagram is *not* an empty wasteland outside the city's functioning economy. It sits **within the city-state**, alongside the last-mile arrival road and the old drainage cut. It has denser small footprints, household services, community protection and functioning but stressed infrastructure.

Potential map inset labels are **Lantern Row (home, ordinary families)**, **Patchworks (garage and repair work)** and **The Cut (drainage-edge isolation and opportunistic extortion)**. At the macro-map scale we mark only the player's **Home** and **Garage** as proposed locations; these are not added to game registries and should not be confused with the already implemented Docks Taxi Rank and Night Clinic.

At the city-wide scale, danger is a **jurisdictional gradient**: the Civic Core has legal and permit scrutiny; The Docks has customs inspections; Outer Margin has low-status living, personal leverage and sporadic ID raids. A poor resident can still have a functioning business, a stable social circle, and moral agency. See [Outer Margin District Profile](OUTER_MARGIN_DISTRICT_V0.md) for the city identity and gameplay consequences.

## Next stage: move from macro-map to route/sector diagrams

1. Get explicit buy-in on **charter-city jurisdiction** and the west-basin/crescent map; rename/reshape districts if the world should feel less familiar.
2. Choose a **realistic landmark density and vertical profile**. The image is an abstract plan, not an actual aerial world screenshot of Babylon content.
3. Sketch the **Docks close aerial inset** with current Taxi Rank, Night Clinic and checkpoint without breaking existing `route:docks-night` IDs or pretending the one 36m scenery strip represents an entire district.
4. Author one sector at a time as **location/route/event data** in canonical content, with graph constraints/tests — no speculative population/world simulation up front.
5. Produce a separate **isometric/aerial concept art** based on this accepted physical map only after dimensions and zones are reviewed. Rendering a city that does not fit the geography would waste art effort.

**No gameplay code changed in this branch.** The goal is versioned, revisable design foundations.
