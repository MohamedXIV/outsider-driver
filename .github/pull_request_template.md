## What changed

<!-- Explain the production capability changed by this PR. -->

## Verification

- [ ] `npm run check`
- [ ] Relevant browser/runtime verification completed when required
- [ ] New behavior has deterministic tests or a documented reason it cannot

## Architecture / scope guardrails

- [ ] This uses production systems; it does not add a slice/demo-only parallel path
- [ ] Gameplay truth remains outside rendering/UI/narrative adapters
- [ ] No new free-driving, open-world, combat, traffic-sim, chase, drone, or base-building scope was introduced
- [ ] Data/content additions use stable IDs and production contracts where applicable
- [ ] Docs/issue acceptance criteria were updated if the architecture or scope changed
