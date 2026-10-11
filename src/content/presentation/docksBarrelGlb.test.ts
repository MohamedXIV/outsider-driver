import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
});
