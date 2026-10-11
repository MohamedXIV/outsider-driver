/**
 * Outsider Driver first source-owned GLB: low-poly curved Docks barrel terminal.
 * Generates a valid self-contained glTF 2.0 binary with embedded painted PNG.
 * No randomness, external services, or additional npm dependencies.
 */
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const TAU = 2 * Math.PI;
const SEGMENTS = 20;
const LENGTH = 12.4;
const WIDTH = 2.95;
const HEIGHT = 2.8;
const CENTER_Y = 2.85;
const PATH = resolve('public/city/docks-barrel-terminal.glb');

function pngChunk(name, data) {
  const src = Buffer.concat([Buffer.from(name, 'ascii'), data]);
  let crc = 0xffffffff;
  for (const octet of src) {
    crc ^= octet;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([head, src, tail]);
}
function paintedPng() {
  // One editable image recipe serves BOTH the glTF 2.0 texture and Babylon's
  // optimized runtime projection. Hand-painted directional CEL bands are baked
  // into the albedo, not computed by a city-wide shader or dynamic shadow maps.
  const w = 256;
  const h = 256;
  const data = Buffer.alloc(h * (w * 4 + 1));
  const palette = [
    [224, 210, 174], // facing warm light
    [194, 193, 165], // neutral illustrated midtone
    [153, 174, 164], // cool muted shadow
  ];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pixel = y * (w * 4 + 1) + 1 + x * 4;
      const base = palette[x < 77 ? 0 : x < 184 ? 1 : 2];
      // Low-frequency handpainted brushwork, with sparse flecks rather than
      // high-frequency noise/dithering that would shimmer from the taxi.
      const paint = (Math.floor(x / 8) * 13 + Math.floor(y / 9) * 19 +
        Math.floor(x / 29) * Math.floor(y / 25) * 7) % 19 - 9;
      const pigment = Math.trunc(paint * 0.78);
      const wear = y > 225 ? -14 : y < 17 ? 8 : 0;
      const seam = (x % 64 <= 2 || y % 64 <= 2) ? -32 : 0;
      const rivetX = x % 64, rivetY = y % 64;
      const rivet = rivetX > 6 && rivetX < 12 && rivetY > 6 && rivetY < 12
        ? -34 : 0;
      // Glazed oval cargo windows: strongly painted shapes at screen-scale,
      // with an inked border and tiny amber practical light. No extra meshes.
      let windowColor;
      const centerX = [44, 127, 209];
      const centerY = [86, 171];
      for (const cx of centerX) {
        for (const cy of centerY) {
          const d = ((x - cx) / 20) ** 2 + ((y - cy) / 12) ** 2;
          if (d <= 1.55 && d >= 1) windowColor = [51, 77, 75];
          else if (d < 1) {
            const lit = x < cx - 4 && y < cy;
            windowColor = lit ? [218, 159, 93] : [53, 112, 116];
          }
        }
      }
      const value = windowColor ?? [
        base[0] + pigment + wear + seam + rivet,
        base[1] + pigment + wear + seam + rivet,
        base[2] + pigment + wear + seam + rivet,
      ];
      for (let channel = 0; channel < 3; channel++) {
        data[pixel + channel] = Math.max(0, Math.min(255, value[channel]));
      }
      data[pixel + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(data, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
function part(name, material) {
  return { name, material, p: [], n: [], uv: [], triangles: [] };
}
function vertex(mesh, pos, normal, uv) {
  const idx = mesh.p.length / 3;
  mesh.p.push(...pos);
  mesh.n.push(...normal);
  mesh.uv.push(...uv);
  return idx;
}
function cylinder(name, material, rx, ry, fromZ, toZ) {
  const m = part(name, material);
  const rings = 4;
  for (let j = 0; j <= rings; j++) {
    const z = fromZ + (toZ - fromZ) * j / rings;
    for (let i = 0; i <= SEGMENTS; i++) {
      const a = i * TAU / SEGMENTS;
      const cx = Math.cos(a), sy = Math.sin(a);
      const nx = cx / rx, ny = sy / ry, l = Math.hypot(nx, ny);
      vertex(m, [rx * cx, CENTER_Y + ry * sy, z], [nx / l, ny / l, 0], [i / SEGMENTS, j / rings]);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < SEGMENTS; i++) {
      const a = j * (SEGMENTS + 1) + i, b = a + SEGMENTS + 1;
      m.triangles.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return m;
}
function face(name, material, z, rx, ry, centerY, front) {
  const m = part(name, material);
  const nz = front ? 1 : -1;
  const c = vertex(m, [0, centerY, z], [0, 0, nz], [0.5, 0.5]);
  const ring = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const a = i * TAU / SEGMENTS, cx = Math.cos(a), sy = Math.sin(a);
    ring.push(vertex(m, [rx * cx, centerY + ry * sy, z], [0, 0, nz], [0.5 + 0.48 * cx, 0.5 + 0.48 * sy]));
  }
  for (let i = 0; i < SEGMENTS; i++) {
    m.triangles.push(front ? c : ring[i + 1], front ? ring[i] : ring[i], front ? ring[i + 1] : c);
  }
  return m;
}
function buildBinary(parts, image) {
  const pieces = [];
  const views = [];
  const accessors = [];
  let bytes = 0;
  function append(buffer, target) {
    const pad = (4 - bytes % 4) % 4;
    if (pad) { pieces.push(Buffer.alloc(pad)); bytes += pad; }
    const index = views.length;
    views.push({ buffer: 0, byteOffset: bytes, byteLength: buffer.length, ...(target ? { target } : {}) });
    pieces.push(buffer); bytes += buffer.length;
    return index;
  }
  function attribute(array, stride, type) {
    const view = append(Buffer.from(new Float32Array(array).buffer), 34962);
    const min = Array(stride).fill(Infinity), max = Array(stride).fill(-Infinity);
    for (let i = 0; i < array.length; i += stride) {
      for (let j = 0; j < stride; j++) {
        min[j] = Math.min(min[j], array[i + j]);
        max[j] = Math.max(max[j], array[i + j]);
      }
    }
    const result = accessors.length;
    accessors.push({ bufferView: view, componentType: 5126, count: array.length / stride, type, min, max });
    return result;
  }
  const primitives = [];
  for (const mesh of parts) {
    const POSITION = attribute(mesh.p, 3, 'VEC3');
    const NORMAL = attribute(mesh.n, 3, 'VEC3');
    const TEXCOORD_0 = attribute(mesh.uv, 2, 'VEC2');
    const idx = append(Buffer.from(new Uint16Array(mesh.triangles).buffer), 34963);
    const ia = accessors.length;
    accessors.push({ bufferView: idx, componentType: 5123, count: mesh.triangles.length, type: 'SCALAR' });
    primitives.push({ attributes: { POSITION, NORMAL, TEXCOORD_0 }, indices: ia, material: mesh.material, mode: 4, extras: { partName: mesh.name } });
  }
  const imageView = append(image);
  const binPad = (4 - bytes % 4) % 4;
  if (binPad) pieces.push(Buffer.alloc(binPad));
  const bin = Buffer.concat(pieces);
  const gltf = {
    asset: { version: '2.0', generator: 'Outsider Driver source-owned Docks asset v0.1' },
    scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'bld_ind_barrel_terminal' }],
    meshes: [{ name: 'bld_ind_barrel_terminal', primitives }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: views, accessors,
    images: [{ mimeType: 'image/png', bufferView: imageView, name: 'painted_enamel' }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    textures: [{ sampler: 0, source: 0 }],
    materials: [
      { name: 'painted_enamel', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 }, doubleSided: true },
      { name: 'teal_trim', pbrMetallicRoughness: { baseColorFactor: [0.35,0.58,0.55,1], metallicFactor: 0, roughnessFactor: 1 } },
      { name: 'cargo_aperture', pbrMetallicRoughness: { baseColorFactor: [0.15,0.24,0.29,1], metallicFactor: 0, roughnessFactor: 1 } },
    ],
  };
  const raw = Buffer.from(JSON.stringify(gltf), 'utf8');
  const json = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 32)]);
  const out = Buffer.alloc(12 + 8 + json.length + 8 + bin.length);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(json.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  json.copy(out, 20);
  out.writeUInt32LE(bin.length, 20 + json.length);
  out.writeUInt32LE(0x004e4942, 24 + json.length);
  bin.copy(out, 28 + json.length);
  return out;
}
function authoredParts() {
  return [
    cylinder('painted_barrel', 0, WIDTH, HEIGHT, -LENGTH/2, LENGTH/2),
    face('front_bulkhead', 0, LENGTH/2, WIDTH, HEIGHT, CENTER_Y, true),
    face('rear_bulkhead', 0, -LENGTH/2, WIDTH, HEIGHT, CENTER_Y, false),
    cylinder('front_trim', 1, WIDTH*1.035, HEIGHT*1.035, LENGTH/2-0.36, LENGTH/2-0.16),
    cylinder('rear_trim', 1, WIDTH*1.035, HEIGHT*1.035, -LENGTH/2+0.16, -LENGTH/2+0.36),
    face('freight_aperture', 2, LENGTH/2+0.028, 1.35, 1.55, 1.65, true),
  ];
}

export function buildDocksBarrelTerminalGlb() {
  return buildBinary(authoredParts(), paintedPng());
}

/**
 * Optimized Babylon runtime representation from the EXACT same authoring
 * source as the GLB. It is not a general glTF decoder; never parse arbitrary
 * external GLBs on the client. Complex artist-supplied GLBs need an approved
 * build-time conversion pipeline before being used in the city.
 */
export function buildDocksBarrelRuntimeData() {
  return {
    schemaVersion: 1,
    id: 'bld_ind_barrel_terminal',
    paintedTexture: '/city/docks-enamel.png',
    materials: [
      { id: 'painted_enamel', color: [1, 1, 1] },
      { id: 'teal_trim', color: [0.45, 0.74, 0.7] },
      { id: 'cargo_aperture', color: [0.2, 0.34, 0.39] },
    ],
    parts: authoredParts().map((mesh) => ({
      name: mesh.name,
      material: mesh.material,
      positions: mesh.p,
      normals: mesh.n,
      uvs: mesh.uv,
      indices: mesh.triangles,
    })),
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const binary = buildDocksBarrelTerminalGlb();
  const runtime = JSON.stringify(buildDocksBarrelRuntimeData());
  await mkdir(dirname(PATH), { recursive: true });
  await Promise.all([
    writeFile(PATH, binary),
    writeFile(resolve('public/city/docks-barrel-terminal.render.json'), runtime),
    writeFile(resolve('public/city/docks-enamel.png'), paintedPng()),
  ]);
  process.stdout.write('Built source GLB + compact Babylon runtime mesh (' +
    String(binary.length) + ' GLB bytes; SHA256=' +
    createHash('sha256').update(binary).digest('hex') + ')\n');
}
