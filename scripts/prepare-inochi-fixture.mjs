import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const EMPTY_FIXTURE = {
  url: 'https://raw.githubusercontent.com/Inochi2D/inochi2d/4975d247f9b946a74d18e0ba9b3e9475eb636efb/examples/empty08.inx',
  gitBlobSha: '2c7417a5233a328425f84f3e5da2106aaa19f18f',
  outputPath: resolve('dist/__fixtures__/empty08.inx'),
};

const MESH_FIXTURE_PATH = resolve(
  'dist/__fixtures__/tiny-mesh08.inx',
);
const VISUAL_FIXTURE_PATH = resolve(
  'dist/__fixtures__/tiny-visual08.inx',
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

function concatBytes(...parts) {
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

function uint32be(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc =
        (crc >>> 1) ^
        ((crc & 1) !== 0 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const body = concatBytes(typeBytes, data);

  return concatBytes(
    uint32be(data.byteLength),
    body,
    uint32be(crc32(body)),
  );
}

function createTinyPng() {
  const signature = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, 2, false);
  ihdrView.setUint32(4, 2, false);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rows = Uint8Array.from([
    0,
    255, 96, 64, 255,
    64, 192, 255, 255,
    0,
    255, 208, 96, 255,
    176, 96, 255, 255,
  ]);

  return concatBytes(
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk(
      'IDAT',
      new Uint8Array(deflateSync(rows)),
    ),
    pngChunk('IEND', new Uint8Array()),
  );
}

function parseEmptyPayload(bytes) {
  if (
    new TextDecoder().decode(bytes.subarray(0, 8)) !==
    'TRNSRTS\0'
  ) {
    throw new Error(
      'Pinned empty Inochi fixture is not an INP1 container.',
    );
  }

  const payloadLength = new DataView(
    bytes.buffer,
    bytes.byteOffset + 8,
    4,
  ).getUint32(0, false);
  const payloadStart = 12;
  const payloadEnd = payloadStart + payloadLength;
  const payload = JSON.parse(
    new TextDecoder().decode(
      bytes.subarray(payloadStart, payloadEnd),
    ),
  );

  return payload;
}

function createVisualPayload(emptyBytes, includeTexture) {
  const payload = parseEmptyPayload(emptyBytes);
  const root = payload.nodes;

  if (
    typeof root !== 'object' ||
    root === null ||
    Array.isArray(root)
  ) {
    throw new Error(
      'Pinned empty Inochi fixture has no root node object.',
    );
  }

  payload.meta.name = 'Outsider Driver CI Visual Puppet';
  payload.meta.rigger = 'Outsider Driver';
  payload.meta.artist = 'Outsider Driver';
  root.children = [
    {
      uuid: 2976579761,
      name: 'Passenger Visual',
      type: 'Part',
      enabled: true,
      zsort: 0,
      transform: {
        trans: [0, 0, 0],
        rot: [0, 0, 0],
        scale: [1, 1],
      },
      lockToRoot: false,
      mesh: {
        verts: [
          -64, -64,
          64, -64,
          64, 64,
          -64, 64,
        ],
        uvs: [
          0, 1,
          1, 1,
          1, 0,
          0, 0,
        ],
        indices: [0, 1, 2, 0, 2, 3],
      },
      textures: includeTexture ? [0] : [],
      blend_mode: 0,
      tint: [1, 1, 1],
      screenTint: [0, 0, 0],
      emissionStrength: 1,
      opacity: 1,
    },
  ];

  return payload;
}

function createInp1VisualFixture(emptyBytes, includeTexture) {
  const payloadBytes = new TextEncoder().encode(
    JSON.stringify(
      createVisualPayload(emptyBytes, includeTexture),
    ),
  );
  const sectionHeader = concatBytes(
    new TextEncoder().encode('TEX_SECT'),
    uint32be(includeTexture ? 1 : 0),
  );

  if (!includeTexture) {
    return concatBytes(
      new TextEncoder().encode('TRNSRTS\0'),
      uint32be(payloadBytes.byteLength),
      payloadBytes,
      sectionHeader,
    );
  }

  const png = createTinyPng();

  return concatBytes(
    new TextEncoder().encode('TRNSRTS\0'),
    uint32be(payloadBytes.byteLength),
    payloadBytes,
    sectionHeader,
    uint32be(png.byteLength),
    Uint8Array.of(0),
    png,
  );
}

async function fetchPinnedEmptyFixture() {
  const response = await fetch(EMPTY_FIXTURE.url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'outsider-driver-browser-validation',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch pinned Inochi2D empty fixture: HTTP ${String(response.status)}`,
    );
  }

  const bytes = new Uint8Array(
    await response.arrayBuffer(),
  );
  const blobSha = gitBlobSha(bytes);

  if (blobSha !== EMPTY_FIXTURE.gitBlobSha) {
    throw new Error(
      `Inochi2D empty fixture Git blob mismatch: expected ${EMPTY_FIXTURE.gitBlobSha}, received ${blobSha}.`,
    );
  }

  return bytes;
}

async function main() {
  const emptyBytes = await fetchPinnedEmptyFixture();
  const meshBytes = createInp1VisualFixture(
    emptyBytes,
    false,
  );
  const visualBytes = createInp1VisualFixture(
    emptyBytes,
    true,
  );

  await mkdir(dirname(EMPTY_FIXTURE.outputPath), {
    recursive: true,
  });
  await writeFile(EMPTY_FIXTURE.outputPath, emptyBytes);
  await writeFile(MESH_FIXTURE_PATH, meshBytes);
  await writeFile(VISUAL_FIXTURE_PATH, visualBytes);

  process.stdout.write(
    [
      `Prepared pinned Inochi2D empty fixture (${String(emptyBytes.byteLength)} bytes)`,
      `generated mesh-only fixture (${String(meshBytes.byteLength)} bytes)`,
      `and textured visual fixture (${String(visualBytes.byteLength)} bytes).\n`,
    ].join(', '),
  );
}

await main();
