# PR #73 browser regression investigation (#75)

Baseline: `c5d5f5210b4576f79aa2f35ff1632c3a1d7211cd`, Actions run `37780030347`.

## Findings and focused changes

- **Inochi completion:** the default five-second `expect.poll` expired inside an existing 90-second test. Locally this failed, including a run reaching `real-rig-acceptance-complete` before completion was published. That stage precedes GPU/session cleanup; completion is published after cleanup. Wait for the actual terminal state within the existing test deadline. Keep all failure, parameter, lighting, fixture and rendering assertions.
- **Settings reload:** visible DOM precedes engine/scene initialization. The baseline reproduced the CI click signature: the button was visible/enabled/stable, but scrolling it into view stalled for approximately 30 seconds. Wait for the existing startup-ready mark after navigation and reload before exercising UI readiness. Reload still uses an ordinary, unforced mouse click and checks every persisted preference and Escape/focus behavior.
- **Compact canvas checks:** the two original compact CI failures did **not** reproduce exactly locally: original compact tests passed at one and two CPUs. Fourfold CPU throttling produced a whole-test startup timeout, not the exact CI predicate failure. Their shared readiness helper now waits for the startup mark or compatibility outcome, then asserts that the initialized canvas has positive dimensions. It checks the ready canvas once, rather than polling browser RPCs under an unrelated five-second assertion deadline.

Readiness uses timer polling, independently of expensive animation frames. Missing startup marks, missing completion, page crashes and failed probes still fail within the existing test deadlines. The 5,000 ms desktop startup budget remains enforced. No timeouts were increased and no skips were added.

## Rendering experiments (reverted)

Software-rendered production frames were expensive: Pixel 5 emulation allocated a 1080×1999 buffer at DPR 2.75, and desktop profiling showed sparse frames and costly native GL setup. Disabling MSAA alone did not repair failures. A lower drawing-buffer resolution improved some settings runs, but did not reliably meet both settings and startup budgets. Those production changes and their experimental tests were reverted. This patch does not change cockpit resolution, materials, geometry, framing or lighting.

Gameplay/session/persistence and PR #72/#74 integration files are untouched. No workflow was manually rerun.

## Local environment and limits

Node 24.19.0, npm 11.9.0; Chromium 151 from `/usr/bin/chromium`, SwiftShader, one Playwright worker, retries zero. CPU affinity is recorded alongside individual results. The canonical Chromium 153 download redirects from `cdn.playwright.dev` to `storage.googleapis.com/chrome-for-testing-public`; the latter is blocked by the cloud proxy. The original Actions log download host is also blocked; the run reports zero uploaded artifacts. These prevent exact CI-browser/log reproduction locally.

Firefox 155 downloaded but could not launch ("Could not find profile folder", including a profile under `/workspace`). WebKit downloaded but its native dependencies were initially unavailable; temporary library extraction did not fully satisfy its dependency check. These launch failures occur before application navigation and are not passing browser evidence.

A temporary local Playwright configuration substitutes the installed Chromium executable and reuses the local preview server. It is not committed. Existing compact Inochi/settings skips remain part of the canonical suite.

```sh
NODE_OPTIONS=--use-env-proxy npm run check
NODE_OPTIONS=--use-env-proxy npm run fixture:inochi
taskset -c 0,1 env CI=1 node_modules/.bin/playwright test \
  --config playwright.local75.config.ts --retries=0 \
  --project chromium-desktop --project chromium-compact-touch \
  --grep 'verified WASM|accessibility and control|runtime capability contract|compact touch profile'
```

Final results and commit SHA are recorded in PR #73 / issue #75. Exact canonical-browser CI verification remains required; Draft status and visual review remain required.

## Final patch evidence

The final two-CPU, one-worker, zero-retry run selected eight project/test combinations: **4 passed, 3 existing skips, 1 failed** (2.4 minutes). The four cases reported failing by #75 passed: desktop Inochi, desktop persisted settings with its unforced reload click, compact startup and compact overflow. The additional desktop startup-budget assertion failed: **11,361.3 ms versus the unchanged 5,000 ms budget**. This is not a green browser suite. Original baseline desktop startup passed at 3,803.3 ms in the same local browser; later software-GPU timings were variable. No production optimization was retained on that evidence.

Remaining work: restore access to the exact Chromium download and original Actions logs, verify this same commit on canonical Chromium with the 5,000 ms startup budget, determine whether the local startup slowdown is environment-specific or a product regression, and confirm Firefox/WebKit support in working browser installations. If settings actionability or either compact failure persists on the canonical browser, inspect that run's trace and correct the underlying rendering/lifecycle problem without changing the budgets. Keep #75 open and PR #73 Draft until that evidence and visual review are complete.

Foundation validation: `NODE_OPTIONS=--use-env-proxy npm run check` exited 0 on Node 24.19.0/npm 11.9.0: lock verification, lint, 15 content-validator tests, 34 save-compatibility tests, 275 unit tests across 67 files, typecheck, production build and every artifact budget passed. Browser startup timing is a separate failing check, not covered by those artifact passes.

Temporary local browser configuration used (create at repository root, remove after testing):

```ts
import config from './playwright.config';
export default {
  ...config,
  webServer: { command: "npm run preview -- --host 127.0.0.1 --port 4173", url: "http://127.0.0.1:4173", reuseExistingServer: true },
  projects: config.projects?.map((project) => project.name?.startsWith('chromium') ? ({
    ...project, use: { ...project.use, launchOptions: {
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    } },
  }) : project),
};
```
