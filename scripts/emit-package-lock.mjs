import { readFile } from 'node:fs/promises';

const lockfile = await readFile('package-lock.json');

process.stdout.write(
  `PACKAGE_LOCK_BASE64_BEGIN\n${lockfile.toString('base64')}\nPACKAGE_LOCK_BASE64_END\n`,
);
