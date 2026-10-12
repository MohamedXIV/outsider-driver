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
| Outer Margin | SE edge | sublet housing; last-mile bus turnaround; reclaimed floodchannel | newcomers, affordable rooms, makeshift retail | irregular public services, selective enforcement |

**Proposed player geography:** the garage may sit near Worker Belt's southern interface with Old Junction, while the room/home is in the seam between Old Junction and Outer Margin. *Neither position is canon or part of #65 navigation/content yet.* This makes working life legible without putting both sites unrealistically next door.

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

**Old Junction → Outer Margin:** painted repair strips, thinner lighting, older bus queues and reclaimed infrastructure; residents are not all criminals and not automatically friendly to illegal humans.

## Next stage: move from macro-map to route/sector diagrams

1. Get explicit buy-in on **charter-city jurisdiction** and the west-basin/crescent map; rename/reshape districts if the world should feel less familiar.
2. Choose a **realistic landmark density and vertical profile**. The image is an abstract plan, not an actual aerial world screenshot of Babylon content.
3. Sketch the **Docks close aerial inset** with current Taxi Rank, Night Clinic and checkpoint without breaking existing `route:docks-night` IDs or pretending the one 36m scenery strip represents an entire district.
4. Author one sector at a time as **location/route/event data** in canonical content, with graph constraints/tests — no speculative population/world simulation up front.
5. Produce a separate **isometric/aerial concept art** based on this accepted physical map only after dimensions and zones are reviewed. Rendering a city that does not fit the geography would waste art effort.

**No gameplay code changed in this branch.** The goal is versioned, revisable design foundations.
