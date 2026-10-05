import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const packageJson = JSON.parse(
  await readFile(resolve('package.json'), 'utf8'),
);

const sourceRevision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  'local';

const buildEnvironment =
  process.env.VERCEL_ENV ??
  (process.env.CI === 'true' ? 'ci' : 'local');

const metadata = {
  schemaVersion: 1,
  application: {
    name: packageJson.name,
    version: packageJson.version,
  },
  sourceRevision,
  buildEnvironment,
  inochiRuntime: {
    sourceRepository: 'Inochi2D/inochi2d',
    upstreamTag: 'nightly',
    assetId: 604648506,
    assetName: 'inochi2d-wasm-debug.tar',
    assetCreatedAt: '2026-10-02T02:39:31Z',
    sha256:
      'd8c0e21d109d4681e5f24b730190fa0b016e9449d094ec4901d1e0a0aa8aec6e',
    artifactClass: 'debug-fallback',
  },
};

const outputPath = resolve('public/build-metadata.json');
await mkdir(dirname(outputPath), {
  recursive: true,
});
await writeFile(
  outputPath,
  `${JSON.stringify(metadata, null, 2)}\n`,
);

process.stdout.write(
  `Prepared build metadata for ${sourceRevision}.\n`,
);
