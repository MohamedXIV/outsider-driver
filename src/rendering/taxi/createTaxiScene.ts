import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/instancedMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import {
  TaxiSceneDefinitionSchema,
  type TaxiSceneDefinition,
} from '../../content/presentation/TaxiSceneDefinition';
import { applyLocalTransform } from './applyLocalTransform';

export interface TaxiSceneAnchors {
  readonly passengerSeat: TransformNode;
  readonly passengerLighting: TransformNode;
  readonly radio: TransformNode;
  readonly navigation: TransformNode;
  readonly translator: TransformNode;
}

export interface TaxiSceneHandle {
  readonly scene: Scene;
  readonly worldRoot: TransformNode;
  readonly taxiMotionRoot: TransformNode;
  readonly cameraMotionRoot: TransformNode;
  readonly interiorRoot: TransformNode;
  readonly camera: FreeCamera;
  readonly anchors: TaxiSceneAnchors;
  readonly ambientLight: HemisphericLight;
  readonly cabinLight: PointLight;
}

function vector3(tuple: readonly [number, number, number]): Vector3 {
  return new Vector3(tuple[0], tuple[1], tuple[2]);
}

function color3(tuple: readonly [number, number, number]): Color3 {
  return new Color3(tuple[0], tuple[1], tuple[2]);
}

function createAnchor(
  name: string,
  parent: TransformNode,
  transform: TaxiSceneDefinition['anchors']['radio'],
  scene: Scene,
): TransformNode {
  const anchor = new TransformNode(name, scene);
  anchor.parent = parent;
  applyLocalTransform(anchor, transform);
  return anchor;
}

function createPrimitive(
  name: string,
  asset: TaxiSceneDefinition['assets'][number],
  scene: Scene,
): Mesh {
  switch (asset.kind) {
    case 'cylinder':
      return MeshBuilder.CreateCylinder(name, {
        diameter: 1, height: 1, tessellation: asset.tessellation,
      }, scene);
    case 'torus':
      return MeshBuilder.CreateTorus(name, {
        diameter: 1, thickness: asset.tubeRatio, tessellation: asset.tessellation,
      }, scene);
    case 'plane':
      return MeshBuilder.CreatePlane(name, { size: 1 }, scene);
    case 'box':
      return MeshBuilder.CreateBox(name, { size: 1 }, scene);
  }
}

export function createTaxiScene(
  engine: AbstractEngine,
  input: TaxiSceneDefinition,
): TaxiSceneHandle {
  const definition = TaxiSceneDefinitionSchema.parse(input);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(...definition.environment.clearColor);

  const worldRoot = new TransformNode('taxi-world-root', scene);
  const taxiMotionRoot = new TransformNode('taxi-motion-root', scene);
  const cameraMotionRoot = new TransformNode(
    'taxi-camera-motion-root',
    scene,
  );
  cameraMotionRoot.parent = taxiMotionRoot;

  const interiorRoot = new TransformNode('taxi-interior-root', scene);
  interiorRoot.parent = taxiMotionRoot;

  const camera = new FreeCamera('taxi-driver-camera', Vector3.Zero(), scene);
  camera.parent = cameraMotionRoot;
  applyLocalTransform(camera, definition.camera.transform);
  camera.fov = definition.camera.fovRadians;
  camera.minZ = definition.camera.minZ;
  camera.maxZ = definition.camera.maxZ;
  scene.activeCamera = camera;

  const anchors: TaxiSceneAnchors = {
    passengerSeat: createAnchor(
      'taxi-anchor-passenger-seat',
      interiorRoot,
      definition.anchors.passengerSeat,
      scene,
    ),
    passengerLighting: createAnchor(
      'taxi-anchor-passenger-lighting',
      interiorRoot,
      definition.anchors.passengerLighting,
      scene,
    ),
    radio: createAnchor(
      'taxi-anchor-radio',
      interiorRoot,
      definition.anchors.radio,
      scene,
    ),
    navigation: createAnchor(
      'taxi-anchor-navigation',
      interiorRoot,
      definition.anchors.navigation,
      scene,
    ),
    translator: createAnchor(
      'taxi-anchor-translator',
      interiorRoot,
      definition.anchors.translator,
      scene,
    ),
  };

  // Materials and textures belong to this scene; identical authored finishes share one instance.
  const materials = new Map<string, StandardMaterial>();
  const prototypes = new Map<string, Mesh>();
  for (const asset of definition.assets) {
    const name = `taxi-asset-${asset.id}`;
    const emissivePanel = asset.kind === 'plane' && asset.material.emissiveColor.some((value) => value > 0);
    const key = JSON.stringify([asset.material, emissivePanel]);
    const geometryKey = JSON.stringify([asset.kind, asset.tessellation, asset.tubeRatio, asset.space, key]);
    const prototype = prototypes.get(geometryKey);
    const source = prototype ?? createPrimitive(name, asset, scene);
    const mesh = prototype === undefined ? source : source.createInstance(name);
    mesh.parent = asset.space === 'taxi-interior' ? interiorRoot : worldRoot;
    applyLocalTransform(mesh, asset.transform);
    mesh.scaling.multiplyInPlace(vector3(asset.size));
    let material = materials.get(key);
    if (material === undefined) {
      material = new StandardMaterial(`taxi-material-${asset.id}`, scene);
      material.diffuseColor = color3(asset.material.diffuseColor);
      material.emissiveColor = color3(asset.material.emissiveColor);
      material.specularColor = Color3.Black();
      if (asset.material.textureUrl !== undefined) {
        const texture = new Texture(asset.material.textureUrl, scene);
        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;
        material.diffuseTexture = texture;
        if (emissivePanel) {
          material.diffuseTexture = null;
          material.emissiveTexture = texture;
          texture.level = Math.max(...asset.material.emissiveColor);
          material.emissiveColor = Color3.Black();
          material.disableLighting = true;
        }
        material.backFaceCulling = false;
      }
      materials.set(key, material);
    }
    if (prototype === undefined) {
      mesh.material = material;
      prototypes.set(geometryKey, source);
    }
  }

  const ambientLight = new HemisphericLight(
    'taxi-world-ambient-light',
    vector3(definition.lighting.ambientDirection),
    scene,
  );
  ambientLight.diffuse = color3(definition.lighting.ambientColor);
  ambientLight.intensity = definition.lighting.ambientIntensity;
  ambientLight.groundColor = color3(definition.lighting.ambientColor).scale(0.35);

  const cabinLight = new PointLight(
    'taxi-passenger-cabin-light',
    Vector3.Zero(),
    scene,
  );
  cabinLight.parent = anchors.passengerLighting;
  cabinLight.diffuse = color3(definition.lighting.cabinColor);
  cabinLight.intensity = definition.lighting.cabinIntensity;
  cabinLight.includedOnlyMeshes = interiorRoot.getChildMeshes();

  for (const [index, beam] of definition.lighting.headlights.entries()) {
    const light = new SpotLight(
      `taxi-headlight-${String(index)}`, vector3(beam.position),
      vector3(beam.direction).normalize(), beam.angleRadians, 2, scene,
    );
    light.parent = taxiMotionRoot;
    light.diffuse = color3(beam.color);
    light.intensity = beam.intensity;
    light.range = beam.range;
    light.excludedMeshes = interiorRoot.getChildMeshes();
  }

  return {
    scene,
    worldRoot,
    taxiMotionRoot,
    cameraMotionRoot,
    interiorRoot,
    camera,
    anchors,
    ambientLight,
    cabinLight,
  };
}
