import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const manifest = JSON.parse(
  await readFile(resolve('config/inochi-runtime.json'), 'utf8'),
);
const RUNTIME_ARCHIVE_URL =
  `https://api.github.com/repos/Inochi2D/inochi2d/releases/assets/${String(manifest.assetId)}`;
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


function readUnsignedLeb128(bytes, start) {
  let value = 0;
  let shift = 0;
  let offset = start;

  while (offset < bytes.length) {
    const byte = bytes[offset];
    value |= (byte & 0x7f) << shift;
    offset += 1;

    if ((byte & 0x80) === 0) {
      return { value: value >>> 0, nextOffset: offset };
    }

    shift += 7;

    if (shift > 35) {
      throw new Error('WASM unsigned LEB128 value is too large.');
    }
  }

  throw new Error('Unexpected end of WASM unsigned LEB128 value.');
}

function encodeUnsignedLeb128(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `Cannot encode invalid unsigned LEB128 value ${String(value)}.`,
    );
  }

  const bytes = [];
  let remaining = value;

  do {
    let byte = remaining & 0x7f;
    remaining = Math.floor(remaining / 128);

    if (remaining !== 0) {
      byte |= 0x80;
    }

    bytes.push(byte);
  } while (remaining !== 0);

  return Uint8Array.from(bytes);
}

function concatBytes(...parts) {
  const length = parts.reduce(
    (sum, part) => sum + part.byteLength,
    0,
  );
  const result = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }

  return result;
}

function assertWasmHeader(bytes) {
  if (
    bytes.byteLength < 8 ||
    bytes[0] !== 0x00 ||
    bytes[1] !== 0x61 ||
    bytes[2] !== 0x73 ||
    bytes[3] !== 0x6d ||
    bytes[4] !== 0x01 ||
    bytes[5] !== 0x00 ||
    bytes[6] !== 0x00 ||
    bytes[7] !== 0x00
  ) {
    throw new Error('Invalid WebAssembly module header.');
  }
}

export function raiseDefinedWasmMemoryMinimum(
  wasmBytes,
  minimumPages,
) {
  if (
    !Number.isSafeInteger(minimumPages) ||
    minimumPages <= 0 ||
    minimumPages > 65_536
  ) {
    throw new Error(
      `Invalid WASM minimum page count ${String(minimumPages)}.`,
    );
  }

  const bytes = new Uint8Array(wasmBytes);
  assertWasmHeader(bytes);
  let offset = 8;

  while (offset < bytes.byteLength) {
    const sectionStart = offset;
    const sectionId = bytes[offset];

    if (sectionId === undefined) {
      break;
    }

    offset += 1;
    const sectionSize = readUnsignedLeb128(bytes, offset);
    const payloadStart = sectionSize.nextOffset;
    const payloadEnd = payloadStart + sectionSize.value;

    if (payloadEnd > bytes.byteLength) {
      throw new Error('WASM section extends beyond module bytes.');
    }

    if (sectionId !== 5) {
      offset = payloadEnd;
      continue;
    }

    const payload = bytes.subarray(payloadStart, payloadEnd);
    const count = readUnsignedLeb128(payload, 0);

    if (count.value !== 1) {
      throw new Error(
        `Expected exactly one defined WASM memory, found ${String(count.value)}.`,
      );
    }

    const flags = readUnsignedLeb128(
      payload,
      count.nextOffset,
    );

    if ((flags.value & 0x04) !== 0) {
      throw new Error(
        'Cannot provision memory64 for the Inochi2D browser runtime.',
      );
    }

    const minimum = readUnsignedLeb128(
      payload,
      flags.nextOffset,
    );

    if (minimum.value >= minimumPages) {
      return bytes;
    }

    if ((flags.value & 0x01) !== 0) {
      const maximum = readUnsignedLeb128(
        payload,
        minimum.nextOffset,
      );

      if (maximum.value < minimumPages) {
        throw new Error(
          `Configured WASM minimum ${String(minimumPages)} pages exceeds declared maximum ${String(maximum.value)} pages.`,
        );
      }
    }

    const patchedPayload = concatBytes(
      payload.subarray(0, flags.nextOffset),
      encodeUnsignedLeb128(minimumPages),
      payload.subarray(minimum.nextOffset),
    );
    const patched = concatBytes(
      bytes.subarray(0, sectionStart + 1),
      encodeUnsignedLeb128(patchedPayload.byteLength),
      patchedPayload,
      bytes.subarray(payloadEnd),
    );

    if (!WebAssembly.validate(patched)) {
      throw new Error(
        'Provisioned Inochi2D WASM failed validation after raising the memory minimum.',
      );
    }

    return patched;
  }

  throw new Error(
    'Pinned Inochi2D WASM does not define a local memory section.',
  );
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
      accept: 'application/octet-stream',
      'user-agent': 'outsider-driver-build',
      'x-github-api-version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Inochi2D runtime asset ${String(manifest.assetId)}: HTTP ${String(response.status)}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (
    contentType.includes('application/json') ||
    contentType.includes('application/vnd.github+json')
  ) {
    throw new Error(
      'Pinned Inochi2D asset endpoint returned metadata instead of binary bytes.',
    );
  }

  const archive = new Uint8Array(await response.arrayBuffer());
  const digest = createHash('sha256')
    .update(archive)
    .digest('hex');

  if (digest !== manifest.sha256) {
    throw new Error(
      `Inochi2D runtime digest mismatch: expected ${manifest.sha256}, received ${digest}.`,
    );
  }

  const wasm = extractSingleWasmFromTar(archive);
  const provisionedWasm = raiseDefinedWasmMemoryMinimum(
    wasm.bytes,
    manifest.minimumMemoryPages,
  );

  await mkdir(dirname(OUTPUT_PATH), {
    recursive: true,
  });
  await writeFile(OUTPUT_PATH, provisionedWasm);

  process.stdout.write(
    [
      `Prepared pinned Inochi2D asset ${String(manifest.assetId)} / ${wasm.name} (${String(wasm.bytes.byteLength)} source bytes).`,
      `Provisioned WASM memory minimum: ${String(manifest.minimumMemoryPages)} pages (${String(manifest.minimumMemoryPages * 65_536)} bytes).`,
      manifest.fallbackReason,
      '\n',
    ].join(' '),
  );
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
