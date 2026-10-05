# Browser and Device Compatibility

Outsider Driver is web-first and treats browser compatibility as a production contract.

## Required runtime capabilities

The current web build requires:

- WebGL;
- WebAssembly.

Startup checks these capabilities before constructing Babylon. If either capability is unavailable, the application renders an accessible compatibility message instead of starting the game runtime and failing later with a graphics/runtime exception.

Unsupported-capability handling does not mutate save data.

## Supported automated matrix

GitHub CI targets these Playwright profiles on the production build:

| Profile | Engine | Device shape | Required smoke |
| --- | --- | --- | --- |
| `chromium-desktop` | Chromium | Desktop | boot, taxi surface, garage/home, settings/focus, real Inochi proof |
| `firefox-desktop` | Firefox | Desktop | capability gate; full boot/garage/home/settings when WebGL is exposed, otherwise accessible compatibility fallback |
| `webkit-desktop` | WebKit | Desktop | boot, taxi surface, garage/home, settings/focus |
| `chromium-compact-touch` | Chromium | Pixel-class compact touch viewport | boot, personal spaces, settings/focus, touch tap, responsive bounds |

The matrix is deliberately engine-oriented rather than tied to specific consumer browser version numbers. Playwright pins the browser revisions through the locked `@playwright/test` dependency and CI installs the matching engines.

Browser support is capability-based, not user-agent-based. The Linux headless Playwright Firefox runner may report Babylon WebGL as unavailable even though normal hardware-accelerated Firefox remains a target browser. In that CI environment Firefox must prove the accessible compatibility path with no crash or hang. If the runner exposes WebGL, the same tests automatically exercise the full Babylon/personal-space/settings path instead.

## Inochi verification scope

The verified Inochi WASM runtime and real-puppet browser proof are intentionally executed only on `chromium-desktop`.

That test is a supply-chain/runtime/rendering proof and is comparatively expensive. Chromium and WebKit exercise the production Babylon surface, personal spaces, persisted accessibility/control UI, and bootstrap behavior. Firefox exercises those same paths when its CI runtime exposes WebGL; otherwise it must prove the explicit compatibility fallback. This avoids pretending that a headless graphics limitation is a successful render while still keeping Firefox in the compatibility matrix.

If an engine-specific Inochi regression is discovered, add a focused regression test for that engine rather than making every CI job repeat the full probe by default.

## Compact/touch contract

The compact touch profile must prove:

- a touch-capable navigator environment;
- coarse-pointer emulation;
- no fatal horizontal page overflow;
- the settings control remains tappable;
- the settings panel remains inside the viewport;
- production canvas/bootstrap and personal-space probes stay operational.

This is compatibility coverage, not a promise that the final game UI is phone-optimized. Larger-screen product requirements may still be defined later.

## Compatibility changes

Changing the supported matrix or required capabilities is a reviewed architecture/release decision.

Do not silently remove an engine because a feature fails there. Either:

1. fix the regression;
2. document a genuine platform limitation with evidence and adjust the support contract explicitly.

Exact-head GitHub CI is the compatibility authority.
