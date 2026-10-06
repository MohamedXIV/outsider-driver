import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const EMPTY_FIXTURE = {
  url: 'https://raw.githubusercontent.com/Inochi2D/inochi2d/4975d247f9b946a74d18e0ba9b3e9475eb636efb/examples/empty08.inx',
  gitBlobSha: '2c7417a5233a328425f84f3e5da2106aaa19f18f',
  outputPath: resolve('dist/__fixtures__/empty08.inx'),
};

const ADA_FIXTURE = {
  url: 'https://raw.githubusercontent.com/Inochi2D/inochi2d/4975d247f9b946a74d18e0ba9b3e9475eb636efb/examples/ada-static.inx',
  gitBlobSha: 'afd5f426a5785255243543949db88a8120d80109',
  outputPath: resolve('dist/__fixtures__/ada-static.inx'),
  rigSmokeOutputPath: resolve(
    'dist/__fixtures__/ada-rig-smoke.inx',
  ),
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

function createTinyTga() {
  const header = new Uint8Array(18);
  const view = new DataView(header.buffer);

  header[2] = 2;
  view.setUint16(12, 2, true);
  view.setUint16(14, 2, true);
  header[16] = 32;
  header[17] = 0x28;

  const bgraPixels = Uint8Array.from([
    64, 96, 255, 255,
    255, 192, 64, 255,
    96, 208, 255, 255,
    255, 96, 176, 255,
  ]);

  return concatBytes(header, bgraPixels);
}

function readInp1Tag(bytes, offset) {
  if (offset + 8 > bytes.byteLength) {
    throw new Error(
      `INP1 section tag exceeds fixture bounds at ${String(offset)}.`,
    );
  }

  return new TextDecoder().decode(
    bytes.subarray(offset, offset + 8),
  );
}

function readUint32be(bytes, offset) {
  if (offset + 4 > bytes.byteLength) {
    throw new Error(
      `INP1 uint32 exceeds fixture bounds at ${String(offset)}.`,
    );
  }

  return new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    4,
  ).getUint32(0, false);
}

function createAdaRigSmokeFixture(adaBytes) {
  if (readInp1Tag(adaBytes, 0) !== 'TRNSRTS\0') {
    throw new Error(
      'Pinned Ada fixture is not an INP1 container.',
    );
  }

  const payloadLength = readUint32be(adaBytes, 8);
  const textureSectionOffset = 12 + payloadLength;

  if (
    readInp1Tag(adaBytes, textureSectionOffset) !==
    'TEX_SECT'
  ) {
    throw new Error(
      'Pinned Ada fixture does not expose the expected INP1 texture section after its payload.',
    );
  }

  let offset = textureSectionOffset + 8;
  const textureCount = readUint32be(adaBytes, offset);
  offset += 4;

  if (textureCount === 0) {
    throw new Error(
      'Pinned Ada fixture unexpectedly contains no textures.',
    );
  }

  const replacementTexture = createTinyTga();
  const replacementParts = [
    adaBytes.subarray(0, textureSectionOffset),
    new TextEncoder().encode('TEX_SECT'),
    uint32be(textureCount),
  ];
  let originalTextureBytes = 0;

  for (let index = 0; index < textureCount; index += 1) {
    const dataLength = readUint32be(adaBytes, offset);
    offset += 4;

    if (offset >= adaBytes.byteLength) {
      throw new Error(
        `Pinned Ada texture ${String(index)} is missing its encoding byte.`,
      );
    }

    offset += 1;
    const dataEnd = offset + dataLength;

    if (dataEnd > adaBytes.byteLength) {
      throw new Error(
        `Pinned Ada texture ${String(index)} exceeds fixture bounds.`,
      );
    }

    originalTextureBytes += dataLength;
    offset = dataEnd;

    replacementParts.push(
      uint32be(replacementTexture.byteLength),
      Uint8Array.of(1),
      replacementTexture,
    );
  }

  const suffix = adaBytes.subarray(offset);

  if (
    suffix.byteLength > 0 &&
    readInp1Tag(suffix, 0) !== 'EXT_SECT'
  ) {
    throw new Error(
      'Pinned Ada fixture has an unexpected section after TEX_SECT.',
    );
  }

  return {
    bytes: concatBytes(...replacementParts, suffix),
    textureCount,
    originalTextureBytes,
  };
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

  return JSON.parse(
    new TextDecoder().decode(
      bytes.subarray(payloadStart, payloadEnd),
    ),
  );
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
  payload.param = [
    {
      uuid: 4100000001,
      name: 'Mouth',
      is_vec2: false,
      min: 0,
      max: 1,
      defaults: 0,
      axis_points: [0, 1],
      bindings: [],
    },
    {
      uuid: 4100000002,
      name: 'Blink',
      is_vec2: false,
      min: 0,
      max: 1,
      defaults: 0,
      axis_points: [0, 1],
      bindings: [],
    },
    ...[
      ['GazeX', 4100000003],
      ['GazeY', 4100000004],
      ['HeadX', 4100000005],
      ['HeadY', 4100000006],
      ['BodyX', 4100000007],
      ['BodyY', 4100000008],
      ['Mood', 4100000009],
    ].map(([name, uuid]) => ({
      uuid,
      name,
      is_vec2: false,
      min: -1,
      max: 1,
      defaults: 0,
      axis_points: [-1, 0, 1],
      bindings: [],
    })),
  ];
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

  const tga = createTinyTga();

  return concatBytes(
    new TextEncoder().encode('TRNSRTS\0'),
    uint32be(payloadBytes.byteLength),
    payloadBytes,
    sectionHeader,
    uint32be(tga.byteLength),
    Uint8Array.of(1),
    tga,
  );
}

