# Production Performance Budgets

Outsider Driver uses coarse production budgets to catch meaningful regressions in the web build. These are release-hardening gates, not micro-optimization targets.

The canonical limits live in `config/performance-budgets.json`. `npm run build && npm run budget:check` measures the generated `dist/` output and fails when a size budget is exceeded. The normal `npm run check` path runs the same budget gate in CI.

## Baseline and limits

The limits were established from production `main` at `538b7dc6d7d57ca7653f4204c49fdad67a4ba895`.

| Metric | Observed baseline | Budget | Purpose |
| --- | ---: | ---: | --- |
| entry JavaScript | 1,161,446 B | 1,300,000 B | catch growth in the always-loaded application/Babylon entry |
| entry JavaScript gzip | 283,935 B | 325,000 B | bound initial compressed JS transfer |
| total JavaScript | 1,776,670 B | 2,000,000 B | bound aggregate production code/chunks |
| total JavaScript gzip | 439,109 B | 500,000 B | bound aggregate compressed JavaScript |
| largest lazy JS chunk | 114,610 B | 150,000 B | prevent a single deferred feature chunk from silently ballooning |
| initial HTML/CSS/module transfer | 321,781 B | 380,000 B | protect the first production navigation payload |
| Inochi2D WASM | 6,537,169 bytes | 7,000,000 bytes | catch a major runtime artifact increase |
| startup-ready | measured in Chromium CI | 5,000 ms | catch gross startup regressions without treating CI jitter as micro-performance |

The byte baselines above come from the first deterministic budget report on this branch. The initial-transfer measurement includes the HTML, entry module, stylesheet, and Vite modulepreload references emitted by the production index.

## Initial loading contract

The Inochi2D WASM is staged in the production output at `/vendor/inochi2d/inochi2d.wasm`, but it is not part of the initial HTML/module transfer budget. The runtime fetch happens when `InochiWasmBindings.create()` is invoked, so the large WASM payload stays outside first-paint transfer until an Inochi runtime is actually requested.

The browser smoke records `outsider-driver:startup-ready` immediately after the production application starts. Canonical desktop Chromium asserts that this mark remains below the configured startup budget.

Large systems that are not required for initial boot should stay behind dynamic imports or equivalent demand-driven loading when practical. A budget failure is a signal to inspect loading architecture before increasing a limit.

## Fixture isolation

`npm run fixture:inochi` creates browser-test assets under `dist/__fixtures__` only after the production build. Those files are not production assets.

`npm run budget:check` fails if `dist/__fixtures__` content exists in the production build being measured. Run the budget gate directly after `npm run build`, as CI does.

Production character assets may legitimately use Inochi formats later; the gate therefore rejects the CI fixture namespace rather than banning all `.inx` assets.

## Changing a budget

A budget may be raised when the production feature cost is intentional. The pull request that changes a limit must include:

1. the before/after measured value from `npm run budget:check`;
2. the feature or dependency change responsible for the increase;
3. why lazy loading, code splitting, asset reduction, or another architectural change is not preferable;
4. the new amount of headroom and why it remains a useful regression gate.

Do not raise a budget simply to make CI green. Conversely, do not spend engineering time shaving insignificant bytes or milliseconds solely to stay far below a limit. These gates exist to catch major regressions.
