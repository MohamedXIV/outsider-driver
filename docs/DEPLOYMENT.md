# Deployment and Preview Verification

Outsider Driver is web-first so cloud agents can verify real builds without a local game editor.

## GitHub CI is the merge gate

Every pull request must pass the repository CI checks. A Vercel preview is useful evidence, but a successful deployment does not replace lint, unit tests, type checking, production build, or browser smoke verification.

The browser smoke test runs Playwright against the output of `npm run build` served by `vite preview`. It must prove that:

- the production page loads successfully;
- the expected game canvas is visible and initialized;
- no uncaught page errors occur;
- no browser console errors occur during boot.

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
