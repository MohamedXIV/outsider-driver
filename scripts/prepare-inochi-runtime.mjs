import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RUNTIME_ARCHIVE_URL =
  'https://github.com/Inochi2D/inochi2d/releases/download/nightly/inochi2d-wasm-debug.tar';
const RUNTIME_ARCHIVE_SHA256 =
  'd8c0e21d109d4681e5f24b730190fa0b016e9449d094ec4901d1e0a0aa8aec6e';
const OUTPUT_PATH = resolve(
  'public/vendor/inochi2d/inochi2d.wasm',
);

function readAscii(buffer, start, length) {
  const bytes = buffer.subarray(start, start + length);
  const zero = bytes.indexOf(0);
  return new TextDecoder().decode(
    zero === -1 ? bytes : bytes.subarray(0, zero),
  );
}

function readOctal(buffer, start, length) {
  const raw = readAscii(buffer, start, length)
    .replaceAll('\0', '')
    .trim();

  if (raw.length === 0) {
    return 0;
  }

  const value = Number.parseInt(raw, 8);

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid tar size field: ${raw}`);
  }

  return value;
}

export function extractSingleWasmFromTar(bytes) {
  const candidates = [];

  for (let offset = 0; offset + 512 <= bytes.byteLength; ) {
    const name = readAscii(bytes, offset, 100);

    if (name.length === 0) {
      break;
    }

    const prefix = readAscii(bytes, offset + 345, 155);
    const fullName =
      prefix.length > 0 ? `${prefix}/${name}` : name;
    const size = readOctal(bytes, offset + 124, 12);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;

    if (dataEnd > bytes.byteLength) {
      throw new Error(
        `Tar entry exceeds archive bounds: ${fullName}`,
      );
    }

    if (fullName.endsWith('.wasm')) {
      candidates.push({
        name: fullName,
        bytes: bytes.slice(dataStart, dataEnd),
      });
    }

    offset =
      dataStart + Math.ceil(size / 512) * 512;
  }

  if (candidates.length !== 1) {
    throw new Error(
      `Expected exactly one Inochi2D WASM file in the pinned archive, found ${String(candidates.length)}.`,
    );
  }

  return candidates[0];
}

async function main() {
  const response = await fetch(RUNTIME_ARCHIVE_URL, {
    redirect: 'follow',
    headers: {
      'user-agent': 'outsider-driver-build',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Inochi2D runtime archive: HTTP ${String(response.status)}`,
    );
  }

  const archive = new Uint8Array(await response.arrayBuffer());
  const digest = createHash('sha256')
    .update(archive)
    .digest('hex');

  if (digest !== RUNTIME_ARCHIVE_SHA256) {
    throw new Error(
      `Inochi2D runtime digest mismatch: expected ${RUNTIME_ARCHIVE_SHA256}, received ${digest}.`,
    );
  }

  const wasm = extractSingleWasmFromTar(archive);

  await mkdir(dirname(OUTPUT_PATH), {
    recursive: true,
  });
  await writeFile(OUTPUT_PATH, wasm.bytes);

  process.stdout.write(
    `Prepared pinned official Inochi2D debug runtime ${wasm.name} (${String(wasm.bytes.byteLength)} bytes). The debug artifact is used because the current nightly release WASM returns null from nu_malloc even for a 702-byte fixture; large asset uploads use JS-owned WASM scratch instead of walloc.\n`,
  );
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
