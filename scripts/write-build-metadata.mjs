import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [packageJson, runtimeManifest, lockfileBytes] =
  await Promise.all([
    readFile(resolve('package.json'), 'utf8').then(JSON.parse),
    readFile(
      resolve('config/inochi-runtime.json'),
      'utf8',
    ).then(JSON.parse),
    readFile(resolve('package-lock.json')),
  ]);

const sourceRevision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  'local';

const buildEnvironment =
  process.env.VERCEL_ENV ??
  (process.env.CI === 'true' ? 'ci' : 'local');

const dependencyLockSha256 = createHash('sha256')
  .update(lockfileBytes)
  .digest('hex');

const metadata = {
  schemaVersion: 1,
  application: {
    name: packageJson.name,
    version: packageJson.version,
  },
  sourceRevision,
  buildEnvironment,
  dependencyLockSha256,
  inochiRuntime: runtimeManifest,
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
