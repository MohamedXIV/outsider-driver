import { readFile } from 'node:fs/promises';

const [packageJson, lockfile] = await Promise.all([
  readFile('package.json', 'utf8').then(JSON.parse),
  readFile('package-lock.json', 'utf8').then(JSON.parse),
]);

if (lockfile.lockfileVersion !== 3) {
  throw new Error(
    `Expected npm lockfileVersion 3, received ${String(lockfile.lockfileVersion)}.`,
  );
}

const root = lockfile.packages?.[''];

if (root === undefined) {
  throw new Error('package-lock.json has no root package entry.');
}

const fields = [
  'name',
  'version',
  'dependencies',
  'devDependencies',
  'engines',
];

for (const field of fields) {
  const packageValue = packageJson[field] ?? null;
  const lockValue = root[field] ?? null;

  if (JSON.stringify(packageValue) !== JSON.stringify(lockValue)) {
    throw new Error(
      `package-lock.json root field ${field} does not match package.json. Run npm install and commit the updated lockfile.`,
    );
  }
}

process.stdout.write(
  'package.json and package-lock.json root dependency contract match.\n',
);
