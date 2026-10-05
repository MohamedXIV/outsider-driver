# Deployment and Preview Verification

Outsider Driver is web-first so cloud agents can verify real builds without a local game editor.

## GitHub CI is the merge gate

Every pull request must pass the repository CI checks. A Vercel preview is useful evidence, but a successful deployment does not replace lint, unit tests, type checking, production build, or browser smoke verification.

Canonical CI installs dependencies with `npm ci` from the committed `package-lock.json`. A package manifest / lockfile mismatch is therefore a hard failure before verification begins. `npm run lock:verify` also checks the repository-visible root dependency contract without network access.

The browser compatibility suite runs Playwright against the output of `npm run build` served by `vite preview`.

The supported matrix is defined in `docs/BROWSER_SUPPORT.md` and covers desktop Chromium, Firefox, WebKit, plus a compact touch Chromium profile.

Critical cross-browser checks prove:

- the production page loads successfully;
- the expected Babylon game canvas is visible and initialized when required capabilities exist;
- garage/home personal-space probes remain functional;
- accessibility/control UI and keyboard focus behavior remain functional;
- compact touch layout/tapping does not hit fatal overflow/bootstrap failures;
- unsupported WebGL capability produces an accessible compatibility surface rather than a crash;
- no uncaught page errors or browser console errors occur.

The expensive verified-WASM/real-Inochi puppet proof remains scoped to canonical desktop Chromium so the compatibility matrix stays practical.

## Vercel Git integration

The Vercel project `outsider-driver` is linked directly to `MohamedXIV/outsider-driver`.

Expected behavior:

- pushes to `main` produce the production-branch deployment;
- non-production branches and pull requests produce preview deployments;
- previews are disposable review surfaces, not a separate application architecture;
- no Vercel-only game logic or content truth may exist outside the repository.

The repository includes `vercel.json` to make the Vite build/output contract explicit.

## Verification hierarchy

Use evidence in this order:

1. exact-head GitHub CI checks;
2. browser smoke test on that exact code;
3. Vercel preview for visual/manual review where useful;
4. local verification only when a requirement cannot be proven online.

Do not report a PR as verified because an older deployment or a different commit was green.

## Secrets and runtime configuration

Never commit deployment credentials or private runtime secrets.

The current frontend foundation requires no runtime secrets. Future environment variables must be documented, scoped by environment, and validated at startup when they are required.

## Production promotion

A production deployment is not evidence that unfinished gameplay work is accepted. Production publishing and game release readiness remain separate concerns from preview infrastructure.

## Reproducible build identity

Every production build generates `/build-metadata.json` from repository-visible inputs.

The metadata records:

- application package name/version;
- source revision from Vercel/GitHub CI when available;
- build environment;
- SHA-256 of the committed npm dependency lockfile;
- the complete pinned Inochi2D runtime provenance manifest.

The Inochi runtime provenance lives in one canonical file: `config/inochi-runtime.json`. Runtime preparation and build metadata both consume that same file so asset ID/digest/version evidence cannot silently drift between scripts.

Do not add wall-clock timestamps to build metadata: the same source revision and declared inputs should produce the same provenance metadata.

The current Inochi fallback is fetched through the immutable GitHub release **asset ID**, not the mutable `nightly` download path, and its bytes must match the pinned SHA-256 before they are accepted. The repository records why the debug fallback is currently required; upgrading to a release artifact means changing the reviewed provenance manifest and passing exact-head browser/runtime proof again.
