import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const EMPTY_FIXTURE = {
  url: 'https://raw.githubusercontent.com/Inochi2D/inochi2d/4975d247f9b946a74d18e0ba9b3e9475eb636efb/examples/empty08.inx',
  gitBlobSha: '2c7417a5233a328425f84f3e5da2106aaa19f18f',
  outputPath: resolve('dist/__fixtures__/empty08.inx'),
};

const REAL_RIG_FIXTURE = {
  source: 'Inochi2D/example-models@cd95dd00ddff63b1f7d2b84a19914c3c70d05945/Aka.inx',
  url: 'https://media.githubusercontent.com/media/Inochi2D/example-models/cd95dd00ddff63b1f7d2b84a19914c3c70d05945/Aka.inx',
  sha256: 'dbf82ffb86d1c761bca883ad37ec1c47487a447f8104290b459ce60aaee81e0f',
  byteLength: 17_731_911,
  rigSmokeOutputPath: resolve(
    'dist/__fixtures__/aka-rig-smoke.inx',
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

function nodeGuid(node) {
  if (
    typeof node !== 'object' ||
    node === null ||
    Array.isArray(node)
  ) {
    return null;
  }

  const value = node.guid ?? node.uuid;

  return typeof value === 'string' ||
    typeof value === 'number'
    ? String(value)
    : null;
}

function collectNodeIndex(root) {
  const entries = [];
  const byGuid = new Map();

  function visit(node, parent = null) {
    if (
      typeof node !== 'object' ||
      node === null ||
      Array.isArray(node)
    ) {
      return;
    }

    const entry = { node, parent };
    entries.push(entry);

    const guid = nodeGuid(node);

    if (guid !== null) {
      if (byGuid.has(guid)) {
        throw new Error(
          `Pinned official real rig contains duplicate node GUID ${guid}.`,
        );
      }

      byGuid.set(guid, entry);
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child, entry);
      }
    }
  }

  visit(root);
  return { entries, byGuid };
}

function collectReferencedNodes(value, byGuid) {
  const refs = new Set();
  const visited = new Set();

  function visit(current) {
    if (
      current === null ||
      current === undefined
    ) {
      return;
    }

    if (
      typeof current === 'string' ||
      typeof current === 'number'
    ) {
      const match = byGuid.get(String(current));

      if (match !== undefined) {
        refs.add(match);
      }

      return;
    }

    if (
      typeof current !== 'object' ||
      visited.has(current)
    ) {
      return;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item);
      }
      return;
    }

    for (const [childKey, childValue] of Object.entries(current)) {
      if (
        childKey === 'children' ||
        childKey === 'guid' ||
        childKey === 'uuid'
      ) {
        continue;
      }

      visit(childValue);
    }
  }

  visit(value);
  return refs;
}

function isRenderablePart(node) {
  if (
    typeof node !== 'object' ||
    node === null ||
    Array.isArray(node) ||
    node.type !== 'Part'
  ) {
    return false;
  }

  const mesh = node.mesh;

  return (
    typeof mesh === 'object' &&
    mesh !== null &&
    !Array.isArray(mesh) &&
    Array.isArray(mesh.verts) &&
    mesh.verts.length >= 6 &&
    Array.isArray(mesh.indices) &&
    mesh.indices.length >= 3
  );
}

function legacyParameterFromOfficial(parameter) {
  const isVec2 =
    parameter.is_vec2 === true ||
    parameter.type === '2d' ||
    (
      Array.isArray(parameter.min) &&
      parameter.min.length === 2
    );

  if (isVec2) {
    const min = Array.isArray(parameter.min)
      ? parameter.min
      : [-1, -1];
    const max = Array.isArray(parameter.max)
      ? parameter.max
      : [1, 1];
    const defaults = Array.isArray(parameter.defaults)
      ? parameter.defaults
      : [0, 0];
    const axisPoints = Array.isArray(parameter.axis_points)
      ? parameter.axis_points
      : [
          Array.isArray(parameter.hpoints)
            ? parameter.hpoints
            : [min[0], max[0]],
          Array.isArray(parameter.vpoints)
            ? parameter.vpoints
            : [min[1], max[1]],
        ];

    return {
      uuid: parameter.uuid ?? parameter.guid,
      name:
        typeof parameter.name === 'string'
          ? parameter.name
          : 'Official Parameter',
      is_vec2: true,
      min,
      max,
      defaults,
      axis_points: axisPoints,
      bindings: [],
    };
  }

  const min =
    typeof parameter.min === 'number'
      ? parameter.min
      : 0;
  const max =
    typeof parameter.max === 'number'
      ? parameter.max
      : 1;
  const defaults =
    typeof parameter.defaults === 'number'
      ? parameter.defaults
      : min;
  const axisPoints = Array.isArray(parameter.axis_points)
    ? parameter.axis_points
    : Array.isArray(parameter.points)
      ? parameter.points
      : [min, max];

  return {
    uuid: parameter.uuid ?? parameter.guid,
    name:
      typeof parameter.name === 'string'
        ? parameter.name
        : 'Official Parameter',
    is_vec2: false,
    min,
    max,
    defaults,
    axis_points:
      axisPoints.length >= 2
        ? axisPoints
        : [min, max],
    bindings: [],
  };
}

