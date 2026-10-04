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
const PATCHED_INITIAL_MEMORY_PAGES = 1_024;
const WASM_MEMORY_SECTION_ID = 5;

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

function readUnsignedLeb128(bytes, startOffset) {
  let value = 0;
  let shift = 0;
  let offset = startOffset;

  while (offset < bytes.length) {
    const byte = bytes[offset];

    if (byte === undefined) {
      break;
    }

    value |= (byte & 0x7f) << shift;
    offset += 1;

    if ((byte & 0x80) === 0) {
      return {
        value,
        nextOffset: offset,
      };
    }

    shift += 7;

    if (shift > 28) {
      throw new Error('WASM unsigned LEB128 value is too large.');
    }
  }

  throw new Error(
    'Unexpected end of WASM while reading unsigned LEB128.',
  );
}

function encodeUnsignedLeb128(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `Cannot encode invalid unsigned LEB128 value: ${String(value)}`,
    );
  }

  const result = [];
  let remaining = value;

  do {
    let byte = remaining & 0x7f;
    remaining = Math.floor(remaining / 128);

    if (remaining !== 0) {
      byte |= 0x80;
    }

    result.push(byte);
  } while (remaining !== 0);

  return Uint8Array.from(result);
}

function concatBytes(parts) {
  const length = parts.reduce(
    (total, part) => total + part.byteLength,
    0,
  );
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }

  return output;
}

export function patchWasmInitialMemory(bytes, minimumPages) {
  if (
    bytes.byteLength < 8 ||
    bytes[0] !== 0x00 ||
    bytes[1] !== 0x61 ||
    bytes[2] !== 0x73 ||
    bytes[3] !== 0x6d
  ) {
    throw new Error('Invalid WebAssembly module header.');
  }

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
      throw new Error(
        'WASM section extends beyond module bytes.',
      );
    }

    if (sectionId !== WASM_MEMORY_SECTION_ID) {
      offset = payloadEnd;
      continue;
    }

    const count = readUnsignedLeb128(bytes, payloadStart);

    if (count.value !== 1) {
      throw new Error(
        `Expected exactly one WASM memory, found ${String(count.value)}.`,
      );
    }

    const flagsOffset = count.nextOffset;
    const flags = readUnsignedLeb128(bytes, flagsOffset);
    const minimum = readUnsignedLeb128(
      bytes,
      flags.nextOffset,
    );
    let maximum = null;
    let memoryTypeEnd = minimum.nextOffset;

    if ((flags.value & 0x01) !== 0) {
      const parsedMaximum = readUnsignedLeb128(
        bytes,
        minimum.nextOffset,
      );
      maximum = parsedMaximum.value;
      memoryTypeEnd = parsedMaximum.nextOffset;
    }

    if (
      maximum !== null &&
      minimumPages > maximum
    ) {
      throw new Error(
        `Requested initial WASM memory ${String(minimumPages)} pages exceeds module maximum ${String(maximum)} pages.`,
      );
    }

    if (minimumPages <= minimum.value) {
      return {
        bytes,
        originalMinimumPages: minimum.value,
        maximumPages: maximum,
        patchedMinimumPages: minimum.value,
      };
    }

    const memoryPayloadParts = [
      bytes.slice(payloadStart, flags.nextOffset),
      encodeUnsignedLeb128(minimumPages),
    ];

    if (maximum !== null) {
      memoryPayloadParts.push(
        encodeUnsignedLeb128(maximum),
      );
    }

    memoryPayloadParts.push(
      bytes.slice(memoryTypeEnd, payloadEnd),
    );

    const memoryPayload = concatBytes(
      memoryPayloadParts,
    );
    const replacementSection = concatBytes([
      Uint8Array.of(WASM_MEMORY_SECTION_ID),
      encodeUnsignedLeb128(memoryPayload.byteLength),
      memoryPayload,
    ]);
    const patched = concatBytes([
      bytes.slice(0, sectionStart),
      replacementSection,
      bytes.slice(payloadEnd),
    ]);

    return {
      bytes: patched,
      originalMinimumPages: minimum.value,
      maximumPages: maximum,
      patchedMinimumPages: minimumPages,
    };
  }

  throw new Error(
    'Inochi2D WASM does not contain a memory section.',
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
  const patched = patchWasmInitialMemory(
    wasm.bytes,
    PATCHED_INITIAL_MEMORY_PAGES,
  );

  await mkdir(dirname(OUTPUT_PATH), {
    recursive: true,
  });
  await writeFile(OUTPUT_PATH, patched.bytes);

  process.stdout.write(
    `Prepared pinned Inochi2D debug runtime ${wasm.name} (${String(patched.bytes.byteLength)} bytes); initial memory ${String(patched.originalMinimumPages)} -> ${String(patched.patchedMinimumPages)} pages, max ${String(patched.maximumPages ?? 'unbounded')}. Debug is used because the current upstream nightly release WASM returns null from nu_malloc even for a 702-byte fixture.\n`,
  );
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
