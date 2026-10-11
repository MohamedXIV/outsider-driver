import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import {
  CompiledCityMeshSchema,
  type CompiledCityMesh,
} from '../../content/presentation/CompiledCityMesh';
import type { TaxiSceneDefinition } from '../../content/presentation/TaxiSceneDefinition';
import { applyLocalTransform } from './applyLocalTransform';

type AuthoredModel = NonNullable<TaxiSceneDefinition['models']>[number];
type ReadCompiledModel = (path: string) => Promise<CompiledCityMesh>;

async function fetchCompiledModel(path: string): Promise<CompiledCityMesh> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`City asset fetch failed: ${path} (${String(response.status)})`);
  const value: unknown = await response.json();
  return CompiledCityMeshSchema.parse(value);
}

/**
 * Instantiates lightweight build-compiled geometry from the SAME versioned
 * source that emits the authoring GLB. This is intentionally not a general
 * runtime glTF decoder: the full official glTF loader would exceed the game's
 * existing lazy chunk and total JavaScript budgets.
 *
 * The scene owns all meshes, textures and materials; disposed scenes discard
 * in-flight fetches without leaking assets into a subsequent taxi scene.
 */
export async function loadTaxiCityModels(
  scene: Scene,
  worldRoot: TransformNode,
  models: readonly AuthoredModel[],
  readModel: ReadCompiledModel = fetchCompiledModel,
): Promise<void> {
  if (models.length === 0) return;
  let disposed = false;
  const isCancelled = (): boolean => disposed;
  scene.onDisposeObservable.add(() => { disposed = true; });

  // Allow immediately replaced NullEngine scenes to dispose before a network
  // request; real production loading continues on the next microtask.
  await Promise.resolve();
  if (isCancelled()) return;

  const groups = new Map<string, AuthoredModel[]>();
  for (const model of models) {
    const group = groups.get(model.src) ?? [];
    group.push(model);
    groups.set(model.src, group);
  }

  for (const [sourcePath, references] of groups) {
    if (isCancelled()) return;
    // Every .render.json file is emitted by the same generator as its .glb.
    const dataPath = sourcePath.replace(/\.glb$/, '.render.json');
    let compiled: CompiledCityMesh;
    try {
      compiled = CompiledCityMeshSchema.parse(await readModel(dataPath));
    } catch (error) {
      if (isCancelled()) return;
      throw error;
    }
    if (isCancelled()) return;

    const painted = new Texture(compiled.paintedTexture, scene);
    const materials = compiled.materials.map((source, index) => {
      const mat = new StandardMaterial(`city-${compiled.id}-mat-${String(index)}`, scene);
      mat.diffuseColor = new Color3(...source.color);
      mat.specularColor = Color3.Black();
      if (index === 0) {
        mat.diffuseTexture = painted;
        mat.emissiveColor = new Color3(0.065, 0.072, 0.055);
      } else {
        mat.emissiveColor = new Color3(0.03, 0.04, 0.036);
      }
      return mat;
    });

    const originals: Mesh[] = [];
    for (const [index, model] of references.entries()) {
      if (isCancelled()) return;
      const mount = new TransformNode(`taxi-model-${model.id}`, scene);
      mount.parent = worldRoot;
      applyLocalTransform(mount, model.transform);
      for (const [partIndex, part] of compiled.parts.entries()) {
        const name = `taxi-model-${model.id}-${part.name}`;
        let mesh;
        if (index === 0) {
          mesh = new Mesh(name, scene);
          const data = new VertexData();
          data.positions = part.positions;
          data.normals = part.normals;
          data.uvs = part.uvs;
          data.indices = part.indices;
          data.applyToMesh(mesh);
          mesh.material = materials[part.material] ?? null;
          originals.push(mesh);
        } else {
          const original = originals[partIndex];
          if (original === undefined) throw new Error('City asset mesh source missing');
          mesh = original.createInstance(name);
        }
        mesh.parent = mount;
      }
    }
  }
}