function reduceRealRigPayload(sourcePayload, emptyBytes) {
  const sourceRoot = sourcePayload.nodes;

  if (
    typeof sourceRoot !== 'object' ||
    sourceRoot === null ||
    Array.isArray(sourceRoot)
  ) {
    throw new Error(
      'Pinned official real rig has no root node object.',
    );
  }

  const { entries, byGuid } =
    collectNodeIndex(sourceRoot);
  const renderableEntries = entries.filter(({ node }) =>
    isRenderablePart(node),
  );
  const parameters = Array.isArray(sourcePayload.param)
    ? sourcePayload.param
    : [];

  if (renderableEntries.length === 0) {
    throw new Error(
      'Pinned official real rig contains no renderable Part node.',
    );
  }

  if (parameters.length === 0) {
    throw new Error(
      'Pinned official real rig contains no parameters.',
    );
  }

  let selectedPart = renderableEntries[0];
  let selectedParameter = parameters[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const parameter of parameters) {
    const refs = collectReferencedNodes(
      parameter,
      byGuid,
    );
    const linkedParts = renderableEntries.filter((entry) =>
      refs.has(entry),
    );

    if (
      linkedParts.length > 0 &&
      refs.size < bestScore
    ) {
      selectedPart = linkedParts[0];
      selectedParameter = parameter;
      bestScore = refs.size;
    }
  }

  const base = parseEmptyPayload(emptyBytes);
  const baseRoot = base.nodes;

  if (
    typeof baseRoot !== 'object' ||
    baseRoot === null ||
    Array.isArray(baseRoot)
  ) {
    throw new Error(
      'Pinned empty Inochi fixture has no root node object.',
    );
  }

  const sourcePart = selectedPart.node;
  const reducedPart = {
    uuid:
      sourcePart.uuid ??
      sourcePart.guid ??
      4200000001,
    name:
      typeof sourcePart.name === 'string'
        ? sourcePart.name
        : 'Official Aka Part',
    type: 'Part',
    enabled:
      typeof sourcePart.enabled === 'boolean'
        ? sourcePart.enabled
        : true,
    zsort:
      typeof sourcePart.zsort === 'number'
        ? sourcePart.zsort
        : 0,
    transform:
      typeof sourcePart.transform === 'object' &&
      sourcePart.transform !== null
        ? sourcePart.transform
        : {
            trans: [0, 0, 0],
            rot: [0, 0, 0],
            scale: [1, 1],
          },
    lockToRoot:
      sourcePart.lockToRoot === true,
    mesh: sourcePart.mesh,
    textures: Array.isArray(sourcePart.textures)
      ? sourcePart.textures
      : [],
    blend_mode:
      sourcePart.blend_mode ?? 0,
    tint: Array.isArray(sourcePart.tint)
      ? sourcePart.tint
      : [1, 1, 1],
    screenTint: Array.isArray(sourcePart.screenTint)
      ? sourcePart.screenTint
      : [0, 0, 0],
    emissionStrength:
      typeof sourcePart.emissionStrength === 'number'
        ? sourcePart.emissionStrength
        : 1,
    opacity:
      typeof sourcePart.opacity === 'number'
        ? sourcePart.opacity
        : 1,
    children: [],
  };

  base.meta = {
    ...(base.meta ?? {}),
    ...(sourcePayload.meta ?? {}),
  };
  baseRoot.children = [reducedPart];
  base.param = [
    legacyParameterFromOfficial(selectedParameter),
  ];
  delete base.animation;
  delete base.animations;

  return {
    payload: base,
    sourceNodeCount: entries.length,
    selectedNodeCount: 2,
    sourceParameterCount: parameters.length,
    selectedParameterName:
      typeof selectedParameter.name === 'string'
        ? selectedParameter.name
        : '',
    selectedPartName:
      typeof sourcePart.name === 'string'
        ? sourcePart.name
        : '',
  };
}

