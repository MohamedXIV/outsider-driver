import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
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
): Promise<void> {
  if (models.length === 0) return;

  let cancelled = false;
  const containers: AssetContainer[] = [];
  scene.onDisposeObservable.add(() => {
    cancelled = true;
    for (const container of containers) container.dispose();
    containers.length = 0;
  });

  // Import only when authored GLBs are present: preserve small initial entry.
  await import('@babylonjs/loaders/glTF');
  if (cancelled) return;

  const grouped = new Map<string, AuthoredModel[]>();
  for (const model of models) {
    const group = grouped.get(model.src) ?? [];
    group.push(model);
    grouped.set(model.src, group);
  }

  for (const [url, references] of grouped) {
    if (cancelled) return;
    let source: AssetContainer;
    try {
      // Absolute and allowlisted URLs come from the Zod scene contract.
      source = await SceneLoader.LoadAssetContainerAsync('/', url.slice(1), scene);
    } catch (error) {
      // Disposing the taxi while fetching must not emit a stale-scene failure.
      if (cancelled) return;
      throw error;
    }
    if (cancelled) {
      source.dispose();
      return;
    }
    containers.push(source);

    for (const model of references) {
      if (cancelled) return;
      const mount = new TransformNode(`taxi-model-${model.id}`, scene);
      mount.parent = worldRoot;
      applyLocalTransform(mount, model.transform);

      const imported = source.instantiateModelsToScene(
        (sourceName) => `taxi-model-${model.id}-${sourceName}`,
        false,
      );
      for (const root of imported.rootNodes) root.parent = mount;
    }
  }
}
