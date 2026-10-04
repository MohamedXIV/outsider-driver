import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEBUG_RUNTIME = {
  url: 'https://github.com/Inochi2D/inochi2d/releases/download/nightly/inochi2d-wasm-debug.tar',
  sha256: 'd8c0e21d109d4681e5f24b730190fa0b016e9449d094ec4901d1e0a0aa8aec6e',
  outputPath: resolve('dist/__fixtures__/inochi2d-debug.wasm'),
};

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

function readAscii(bytes, start, length) {
  const value = bytes.subarray(start, start + length);
  const zero = value.indexOf(0);
  return new TextDecoder().decode(
    zero === -1 ? value : value.subarray(0, zero),
  );
}

function readOctal(bytes, start, length) {
  const raw = readAscii(bytes, start, length).trim();

  if (raw.length === 0) {
    return 0;
  }

  const value = Number.parseInt(raw, 8);

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid tar size: ${raw}`);
  }

  return value;
}

function extractSingleWasm(bytes) {
  const matches = [];

  for (let offset = 0; offset + 512 <= bytes.byteLength; ) {
    const name = readAscii(bytes, offset, 100);

    if (name.length === 0) {
      break;
    }

    const size = readOctal(bytes, offset + 124, 12);
    const start = offset + 512;
    const end = start + size;

    if (end > bytes.byteLength) {
      throw new Error(`Tar entry exceeds archive: ${name}`);
    }

    if (name.endsWith('.wasm')) {
      matches.push(bytes.slice(start, end));
    }

    offset = start + Math.ceil(size / 512) * 512;
  }

  if (matches.length !== 1 || matches[0] === undefined) {
    throw new Error(
      `Expected exactly one debug WASM in archive, found ${String(matches.length)}.`,
    );
  }

  return matches[0];
}

async function prepareDebugRuntime() {
  const response = await fetch(DEBUG_RUNTIME.url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'outsider-driver-browser-validation',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch pinned Inochi2D debug runtime: HTTP ${String(response.status)}`,
    );
  }

  const archive = new Uint8Array(await response.arrayBuffer());
  const digest = createHash('sha256').update(archive).digest('hex');

  if (digest !== DEBUG_RUNTIME.sha256) {
    throw new Error(
      `Inochi2D debug runtime digest mismatch: expected ${DEBUG_RUNTIME.sha256}, received ${digest}.`,
    );
  }

  const wasm = extractSingleWasm(archive);
  await mkdir(dirname(DEBUG_RUNTIME.outputPath), {
    recursive: true,
  });
  await writeFile(DEBUG_RUNTIME.outputPath, wasm);

  process.stdout.write(
    `Prepared pinned Inochi2D debug runtime (${String(wasm.byteLength)} bytes).\n`,
  );
}

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

await prepareDebugRuntime();
