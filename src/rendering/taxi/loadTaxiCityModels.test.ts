import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it, vi } from 'vitest';
import type { CompiledCityMesh } from '../../content/presentation/CompiledCityMesh';
import { createDocksRouteModels } from '../../content/presentation/docksRouteScenery';
import { loadTaxiCityModels } from './loadTaxiCityModels';

const mockModel: CompiledCityMesh = {
  schemaVersion: 1,
  id: 'bld_ind_barrel_terminal',
  paintedTexture: '/city/docks-enamel.png',
  materials: [{ id: 'painted_enamel', color: [1, 1, 1] }],
  parts: [{
    name: 'test_triangle',
    material: 0,
    positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    uvs: [0, 0, 1, 0, 0, 1],
    indices: [0, 1, 2],
  }],
};

describe('loadTaxiCityModels', () => {
  it('fetches compiled source once, instances four GLB-derived meshes, and retains worldRoot ownership', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const world = new TransformNode('test-world-root', scene);
    const read = vi.fn(() => Promise.resolve(mockModel));
    try {
      const models = createDocksRouteModels();
      await loadTaxiCityModels(scene, world, models, read);
      expect(read).toHaveBeenCalledTimes(1);
      expect(read).toHaveBeenCalledWith('/city/docks-barrel-terminal.render.json');
      for (const [i, model] of models.entries()) {
        const mount = scene.getTransformNodeByName(`taxi-model-${model.id}`);
        const mesh = scene.getMeshByName(`taxi-model-${model.id}-test_triangle`);
        expect(mount?.parent).toBe(world);
        expect(mount?.position.asArray()).toEqual(model.transform.position);
        expect(mesh?.parent).toBe(mount);
        expect(mesh?.getClassName()).toBe(i === 0 ? 'Mesh' : 'InstancedMesh');
      }
      scene.dispose();
      expect(engine.scenes).toHaveLength(0);
    } finally {
      if (!scene.isDisposed) scene.dispose();
      engine.dispose();
    }
  });

  it('does not mount a late decoded mesh into a disposed scene', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const world = new TransformNode('test-world-root', scene);
    let finish: ((value: CompiledCityMesh) => void) | undefined;
    const pending = new Promise<CompiledCityMesh>((resolve) => { finish = resolve; });
    const read = vi.fn(() => pending);
    try {
      const loading = loadTaxiCityModels(scene, world, createDocksRouteModels(), read);
      await vi.waitFor(() => { expect(read).toHaveBeenCalledTimes(1); }, { timeout: 5_000 });
      scene.dispose();
      if (finish === undefined) throw new Error('Source read was not requested');
      finish(mockModel);
      await expect(loading).resolves.toBeUndefined();
      expect(engine.scenes).toHaveLength(0);
    } finally {
      if (!scene.isDisposed) scene.dispose();
      engine.dispose();
    }
  });
});
