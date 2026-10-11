import { AssetContainer, InstantiatedEntries } from '@babylonjs/core/assetContainer';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';

import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocksRouteModels } from '../../content/presentation/docksRouteScenery';
import { loadTaxiCityModels } from './loadTaxiCityModels';

afterEach(() => vi.restoreAllMocks());

describe('loadTaxiCityModels', () => {
  it('loads a shared GLB once, parents all instances into worldRoot, and disposes the container', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const root = new TransformNode('test-world-root', scene);
    const container = new AssetContainer(scene);
    const dispose = vi.spyOn(container, 'dispose');
    const imported = vi.spyOn(container, 'instantiateModelsToScene')
      .mockImplementation(() => {
        const node = new TransformNode('test-import', scene);
        const entries = new InstantiatedEntries();
        entries.rootNodes.push(node);
        return entries;
      });
    const load = vi.fn(() => Promise.resolve(container));
    try {
      const models = createDocksRouteModels();
      await loadTaxiCityModels(scene, root, models, load);
      expect(load).toHaveBeenCalledTimes(1);
      expect(imported).toHaveBeenCalledTimes(models.length);
      for (const model of models) {
        const mount = scene.getTransformNodeByName(`taxi-model-${model.id}`);
        expect(mount?.parent).toBe(root);
        expect(mount?.position.asArray()).toEqual(model.transform.position);
        expect(mount?.getChildren()).toHaveLength(1);
      }
      scene.dispose();
      expect(dispose).toHaveBeenCalled();
    } finally {
      if (!scene.isDisposed) scene.dispose();
      engine.dispose();
    }
  });

  it('discards an in-flight import when the taxi scene is replaced', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const root = new TransformNode('test-world-root', scene);
    const container = new AssetContainer(scene);
    const dispose = vi.spyOn(container, 'dispose');
    let finish: ((container: AssetContainer) => void) | undefined;
    const pending = new Promise<AssetContainer>((resolve) => {
      finish = resolve;
    });
    const load = vi.fn(() => pending);
    try {
      const loading = loadTaxiCityModels(scene, root, createDocksRouteModels(), load);
      await vi.waitFor(() => { expect(load).toHaveBeenCalled(); }, { timeout: 10_000 });
      scene.dispose();
      if (finish === undefined) throw new Error('GLB request was not created');
      finish(container);
      await expect(loading).resolves.toBeUndefined();
      expect(dispose).toHaveBeenCalled();
    } finally {
      if (!scene.isDisposed) scene.dispose();
      engine.dispose();
    }
  });
});
