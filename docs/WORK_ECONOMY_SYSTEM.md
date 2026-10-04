# Work and Economy System

The work/economy layer makes official and underground taxi work mechanically different while keeping jobs authored as data.

## Job contract

Every production job defines:

- stable job/passenger/location/route references;
- availability window;
- source channel;
- fare terms;
- expense terms;
- completion progression effects.

### Official source

Official jobs can require:

- minimum official standing;
- any number of cover-identity attributes such as a work permit or licensed occupation.

Requirements are authored key/value pairs and checked through the social-stealth cover identity. They are not hard-coded to one fake identity.

### Underground source

Underground jobs can require:

- minimum underground access;
- authored risk footprint.

That means underground work is not a reskinned official list: it has its own access progression and exports risk information for later authority/security consequences.

## Work network

`WorkNetwork.listAvailable()` filters by authored time window and eligibility.

Without a matching official cover, the initial production catalog exposes the underground clinic job but not the official clinic job. A cover with `work-permit = licensed-driver` makes the official job eligible.

Ride acceptance revalidates eligibility inside `PassengerRideOrchestrator`; presentation code cannot bypass the gate.

## Fare and expenses

A ride settlement uses the completed ride's game-time duration.

Gross fare is:

```text
base + (per-minute * duration) + completion bonus
```

Ride expenses are:

```text
dispatch fee + (operating cost per minute * duration)
```

Net credits are gross minus expenses.

The economy state tracks credits, lifetime gross earnings, lifetime expenses, official standing, underground access, and IDs of already-settled rides.

A ride ID can settle only once, preventing retries from double-paying.

## Ride completion integration

`EconomyRideCompletionAdapter` implements the existing ride completion port. It resolves the authoritative authored job from `WorkNetwork` and commits the settlement to `EconomyStateStore`.

Completion effects update official standing and/or underground access using authored deltas clamped to 0–100.

For an underground job, the returned settlement also contains the job risk footprint; economy records money/access while later risk systems decide what that footprint means socially or legally.

## Non-ride expenses and purchases

`EconomyStateStore.spendCredits()` owns explicit credit expenditure and refuses overspend.

`TranslatorMarketplace` uses that economy boundary to charge a pack's authored `costCredits` before granting translator ownership. Duplicate ownership does not double-charge.

## Persistence

Production save v5 adds `economyState`.

Migration from v4 creates a deterministic empty economy state. Economy state then round-trips with the same versioned save codec used by rides, social stealth, and translator ownership.
