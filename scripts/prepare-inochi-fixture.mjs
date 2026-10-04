import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const FIXTURE_URL =
  'https://raw.githubusercontent.com/Inochi2D/inochi2d/4975d247f9b946a74d18e0ba9b3e9475eb636efb/examples/ada-static.inx';
const EXPECTED_GIT_BLOB_SHA =
  'afd5f426a5785255243543949db88a8120d80109';
const OUTPUT_PATH = resolve(
  'dist/__fixtures__/ada-static.inx',
);

function gitBlobSha(bytes) {
  const header = new TextEncoder().encode(
    `blob ${String(bytes.byteLength)}\0`,
  );

  return createHash('sha1')
    .update(header)
    .update(bytes)
    .digest('hex');
}

async function main() {
  const response = await fetch(FIXTURE_URL, {
    redirect: 'follow',
    headers: {
      'user-agent': 'outsider-driver-browser-validation',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch pinned Inochi2D visual fixture: HTTP ${String(response.status)}`,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const blobSha = gitBlobSha(bytes);

  if (blobSha !== EXPECTED_GIT_BLOB_SHA) {
    throw new Error(
      `Inochi2D visual fixture Git blob mismatch: expected ${EXPECTED_GIT_BLOB_SHA}, received ${blobSha}.`,
    );
  }

  await mkdir(dirname(OUTPUT_PATH), {
    recursive: true,
  });
  await writeFile(OUTPUT_PATH, bytes);

  process.stdout.write(
    `Prepared pinned Inochi2D visual fixture (${String(bytes.byteLength)} bytes).\n`,
  );
}

await main();