function createRealRigSmokeFixture(sourceBytes, emptyBytes) {
  if (readInp1Tag(sourceBytes, 0) !== 'TRNSRTS\0') {
    throw new Error(
      'Pinned official real-rig fixture is not an INP1 container.',
    );
  }

  const payloadLength = readUint32be(sourceBytes, 8);
  const payloadStart = 12;
  const textureSectionOffset = payloadStart + payloadLength;
  const sourcePayload = JSON.parse(
    new TextDecoder().decode(
      sourceBytes.subarray(
        payloadStart,
        textureSectionOffset,
      ),
    ),
  );
  const reduced = reduceRealRigPayload(sourcePayload, emptyBytes);
  const reducedPayloadBytes = new TextEncoder().encode(
    JSON.stringify(reduced.payload),
  );

  if (
    readInp1Tag(sourceBytes, textureSectionOffset) !==
    'TEX_SECT'
  ) {
    throw new Error(
      'Pinned official real-rig fixture does not expose the expected INP1 texture section after its payload.',
    );
  }

  let offset = textureSectionOffset + 8;
  const textureCount = readUint32be(sourceBytes, offset);
  offset += 4;

  if (textureCount === 0) {
    throw new Error(
      'Pinned official real-rig fixture unexpectedly contains no textures.',
    );
  }

  const replacementTexture = createTinyTga();
  const replacementParts = [
    new TextEncoder().encode('TRNSRTS\0'),
    uint32be(reducedPayloadBytes.byteLength),
    reducedPayloadBytes,
    new TextEncoder().encode('TEX_SECT'),
    uint32be(textureCount),
  ];
  let originalTextureBytes = 0;

  for (let index = 0; index < textureCount; index += 1) {
    const dataLength = readUint32be(sourceBytes, offset);
    offset += 4;

    if (offset >= sourceBytes.byteLength) {
      throw new Error(
        `Pinned real-rig texture ${String(index)} is missing its encoding byte.`,
      );
    }

    offset += 1;
    const dataEnd = offset + dataLength;

    if (dataEnd > sourceBytes.byteLength) {
      throw new Error(
        `Pinned real-rig texture ${String(index)} exceeds fixture bounds.`,
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

  const suffix = sourceBytes.subarray(offset);

  if (
    suffix.byteLength > 0 &&
    readInp1Tag(suffix, 0) !== 'EXT_SECT'
  ) {
    throw new Error(
      'Pinned official real-rig fixture has an unexpected section after TEX_SECT.',
    );
  }

  return {
    bytes: concatBytes(...replacementParts, suffix),
    textureCount,
    originalTextureBytes,
    payloadLength,
    reducedPayloadLength: reducedPayloadBytes.byteLength,
    sourceNodeCount: reduced.sourceNodeCount,
    selectedNodeCount: reduced.selectedNodeCount,
    sourceParameterCount: reduced.sourceParameterCount,
    selectedParameterName: reduced.selectedParameterName,
    selectedPartName: reduced.selectedPartName,
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

async function fetchPinnedSha256Fixture(fixture, label) {
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

  if (bytes.byteLength !== fixture.byteLength) {
    throw new Error(
      `Inochi2D ${label} fixture size mismatch: expected ${String(fixture.byteLength)}, received ${String(bytes.byteLength)}.`,
    );
  }

  const digest = createHash('sha256')
    .update(bytes)
    .digest('hex');

  if (digest !== fixture.sha256) {
    throw new Error(
      `Inochi2D ${label} fixture SHA-256 mismatch: expected ${fixture.sha256}, received ${digest}.`,
    );
  }

  return bytes;
}

async function main() {
  const [emptyBytes, realRigBytes] = await Promise.all([
    fetchPinnedFixture(EMPTY_FIXTURE, 'empty'),
    fetchPinnedSha256Fixture(
      REAL_RIG_FIXTURE,
      'official Aka real rig',
    ),
  ]);
  const meshBytes = createInp1VisualFixture(
    emptyBytes,
    false,
  );
  const visualBytes = createInp1VisualFixture(
    emptyBytes,
    true,
  );
  const realRigSmoke =
    createRealRigSmokeFixture(realRigBytes, emptyBytes);

  await mkdir(dirname(EMPTY_FIXTURE.outputPath), {
    recursive: true,
  });
  await writeFile(EMPTY_FIXTURE.outputPath, emptyBytes);
  await writeFile(
    REAL_RIG_FIXTURE.rigSmokeOutputPath,
    realRigSmoke.bytes,
  );
  await writeFile(MESH_FIXTURE_PATH, meshBytes);
  await writeFile(VISUAL_FIXTURE_PATH, visualBytes);

  process.stdout.write(
    [
      `Prepared pinned Inochi2D empty fixture (${String(emptyBytes.byteLength)} bytes)`,
      `pinned official Aka real rig (${String(realRigBytes.byteLength)} bytes; ${REAL_RIG_FIXTURE.source})`,
      `Aka rig-smoke fixture (${String(realRigSmoke.bytes.byteLength)} bytes; payload ${String(realRigSmoke.payloadLength)} -> ${String(realRigSmoke.reducedPayloadLength)} bytes; nodes ${String(realRigSmoke.sourceNodeCount)} -> ${String(realRigSmoke.selectedNodeCount)}; parameter ${realRigSmoke.selectedParameterName}; part ${realRigSmoke.selectedPartName}; ${String(realRigSmoke.textureCount)} texture slots normalized from ${String(realRigSmoke.originalTextureBytes)} source texture bytes)`,
      `generated mesh-only fixture (${String(meshBytes.byteLength)} bytes)`,
      `and TGA-backed visual fixture (${String(visualBytes.byteLength)} bytes).\n`,
    ].join(', '),
  );

  if (process.env.CI === 'true') {
    process.stdout.write(
      `OFFICIAL_RIG_DIAGNOSTIC ${new TextDecoder().decode(
        realRigSmoke.bytes.subarray(
          12,
          12 + readUint32be(realRigSmoke.bytes, 8),
        ),
      )}\n`,
    );
    throw new Error(
      'Temporary official-rig diagnostic stop before browser installation.',
    );
  }
}

await main();