async function fetchPinnedFixture(fixture, label) {
  const response = await fetch(fixture.url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'outsider-driver-browser-validation',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch pinned Inochi2D ${label} fixture: HTTP ${String(response.status)}`,
    );
  }

  const bytes = new Uint8Array(
    await response.arrayBuffer(),
  );
  const blobSha = gitBlobSha(bytes);

  if (blobSha !== fixture.gitBlobSha) {
    throw new Error(
      `Inochi2D ${label} fixture Git blob mismatch: expected ${fixture.gitBlobSha}, received ${blobSha}.`,
    );
  }

  return bytes;
}

async function main() {
  const [emptyBytes, adaBytes] = await Promise.all([
    fetchPinnedFixture(EMPTY_FIXTURE, 'empty'),
    fetchPinnedFixture(ADA_FIXTURE, 'Ada'),
  ]);
  const meshBytes = createInp1VisualFixture(
    emptyBytes,
    false,
  );
  const visualBytes = createInp1VisualFixture(
    emptyBytes,
    true,
  );
  const adaRigSmoke = createAdaRigSmokeFixture(adaBytes);

  await mkdir(dirname(EMPTY_FIXTURE.outputPath), {
    recursive: true,
  });
  await writeFile(EMPTY_FIXTURE.outputPath, emptyBytes);
  await writeFile(ADA_FIXTURE.outputPath, adaBytes);
  await writeFile(
    ADA_FIXTURE.rigSmokeOutputPath,
    adaRigSmoke.bytes,
  );
  await writeFile(MESH_FIXTURE_PATH, meshBytes);
  await writeFile(VISUAL_FIXTURE_PATH, visualBytes);

  process.stdout.write(
    [
      `Prepared pinned Inochi2D empty fixture (${String(emptyBytes.byteLength)} bytes)`,
      `pinned upstream Ada fixture (${String(adaBytes.byteLength)} bytes)`,
      `Ada rig-smoke fixture (${String(adaRigSmoke.bytes.byteLength)} bytes; ${String(adaRigSmoke.textureCount)} texture slots normalized from ${String(adaRigSmoke.originalTextureBytes)} source texture bytes)`,
      `generated mesh-only fixture (${String(meshBytes.byteLength)} bytes)`,
      `and TGA-backed visual fixture (${String(visualBytes.byteLength)} bytes).\n`,
    ].join(', '),
  );
}

await main();
