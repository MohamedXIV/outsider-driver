import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { CompiledCityMeshSchema } from './CompiledCityMesh';

const binaryPath = new URL('../../../public/city/docks-barrel-terminal.glb', import.meta.url);
const builderScript = new URL('../../../scripts/build-docks-barrel-glb.mjs', import.meta.url);

function buildAndRead(): Buffer {
  const output = spawnSync(process.execPath, [builderScript.pathname], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (output.status !== 0) {
    throw new Error(output.stderr || output.stdout || 'GLB build failed');
  }
  return readFileSync(binaryPath);
}

function decodeGlb(glb: Buffer): { json: Record<string, unknown>; bin: Buffer } {
  expect(glb.readUInt32LE(0)).toBe(0x46546c67);
  expect(glb.readUInt32LE(4)).toBe(2);
  expect(glb.readUInt32LE(8)).toBe(glb.length);
  const jsonSize = glb.readUInt32LE(12);
  expect(glb.readUInt32LE(16)).toBe(0x4e4f534a);
  const binHeader = 20 + jsonSize;
  const binSize = glb.readUInt32LE(binHeader);
  expect(glb.readUInt32LE(binHeader + 4)).toBe(0x004e4942);
  expect(glb.length).toBe(binHeader + 8 + binSize);
  const json: unknown = JSON.parse(glb.subarray(20, binHeader).toString('utf8'));
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new Error('GLB metadata is not an object');
  }
  return { json: json as Record<string, unknown>, bin: glb.subarray(binHeader + 8) };
}

describe('source-owned Docks barrel GLB asset', () => {
  it('produces byte-identical self-contained GLB using only repository source', () => {
    const first = buildAndRead();
    const second = buildAndRead();
    expect(createHash('sha256').update(first).digest('hex')).toBe(
      createHash('sha256').update(second).digest('hex'),
    );
    expect(first.length).toBeGreaterThan(2000);
    expect(first.length).toBeLessThan(100_000);
  });

  it('encodes the named 3D model, closed curved shell, embedded painted PNG, and typed triangle buffers', () => {
    const { json, bin } = decodeGlb(buildAndRead());
    expect(json.asset).toMatchObject({ version: '2.0' });
    expect(json.nodes).toEqual([{ mesh: 0, name: 'bld_ind_barrel_terminal' }]);
    const meshes = json.meshes as { name: string; primitives: {
      attributes: { POSITION: number; NORMAL: number; TEXCOORD_0: number };
      indices: number; material: number; mode: number;
    }[] }[];
    const views = json.bufferViews as { byteOffset: number; byteLength: number }[];
    const accessors = json.accessors as { bufferView: number; count: number; componentType: number; type: string }[];
    const images = json.images as { mimeType: string; bufferView: number }[];
    const materials = json.materials as { name: string }[];
    expect(meshes[0]?.name).toBe('bld_ind_barrel_terminal');
    expect(meshes[0]?.primitives).toHaveLength(6);
    expect(materials.map((m) => m.name)).toEqual([
      'painted_enamel', 'teal_trim', 'cargo_aperture',
    ]);
    expect(images).toHaveLength(1);
    expect(images[0]?.mimeType).toBe('image/png');
    const imgView = views[images[0]?.bufferView ?? -1];
    if (imgView === undefined) throw new Error('Missing embedded texture buffer');
    expect(bin.subarray(imgView.byteOffset, imgView.byteOffset + 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    for (const primitive of meshes[0]?.primitives ?? []) {
      expect(primitive.mode).toBe(4);
      expect(primitive.material).toBeGreaterThanOrEqual(0);
      expect(primitive.material).toBeLessThan(materials.length);
      const p = accessors[primitive.attributes.POSITION];
      const n = accessors[primitive.attributes.NORMAL];
      const uv = accessors[primitive.attributes.TEXCOORD_0];
      const tri = accessors[primitive.indices];
      if (p === undefined || n === undefined || uv === undefined || tri === undefined) {
        throw new Error('Missing geometry accessor');
      }
      expect(p.type).toBe('VEC3');
      expect(n.count).toBe(p.count);
      expect(uv.count).toBe(p.count);
      expect(tri.count % 3).toBe(0);
      expect(tri.componentType).toBe(5123);
      for (const accessor of [p, n, uv, tri]) {
        const view = views[accessor.bufferView];
        if (view === undefined) throw new Error('Unbound bufferView');
        expect(view.byteOffset + view.byteLength).toBeLessThanOrEqual(bin.length);
      }
      const trianglesView = views[tri.bufferView];
      if (trianglesView === undefined) throw new Error('Missing indices buffer');
      for (let i = 0; i < tri.count; i++) {
        expect(bin.readUInt16LE(trianglesView.byteOffset + i * 2)).toBeLessThan(p.count);
      }
    }
  });
  it('paints three discrete warm-to-cool cel bands, outlined alien glazing and structural seams in the shared PNG', () => {
    buildAndRead();
    const png = readFileSync(new URL('../../../public/city/docks-enamel.png', import.meta.url));
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    expect([width, height]).toEqual([128, 128]);
    const idatBytes = png.readUInt32BE(33);
    expect(png.subarray(37, 41).toString('ascii')).toBe('IDAT');
    const raw = inflateSync(png.subarray(41, 41 + idatBytes));
    expect(raw.length).toBe(height * (width * 4 + 1));
    const pixel = (x: number, y: number): [number, number, number] => {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      expect(raw[y * (width * 4 + 1)]).toBe(0); // unfiltered PNG row
      return [raw[offset] ?? 0, raw[offset + 1] ?? 0, raw[offset + 2] ?? 0];
    };
    const warm = pixel(10, 14);
    const cool = pixel(120, 14);
    const window = pixel(22, 43);
    const wall = pixel(22, 55);
    expect(warm[0] - cool[0]).toBeGreaterThan(45);
    expect(window[1]).toBeLessThan(wall[1] - 35);
    expect(pixel(32, 22)[0]).toBeLessThan(pixel(35, 22)[0] - 15);
  });

  it('projects the same source into strictly validated lightweight Babylon geometry and texture', () => {
    buildAndRead();
    const compiledText = readFileSync(
      new URL('../../../public/city/docks-barrel-terminal.render.json', import.meta.url),
      'utf8',
    );
    const data: unknown = JSON.parse(compiledText);
    const compiled = CompiledCityMeshSchema.parse(data);
    expect(compiled.schemaVersion).toBe(1);
    expect(compiled.id).toBe('bld_ind_barrel_terminal');
    expect(compiled.parts).toHaveLength(6);
    expect(compiled.parts.map((part) => part.name)).toEqual([
      'painted_barrel', 'front_bulkhead', 'rear_bulkhead',
      'front_trim', 'rear_trim', 'freight_aperture',
    ]);
    const png = readFileSync(new URL('../../../public/city/docks-enamel.png', import.meta.url));
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(compiled.paintedTexture).toBe('/city/docks-enamel.png');
  });

});
