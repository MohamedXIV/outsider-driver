import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
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

export function createTaxiScene(
  engine: AbstractEngine,
  input: TaxiSceneDefinition,
): TaxiSceneHandle {
  const definition = TaxiSceneDefinitionSchema.parse(input);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(...definition.environment.clearColor);

  const worldRoot = new TransformNode('taxi-world-root', scene);
  const taxiMotionRoot = new TransformNode('taxi-motion-root', scene);
  const interiorRoot = new TransformNode('taxi-interior-root', scene);
  interiorRoot.parent = taxiMotionRoot;

  const camera = new FreeCamera('taxi-driver-camera', Vector3.Zero(), scene);
  camera.parent = taxiMotionRoot;
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

  for (const asset of definition.assets) {
    const mesh = MeshBuilder.CreateBox(
      `taxi-asset-${asset.id}`,
      {
        width: asset.size[0],
        height: asset.size[1],
        depth: asset.size[2],
      },
      scene,
    );

    mesh.parent =
      asset.space === 'taxi-interior' ? interiorRoot : worldRoot;
    applyLocalTransform(mesh, asset.transform);

    const material = new StandardMaterial(
      `taxi-material-${asset.id}`,
      scene,
    );
    material.diffuseColor = color3(asset.material.diffuseColor);
    material.emissiveColor = color3(asset.material.emissiveColor);
    material.specularColor = Color3.Black();
    mesh.material = material;
  }

  const ambientLight = new HemisphericLight(
    'taxi-world-ambient-light',
    vector3(definition.lighting.ambientDirection),
    scene,
  );
  ambientLight.diffuse = color3(definition.lighting.ambientColor);
  ambientLight.intensity = definition.lighting.ambientIntensity;

  const cabinLight = new PointLight(
    'taxi-passenger-cabin-light',
    Vector3.Zero(),
    scene,
  );
  cabinLight.parent = anchors.passengerLighting;
  cabinLight.diffuse = color3(definition.lighting.cabinColor);
  cabinLight.intensity = definition.lighting.cabinIntensity;

  return {
    scene,
    worldRoot,
    taxiMotionRoot,
    interiorRoot,
    camera,
    anchors,
    ambientLight,
    cabinLight,
  };
}
