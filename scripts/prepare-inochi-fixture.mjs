import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const FIXTURES = [
  {
    url: 'https://raw.githubusercontent.com/Inochi2D/inochi2d/4975d247f9b946a74d18e0ba9b3e9475eb636efb/examples/empty08.inx',
    gitBlobSha: '2c7417a5233a328425f84f3e5da2106aaa19f18f',
    outputPath: resolve('dist/__fixtures__/empty08.inx'),
  },
  {
    url: 'https://raw.githubusercontent.com/Inochi2D/inochi2d/4975d247f9b946a74d18e0ba9b3e9475eb636efb/examples/ada-static.inx',
    gitBlobSha: 'afd5f426a5785255243543949db88a8120d80109',
    outputPath: resolve('dist/__fixtures__/ada-static.inx'),
  },
];

function gitBlobSha(bytes) {
  const header = new TextEncoder().encode(
    `blob ${String(bytes.byteLength)}\0`,
  );

  return createHash('sha1')
    .update(header)
    .update(bytes)
    .digest('hex');
}

async function prepareFixture(fixture) {
  const response = await fetch(fixture.url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'outsider-driver-browser-validation',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch pinned Inochi2D fixture: HTTP ${String(response.status)}`,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const blobSha = gitBlobSha(bytes);

  if (blobSha !== fixture.gitBlobSha) {
    throw new Error(
      `Inochi2D fixture Git blob mismatch: expected ${fixture.gitBlobSha}, received ${blobSha}.`,
    );
  }

  await mkdir(dirname(fixture.outputPath), {
    recursive: true,
  });
  await writeFile(fixture.outputPath, bytes);

  process.stdout.write(
    `Prepared pinned Inochi2D fixture ${fixture.outputPath} (${String(bytes.byteLength)} bytes).\n`,
  );
}

for (const fixture of FIXTURES) {
  await prepareFixture(fixture);
}

