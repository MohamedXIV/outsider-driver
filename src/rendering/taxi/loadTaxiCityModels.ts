import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { TaxiSceneDefinition } from '../../content/presentation/TaxiSceneDefinition';
import { applyLocalTransform } from './applyLocalTransform';

type AuthoredModel = NonNullable<TaxiSceneDefinition['models']>[number];

/**
 * One official Babylon glTF decode per source file; reuse its mesh/material
 * data through instantiation. The scene owns every imported container and root.
 * An old scene may be disposed before a network fetch finishes.
 */
export async function loadTaxiCityModels(
  scene: Scene,
  worldRoot: TransformNode,
  models: readonly AuthoredModel[],
  loadContainer: (path: string, scene: Scene) => Promise<AssetContainer> = LoadAssetContainerAsync,
): Promise<void> {
  if (models.length === 0) return;

  const abort = new AbortController();
  const containers: AssetContainer[] = [];
  scene.onDisposeObservable.add(() => {
    abort.abort();
    for (const container of containers) container.dispose();
    containers.length = 0;
  });

  // Import only when authored GLBs are present: preserve small initial entry.
  await import('@babylonjs/loaders/glTF');
  if (abort.signal.aborted) return;

  const grouped = new Map<string, AuthoredModel[]>();
  for (const model of models) {
    const group = grouped.get(model.src) ?? [];
    group.push(model);
    grouped.set(model.src, group);
  }

  for (const [url, references] of grouped) {
    if (abort.signal.aborted) return;
    let source: AssetContainer;
    try {
      // Absolute and allowlisted URLs come from the Zod scene contract.
      source = await loadContainer(url, scene);
    } catch (error) {
      // Disposing the taxi while fetching must not emit a stale-scene failure.
      if (abort.signal.aborted) return;
      throw error;
    }
    if (abort.signal.aborted) {
      source.dispose();
      return;
    }
    containers.push(source);

    for (const model of references) {
      if (abort.signal.aborted) return;
      const mount = new TransformNode(`taxi-model-${model.id}`, scene);
      mount.parent = worldRoot;
      applyLocalTransform(mount, model.transform);

      const imported = source.instantiateModelsToScene(
        (sourceName) => `taxi-model-${model.id}-${sourceName}`,
        false,
        { doNotInstantiate: false },
      );
      for (const root of imported.rootNodes) root.parent = mount;
    }
  }
}
